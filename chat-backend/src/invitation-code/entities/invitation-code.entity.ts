import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('invitation_codes')
export class InvitationCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 邀请码字符串 */
  @Column({ unique: true, length: 50 })
  code: string;

  /** 类型：once=一次性，multiple=可复用 */
  @Column({ default: 'once', length: 20 })
  type: string;

  /** 最大使用次数（multiple 类型有效，0=无限制） */
  @Column({ default: 0 })
  maxUses: number;

  /** 已使用次数 */
  @Column({ default: 0 })
  usedCount: number;

  /** 是否启用 */
  @Column({ default: true })
  isActive: boolean;

  /** 过期时间（可选） */
  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date;

  /** 创建者 */
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column()
  createdById: string;

  /** 最后使用的用户 ID（一次性邀请码使用后记录） */
  @Column({ nullable: true })
  usedById: string;

  @CreateDateColumn()
  createdAt: Date;
}
