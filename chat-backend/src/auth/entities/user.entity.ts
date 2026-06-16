import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string; // bcrypt 哈希

  @Column({ length: 50 })
  username: string;

  /** 角色：admin 或 user */
  @Column({ default: 'user' })
  role: string;

  /** 权限列表：chat, manage_users, manage_knowledge, system_settings */
  @Column('simple-array')
  permissions: string[] = ['chat'];

  /** 邮箱是否已验证 */
  @Column({ default: false })
  emailVerified: boolean;

  /** 邮箱验证 token（用于验证链接） */
  @Column({ nullable: true })
  emailVerifyToken: string;

  /** 验证 token 过期时间 */
  @Column({ type: 'datetime', nullable: true })
  emailVerifyExpires: Date;

  /** 重置密码 token */
  @Column({ nullable: true })
  resetPasswordToken: string;

  /** 重置密码 token 过期时间 */
  @Column({ type: 'datetime', nullable: true })
  resetPasswordExpires: Date;

  /** refresh token（用于刷新 access token） */
  @Column({ nullable: true })
  refreshToken: string;

  /** 账户是否启用 */
  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
