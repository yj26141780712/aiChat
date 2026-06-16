import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 文档标题 */
  @Column({ length: 200 })
  title: string;

  /** Markdown 内容 */
  @Column({ type: 'text' })
  content: string;

  /** 作者 */
  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  author: User;

  @Column({ nullable: true })
  authorId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
