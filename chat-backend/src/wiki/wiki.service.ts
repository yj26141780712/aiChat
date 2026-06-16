import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/create-document.dto';
import { KnowledgeService } from '../knowledge/knowledge.service';

@Injectable()
export class WikiService {
  constructor(
    @InjectRepository(Document)
    private documentRepo: Repository<Document>,
    @Inject(forwardRef(() => KnowledgeService))
    private knowledgeService: KnowledgeService,
  ) {}

  /** 获取文档列表（按更新时间倒序） */
  async findAll(): Promise<Document[]> {
    return this.documentRepo.find({
      order: { updatedAt: 'DESC' },
      relations: { author: true },
      select: {
        id: true,
        title: true,
        content: true,
        authorId: true,
        createdAt: true,
        updatedAt: true,
        author: { id: true, username: true },
      },
    });
  }

  /** 获取单个文档详情 */
  async findOne(id: string): Promise<Document> {
    const doc = await this.documentRepo.findOne({
      where: { id },
      relations: { author: true },
    });
    if (!doc) {
      throw new NotFoundException('文档不存在');
    }
    return doc;
  }

  /** 新建文档 */
  async create(dto: CreateDocumentDto, authorId: string): Promise<Document> {
    const doc = this.documentRepo.create({
      title: dto.title,
      content: dto.content || '',
      authorId,
    });
    const saved = await this.documentRepo.save(doc);
    // 异步索引到知识库
    this.knowledgeService.indexWikiDocument(saved.id, saved.title, saved.content).catch(err => {
      console.error('Wiki 自动索引失败:', err.message);
    });
    return saved;
  }

  /** 更新文档 */
  async update(id: string, dto: UpdateDocumentDto): Promise<Document> {
    const doc = await this.findOne(id);
    if (dto.title !== undefined) doc.title = dto.title;
    if (dto.content !== undefined) doc.content = dto.content;
    const saved = await this.documentRepo.save(doc);
    // 异步重新索引
    this.knowledgeService.indexWikiDocument(saved.id, saved.title, saved.content).catch(err => {
      console.error('Wiki 自动索引失败:', err.message);
    });
    return saved;
  }

  /** 删除文档 */
  async delete(id: string): Promise<void> {
    const result = await this.documentRepo.delete(id);
    if ((result.affected ?? 0) === 0) {
      throw new NotFoundException('文档不存在');
    }
  }
}
