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
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatService, ChatMessage } from './chat.service';
import { HistoryService } from './history.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { User } from '../auth/entities/user.entity';

/** 用户消息的 payload 结构 */
interface UserMessagePayload {
  message: string;
  conversationId?: string;
  useRag?: boolean;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  /** 每个 socket 对应的用户 */
  private socketUsers: Map<string, User> = new Map();

  /** 每个 socket 对应的当前对话 ID */
  private socketConversations: Map<string, string> = new Map();

  constructor(
    private readonly chatService: ChatService,
    private readonly historyService: HistoryService,
    private readonly knowledgeService: KnowledgeService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** 客户端连接时验证 JWT token */
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) {
        console.log('连接缺少 token，断开');
        client.disconnect();
        return;
      }

      // 验证 JWT
      const payload = this.jwtService.verify(token);
      const user = await this.userRepo.findOne({ where: { id: payload.sub } });

      if (!user || !user.isActive) {
        console.log('用户无效或已禁用，断开');
        client.disconnect();
        return;
      }

      this.socketUsers.set(client.id, user);
      console.log(`用户连接: ${user.username} (${user.id})`);
      client.emit('connected', { userId: user.id, username: user.username });
    } catch (error) {
      console.log('JWT 验证失败:', error.message);
      client.disconnect();
    }
  }

  /** 客户端断开时清理 */
  handleDisconnect(client: Socket) {
    const user = this.socketUsers.get(client.id);
    console.log(`用户断开: ${user?.username || 'unknown'}`);
    this.socketUsers.delete(client.id);
    this.socketConversations.delete(client.id);
  }

  /**
   * 创建新对话
   */
  @SubscribeMessage('create_conversation')
  async handleCreateConversation(@ConnectedSocket() client: Socket) {
    const user = this.socketUsers.get(client.id);
    if (!user) {
      client.emit('stream_error', { message: '未授权' });
      return;
    }

    const conversation = await this.historyService.createConversation(
      user.id,
      '新对话',
    );
    this.socketConversations.set(client.id, conversation.id);
    client.emit('conversation_created', { conversationId: conversation.id });
  }

  /**
   * 设置当前对话（切换对话时调用）
   */
  @SubscribeMessage('set_conversation')
  async handleSetConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    this.socketConversations.set(client.id, payload.conversationId);
  }

  /**
   * 处理用户发送的消息
   */
  @SubscribeMessage('user_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UserMessagePayload,
  ) {
    const { message, useRag } = payload;
    const user = this.socketUsers.get(client.id);
    // 优先使用消息中携带的 conversationId，实现多对话并行
    let conversationId = payload.conversationId || this.socketConversations.get(client.id);

    if (!user) {
      client.emit('stream_error', { message: '未授权' });
      return;
    }

    try {
      // 如果没有对话 ID，自动创建
      if (!conversationId) {
        const conversation = await this.historyService.createConversation(
          user.id,
          '新对话',
        );
        conversationId = conversation.id;
        this.socketConversations.set(client.id, conversationId);
        client.emit('conversation_created', { conversationId });
      }

      // 1. 保存用户消息到数据库
      await this.historyService.saveMessage(conversationId, 'user', message);

      // 更新对话标题（用第一条消息的前 20 字）
      const existingMessages =
        await this.historyService.getMessages(conversationId);
      if (existingMessages.length === 1) {
        const title =
          message.substring(0, 20) + (message.length > 20 ? '...' : '');
        await this.historyService.updateTitle(conversationId, title);
        client.emit('title_updated', { title, conversationId });
      }

      // 2. 从数据库加载历史消息，构建 AI 上下文
      const history = await this.historyService.getMessages(conversationId);
      const systemPrompt = process.env.AI_SYSTEM_PROMPT;
      const aiMessages: ChatMessage[] = [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        ...history.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      // 2.5 RAG 检索增强：如果启用了知识库问答
      if (useRag) {
        try {
          const searchResults = await this.knowledgeService.search(message, 3);
          if (searchResults.length > 0) {
            const ragContext = searchResults
              .map((r) => `[${r.title}]\n${r.content}`)
              .join('\n\n');
            const ragPrompt = `你是一个知识库问答助手。请基于以下参考资料回答用户问题。\n如果参考资料中没有相关信息，请如实告知。\n\n--- 参考资料 ---\n${ragContext}\n--- 参考资料结束 ---`;
            // 将 RAG 上下文插入到 system prompt 之后、历史消息之前
            aiMessages.splice(
              systemPrompt ? 1 : 0,
              0,
              { role: 'system' as const, content: ragPrompt },
            );
          }
        } catch (err) {
          this.server
            .to(client.id)
            .emit('stream_chunk', {
              content: '\n\n[知识库检索失败，将基于自身知识回答]\n',
              conversationId,
            });
        }
      }

      // 3. 流式调用 AI，逐块推送
      const fullReply = await this.chatService.streamChat(
        aiMessages,
        (content: string) => {
          client.emit('stream_chunk', { content, conversationId });
        },
        (thinking: string) => {
          client.emit('stream_thinking', { content: thinking, conversationId });
        },
      );

      // 4. 保存 AI 回复到数据库
      await this.historyService.saveMessage(
        conversationId,
        'assistant',
        fullReply,
      );

      // 5. 通知前端流式结束，附带 conversationId 便于前端区分
      client.emit('stream_done', { fullReply, conversationId });
    } catch (error) {
      console.error('AI 调用失败:', error.message);
      client.emit('stream_error', {
        message: 'AI 服务暂时不可用，请稍后重试',
        conversationId,
      });
    }
  }
}
