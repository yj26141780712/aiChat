import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InvitationCodeService } from './invitation-code.service';

@Controller('admin/invitation-codes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class InvitationCodeController {
  constructor(private readonly invitationCodeService: InvitationCodeService) {}

  /** 获取所有邀请码 */
  @Get()
  findAll() {
    return this.invitationCodeService.findAll();
  }

  /** 创建邀请码 */
  @Post()
  create(
    @Request() req: any,
    @Body()
    body: {
      type?: string;
      maxUses?: number;
      expiresAt?: string;
      customCode?: string;
      count?: number;
    },
  ) {
    const type = body.type || 'once';
    const maxUses = body.maxUses || 0;
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;

    // 批量创建
    if (body.count && body.count > 1) {
      return this.invitationCodeService.batchCreate(
        req.user.id,
        body.count,
        type,
        maxUses,
        expiresAt,
      );
    }

    return this.invitationCodeService.create(
      req.user.id,
      type,
      maxUses,
      expiresAt,
      body.customCode,
    );
  }

  /** 启用/禁用邀请码 */
  @Patch(':id/toggle')
  toggleStatus(@Param('id') id: string) {
    return this.invitationCodeService.toggleStatus(id);
  }

  /** 删除邀请码 */
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.invitationCodeService.delete(id);
  }
}
