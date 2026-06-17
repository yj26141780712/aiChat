import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
  ) {}

  /** 获取用户的所有对话列表（按更新时间倒序） */
  async getConversations(userId: string): Promise<Conversation[]> {
    return this.conversationRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
  }

  /** 获取某个对话的所有消息（按时间正序） */
  async getMessages(conversationId: string): Promise<Message[]> {
    return this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  /** 创建新对话 */
  async createConversation(userId: string, title: string): Promise<Conversation> {
    const conversation = this.conversationRepo.create({ userId, title });
    return this.conversationRepo.save(conversation);
  }

  /** 保存一条消息 */
  async saveMessage(
    conversationId: string,
    role: string,
    content: string,
    images?: string[] | null,
  ): Promise<Message> {
    const message = this.messageRepo.create({
      conversationId,
      role,
      content,
      images: images || null,
    });
    const saved = await this.messageRepo.save(message);

    // 更新对话的 updatedAt 时间
    await this.conversationRepo.update(conversationId, {
      updatedAt: new Date(),
    });

    return saved;
  }

  /** 更新对话标题 */
  async updateTitle(conversationId: string, title: string): Promise<void> {
    await this.conversationRepo.update(conversationId, { title });
  }

  /** 删除单个对话（级联删除消息） */
  async deleteConversation(conversationId: string, userId: string): Promise<boolean> {
    const result = await this.conversationRepo.delete({ id: conversationId, userId });
    return (result.affected ?? 0) > 0;
  }

  /** 清空用户所有对话（级联删除消息） */
  async deleteAllConversations(userId: string): Promise<number> {
    const result = await this.conversationRepo.delete({ userId });
    return result.affected ?? 0;
  }
}
