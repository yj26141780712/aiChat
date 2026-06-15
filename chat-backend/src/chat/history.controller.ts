import { Controller, Get, Param, Query } from '@nestjs/common';
import { HistoryService } from './history.service';

@Controller('api/history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  /** 获取用户对话列表：GET /api/history?userId=xxx */
  @Get()
  async getConversations(@Query('userId') userId: string) {
    if (!userId) {
      return { error: '缺少 userId 参数' };
    }
    return this.historyService.getConversations(userId);
  }

  /** 获取某个对话的消息列表：GET /api/history/:conversationId/messages */
  @Get(':conversationId/messages')
  async getMessages(@Param('conversationId') conversationId: string) {
    return this.historyService.getMessages(conversationId);
  }
}
