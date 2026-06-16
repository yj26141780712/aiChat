import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { User } from './entities/user.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /** 获取用户列表 */
  @Get('users')
  async getUsers() {
    const users = await this.userRepo.find({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        permissions: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
      },
      order: { createdAt: 'DESC' },
    });
    return users;
  }

  /** 修改用户角色 */
  @Patch('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body() body: { role: string; permissions?: string[] },
  ) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const updateData: any = { role: body.role };
    if (body.permissions) {
      updateData.permissions = body.permissions;
    }

    await this.userRepo.update(id, updateData);
    return { message: '更新成功' };
  }

  /** 禁用/启用用户 */
  @Delete('users/:id')
  async toggleUserStatus(@Param('id') id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    await this.userRepo.update(id, { isActive: !user.isActive });
    return {
      message: user.isActive ? '已禁用' : '已启用',
      isActive: !user.isActive,
    };
  }
}
