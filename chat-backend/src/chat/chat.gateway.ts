import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService, ChatMessage } from './chat.service';
import { HistoryService } from './history.service';

/** 用户消息的 payload 结构 */
interface UserMessagePayload {
  message: string;
  conversationId?: string; // 可选：指定对话 ID（续聊）
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  /** 每个 socket 对应的当前对话 ID */
  private socketConversations: Map<string, string> = new Map();

  constructor(
    private readonly chatService: ChatService,
    private readonly historyService: HistoryService,
  ) {}

  /** 客户端连接时创建/恢复对话 */
  async handleConnection(client: Socket) {
    console.log(`用户连接: ${client.id}`);
    // 为每个连接创建一个新对话
    const conversation = await this.historyService.createConversation(
      client.id,
      '新对话',
    );
    this.socketConversations.set(client.id, conversation.id);
    client.emit('conversation_created', { conversationId: conversation.id });
  }

  /** 客户端断开时清理 */
  handleDisconnect(client: Socket) {
    console.log(`用户断开: ${client.id}`);
    this.socketConversations.delete(client.id);
  }

  /**
   * 处理用户发送的消息
   * 1. 保存用户消息到 DB
   * 2. 从 DB 加载历史消息构建 context
   * 3. 调用 AI API（流式）
   * 4. 逐块推送给前端
   * 5. 保存 AI 回复到 DB
   */
  @SubscribeMessage('user_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UserMessagePayload,
  ) {
    const { message } = payload;
    const conversationId = this.socketConversations.get(client.id);

    if (!conversationId) {
      client.emit('stream_error', { message: '会话未初始化' });
      return;
    }

    try {
      // 1. 保存用户消息到数据库
      await this.historyService.saveMessage(conversationId, 'user', message);

      // 更新对话标题（用第一条消息的前 20 字）
      const existingMessages =
        await this.historyService.getMessages(conversationId);
      if (existingMessages.length === 1) {
        const title = message.substring(0, 20) + (message.length > 20 ? '...' : '');
        await this.historyService.updateTitle(conversationId, title);
        client.emit('title_updated', { title });
      }

      // 2. 从数据库加载历史消息，构建 AI 上下文
      const history = await this.historyService.getMessages(conversationId);
      const aiMessages: ChatMessage[] = history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // 3. 流式调用 AI，逐块推送
      const fullReply = await this.chatService.streamChat(
        aiMessages,
        (content: string) => {
          client.emit('stream_chunk', { content });
        },
      );

      // 4. 保存 AI 回复到数据库
      await this.historyService.saveMessage(
        conversationId,
        'assistant',
        fullReply,
      );

      // 5. 通知前端流式结束
      client.emit('stream_done', { fullReply });
    } catch (error) {
      console.error('AI 调用失败:', error.message);
      client.emit('stream_error', {
        message: 'AI 服务暂时不可用，请稍后重试',
      });
    }
  }
}
