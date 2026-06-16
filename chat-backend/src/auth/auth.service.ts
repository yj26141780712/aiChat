import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../common/mail.service';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
    private config: ConfigService,
    private mailService: MailService,
  ) {}

  /** 注册 */
  async register(dto: RegisterDto) {
    // 检查邮箱是否已注册
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('该邮箱已注册');
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 生成邮箱验证 token
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 小时

    // 创建用户
    const user = this.userRepo.create({
      email: dto.email,
      password: hashedPassword,
      username: dto.username,
      emailVerifyToken,
      emailVerifyExpires,
    });

    await this.userRepo.save(user);

    // 发送验证邮件（异步，不阻塞注册响应）
    this.mailService.sendVerifyEmail(user.email, emailVerifyToken).catch((err) => {
      console.error('发送验证邮件失败:', err.message);
    });

    return { message: '注册成功，请查收验证邮件' };
  }

  /** 登录 */
  async login(dto: LoginDto) {
    // 查找用户
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('账户已被禁用');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 生成 tokens
    const tokens = await this.generateTokens(user);

    // 保存 refresh token
    await this.userRepo.update(user.id, {
      refreshToken: await bcrypt.hash(tokens.refreshToken, 10),
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        emailVerified: user.emailVerified,
      },
    };
  }

  /** 刷新 token */
  async refreshToken(userId: string, refreshToken: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('无效的 refresh token');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('无效的 refresh token');
    }

    const tokens = await this.generateTokens(user);
    await this.userRepo.update(user.id, {
      refreshToken: await bcrypt.hash(tokens.refreshToken, 10),
    });

    return tokens;
  }

  /** 验证邮箱 */
  async verifyEmail(token: string) {
    const user = await this.userRepo.findOne({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      throw new BadRequestException('无效的验证链接');
    }

    if (user.emailVerifyExpires && user.emailVerifyExpires < new Date()) {
      throw new BadRequestException('验证链接已过期');
    }

    await this.userRepo.update(user.id, {
      emailVerified: true,
      emailVerifyToken: undefined,
      emailVerifyExpires: undefined,
    } as any);

    return { message: '邮箱验证成功' };
  }

  /** 发送重置密码邮件 */
  async forgotPassword(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      // 不暴露用户是否存在
      return { message: '如果邮箱已注册，重置链接已发送' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 小时

    await this.userRepo.update(user.id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires,
    });

    await this.mailService.sendResetPassword(email, resetToken);

    return { message: '如果邮箱已注册，重置链接已发送' };
  }

  /** 重置密码 */
  async resetPassword(token: string, newPassword: string) {
    const user = await this.userRepo.findOne({
      where: { resetPasswordToken: token },
    });

    if (!user) {
      throw new BadRequestException('无效的重置链接');
    }

    if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('重置链接已过期');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(user.id, {
      password: hashedPassword,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
    } as any);

    return { message: '密码重置成功' };
  }

  /** 获取用户信息 */
  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        permissions: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return user;
  }

  /** 生成 access token 和 refresh token */
  private async generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
