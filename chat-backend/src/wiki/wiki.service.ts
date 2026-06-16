import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/create-document.dto';

@Injectable()
export class WikiService {
  constructor(
    @InjectRepository(Document)
    private documentRepo: Repository<Document>,
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
    return this.documentRepo.save(doc);
  }

  /** 更新文档 */
  async update(id: string, dto: UpdateDocumentDto): Promise<Document> {
    const doc = await this.findOne(id);
    if (dto.title !== undefined) doc.title = dto.title;
    if (dto.content !== undefined) doc.content = dto.content;
    return this.documentRepo.save(doc);
  }

  /** 删除文档 */
  async delete(id: string): Promise<void> {
    const result = await this.documentRepo.delete(id);
    if ((result.affected ?? 0) === 0) {
      throw new NotFoundException('文档不存在');
    }
  }
}
