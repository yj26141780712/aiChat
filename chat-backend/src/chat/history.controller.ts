import { Controller, Get, Delete, Patch, Param, Body, UseGuards, Request, HttpCode, NotFoundException } from '@nestjs/common';
import { HistoryService } from './history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  /** 获取当前用户的对话列表：GET /api/history */
  @Get()
  async getConversations(@Request() req: any) {
    return this.historyService.getConversations(req.user.id);
  }

  /** 获取某个对话的消息列表：GET /api/history/:conversationId/messages */
  @Get(':conversationId/messages')
  async getMessages(@Param('conversationId') conversationId: string) {
    return this.historyService.getMessages(conversationId);
  }

  /** 重命名对话：PATCH /api/history/:conversationId */
  @Patch(':conversationId')
  async renameConversation(
    @Param('conversationId') conversationId: string,
    @Body('title') title: string,
    @Request() req: any,
  ) {
    if (!title || !title.trim()) {
      return { error: '标题不能为空' };
    }
    await this.historyService.updateTitle(conversationId, title.trim());
    return { success: true };
  }

  /** 删除单个对话：DELETE /api/history/:conversationId */
  @Delete(':conversationId')
  @HttpCode(200)
  async deleteConversation(
    @Param('conversationId') conversationId: string,
    @Request() req: any,
  ) {
    const deleted = await this.historyService.deleteConversation(conversationId, req.user.id);
    if (!deleted) {
      throw new NotFoundException('对话不存在');
    }
    return { success: true };
  }

  /** 清空所有对话：DELETE /api/history */
  @Delete()
  @HttpCode(200)
  async deleteAllConversations(@Request() req: any) {
    const count = await this.historyService.deleteAllConversations(req.user.id);
    return { success: true, deleted: count };
  }
}
