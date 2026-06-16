import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Message } from './message.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 关联用户 */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  /** 用户ID（外键） */
  @Column()
  userId: string;

  /** 对话标题（取第一条用户消息的前 20 字） */
  @Column({ length: 100, default: '新对话' })
  title: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Message, (message) => message.conversation, {
    cascade: true,
  })
  messages: Message[];
}
