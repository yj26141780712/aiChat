import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 消息角色：user 或 assistant */
  @Column({ length: 20 })
  role: string;

  /** 消息内容 */
  @Column({ type: 'text' })
  content: string;

  /** 消息附带的图片 URL 列表 */
  @Column({ type: 'simple-json', nullable: true })
  images: string[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  conversation: Conversation;

  @Column()
  conversationId: string;
}
