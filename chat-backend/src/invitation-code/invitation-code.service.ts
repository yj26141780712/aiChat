import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvitationCode } from './entities/invitation-code.entity';
import * as crypto from 'crypto';

@Injectable()
export class InvitationCodeService {
  constructor(
    @InjectRepository(InvitationCode)
    private codeRepo: Repository<InvitationCode>,
  ) {}

  /** 生成随机邀请码 */
  generateCode(): string {
    return crypto.randomBytes(6).toString('hex').toUpperCase();
  }

  /** 创建邀请码 */
  async create(
    adminId: string,
    type: string = 'once',
    maxUses: number = 0,
    expiresAt?: Date,
    customCode?: string,
  ) {
    const code = customCode || this.generateCode();

    // 检查重复
    const existing = await this.codeRepo.findOne({ where: { code } });
    if (existing) {
      throw new BadRequestException('邀请码已存在');
    }

    const invitationCode = this.codeRepo.create({
      code,
      type,
      maxUses: type === 'multiple' ? maxUses : 1,
      expiresAt: expiresAt || undefined,
      createdById: adminId,
    });

    return this.codeRepo.save(invitationCode);
  }

  /** 批量创建邀请码 */
  async batchCreate(
    adminId: string,
    count: number,
    type: string = 'once',
    maxUses: number = 0,
    expiresAt?: Date,
  ) {
    const codes: InvitationCode[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(
        this.codeRepo.create({
          code: this.generateCode(),
          type,
          maxUses: type === 'multiple' ? maxUses : 1,
          expiresAt: expiresAt || undefined,
          createdById: adminId,
        }),
      );
    }
    return this.codeRepo.save(codes);
  }

  /** 获取所有邀请码列表 */
  async findAll() {
    return this.codeRepo.find({
      order: { createdAt: 'DESC' },
      relations: { createdBy: true },
    });
  }

  /** 删除邀请码 */
  async delete(id: string) {
    const code = await this.codeRepo.findOne({ where: { id } });
    if (!code) {
      throw new NotFoundException('邀请码不存在');
    }
    await this.codeRepo.remove(code);
    return { message: '已删除' };
  }

  /** 启用/禁用邀请码 */
  async toggleStatus(id: string) {
    const code = await this.codeRepo.findOne({ where: { id } });
    if (!code) {
      throw new NotFoundException('邀请码不存在');
    }
    code.isActive = !code.isActive;
    return this.codeRepo.save(code);
  }

  /** 验证并使用邀请码（注册时调用） */
  async validateAndUse(code: string, userId: string) {
    const invitationCode = await this.codeRepo.findOne({ where: { code } });

    if (!invitationCode) {
      throw new BadRequestException('无效的邀请码');
    }

    if (!invitationCode.isActive) {
      throw new BadRequestException('邀请码已被禁用');
    }

    if (invitationCode.expiresAt && new Date() > invitationCode.expiresAt) {
      throw new BadRequestException('邀请码已过期');
    }

    if (invitationCode.type === 'once') {
      if (invitationCode.usedCount >= 1) {
        throw new BadRequestException('该邀请码已被使用');
      }
    } else if (invitationCode.type === 'multiple' && invitationCode.maxUses > 0) {
      if (invitationCode.usedCount >= invitationCode.maxUses) {
        throw new BadRequestException('该邀请码已达到使用上限');
      }
    }

    // 更新使用记录
    invitationCode.usedCount += 1;
    invitationCode.usedById = userId;
    await this.codeRepo.save(invitationCode);
  }
}
