import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { KnowledgeDocument } from './knowledge-document.entity';

@Entity('knowledge_chunks')
export class KnowledgeChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => KnowledgeDocument, (doc) => doc.chunks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'documentId' })
  document: KnowledgeDocument;

  @Column()
  documentId: string;

  /** 分块文本内容 */
  @Column({ type: 'text' })
  content: string;

  /** 向量嵌入，JSON 数组存储 */
  @Column({ type: 'json', nullable: true })
  embedding: number[];

  /** 块序号 */
  @Column({ default: 0 })
  chunkIndex: number;

  @CreateDateColumn()
  createdAt: Date;
}
