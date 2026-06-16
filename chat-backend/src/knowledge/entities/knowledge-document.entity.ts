import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { KnowledgeChunk } from './knowledge-chunk.entity';

@Entity('knowledge_documents')
export class KnowledgeDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 300 })
  title: string;

  /** 来源类型：wiki 或 upload */
  @Column({ length: 20 })
  sourceType: string;

  /** 关联的源 ID（如 Wiki 文档 ID） */
  @Column({ nullable: true })
  sourceId: string;

  /** 文件类型（upload 时有效）：txt, md, pdf */
  @Column({ nullable: true, length: 20 })
  fileType: string;

  /** 原始文件名 */
  @Column({ nullable: true, length: 300 })
  originalName: string;

  /** 处理状态：processing, ready, error */
  @Column({ length: 20, default: 'processing' })
  status: string;

  /** 错误信息 */
  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  /** 上传者 ID */
  @Column({ nullable: true })
  uploaderId: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => KnowledgeChunk, (chunk) => chunk.document, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  chunks: KnowledgeChunk[];
}
