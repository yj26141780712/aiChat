import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeDocument } from './entities/knowledge-document.entity';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity';
import { EmbeddingService } from './embedding.service';
import { ChunkingService } from './chunking.service';
import * as fs from 'fs';
import * as path from 'path';

/** 检索结果 */
export interface SearchResult {
  content: string;
  title: string;
  score: number;
  documentId: string;
}

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    @InjectRepository(KnowledgeDocument)
    private docRepo: Repository<KnowledgeDocument>,
    @InjectRepository(KnowledgeChunk)
    private chunkRepo: Repository<KnowledgeChunk>,
    private embeddingService: EmbeddingService,
    private chunkingService: ChunkingService,
  ) {}

  /** 获取所有知识库文档 */
  async findAll(): Promise<KnowledgeDocument[]> {
    return this.docRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  /** 删除文档（级联删除 chunks） */
  async delete(id: string): Promise<void> {
    const doc = await this.docRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('知识库文档不存在');
    await this.docRepo.remove(doc);
  }

  /**
   * 处理上传的文件：提取文本 -> 分块 -> 向量化 -> 存储
   */
  async processUploadedFile(
    filePath: string,
    originalName: string,
    fileType: string,
    uploaderId: string,
    title?: string,
  ): Promise<KnowledgeDocument> {
    const doc = this.docRepo.create({
      title: title || originalName,
      sourceType: 'upload',
      fileType,
      originalName,
      status: 'processing',
      uploaderId,
    });
    await this.docRepo.save(doc);

    try {
      const text = await this.extractText(filePath, fileType);
      await this.indexText(doc, text);
      doc.status = 'ready';
      await this.docRepo.save(doc);
    } catch (error) {
      this.logger.error(`文件处理失败: ${error.message}`, error.stack);
      doc.status = 'error';
      doc.errorMessage = error.message;
      await this.docRepo.save(doc);
    } finally {
      // 清理临时文件
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }

    return doc;
  }

  /**
   * 索引 Wiki 文档（从 Wiki 模块调用）
   */
  async indexWikiDocument(
    wikiDocId: string,
    title: string,
    content: string,
  ): Promise<KnowledgeDocument> {
    // 先查找是否已有对应的知识库文档
    let doc = await this.docRepo.findOne({
      where: { sourceType: 'wiki', sourceId: wikiDocId },
    });

    if (doc) {
      // 已存在：删除旧 chunks，重新索引
      await this.chunkRepo.delete({ documentId: doc.id });
      doc.title = title;
      doc.status = 'processing';
      await this.docRepo.save(doc);
    } else {
      doc = this.docRepo.create({
        title,
        sourceType: 'wiki',
        sourceId: wikiDocId,
        status: 'processing',
      });
      await this.docRepo.save(doc);
    }

    try {
      await this.indexText(doc, content);
      doc.status = 'ready';
      await this.docRepo.save(doc);
    } catch (error) {
      this.logger.error(`Wiki 索引失败: ${error.message}`, error.stack);
      doc.status = 'error';
      doc.errorMessage = error.message;
      await this.docRepo.save(doc);
    }

    return doc;
  }

  /**
   * 批量索引所有 Wiki 文档
   */
  async indexAllWiki(
    wikiDocs: Array<{ id: string; title: string; content: string }>,
  ): Promise<void> {
    for (const wikiDoc of wikiDocs) {
      await this.indexWikiDocument(wikiDoc.id, wikiDoc.title, wikiDoc.content);
    }
    this.logger.log(`已索引 ${wikiDocs.length} 篇 Wiki 文档`);
  }

  /**
   * 语义检索：输入查询，返回 Top-K 相关文档片段
   */
  async search(query: string, topK = 3): Promise<SearchResult[]> {
    const chunks = await this.chunkRepo.find({
      relations: { document: true },
    });

    if (chunks.length === 0) return [];

    // 生成查询向量
    const queryEmbedding = await this.embeddingService.embed([query]);
    if (!queryEmbedding || queryEmbedding.length === 0) return [];

    const queryVec = queryEmbedding[0];

    // 计算余弦相似度，排序取 Top-K
    const scored = chunks
      .filter((c) => c.embedding && c.embedding.length > 0)
      .map((chunk) => ({
        chunk,
        score: this.cosineSimilarity(queryVec, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored.map(({ chunk, score }) => ({
      content: chunk.content,
      title: chunk.document?.title || '未知文档',
      score,
      documentId: chunk.documentId,
    }));
  }

  // ===== 内部方法 =====

  /** 提取文件文本 */
  private async extractText(
    filePath: string,
    fileType: string,
  ): Promise<string> {
    switch (fileType) {
      case 'txt':
      case 'md':
        return fs.readFileSync(filePath, 'utf-8');
      case 'pdf': {
        const { PDFParse } = require('pdf-parse');
        const parser = new PDFParse({ url: filePath });
        const result = await parser.getText();
        this.logger.debug(`pdf-parse getText 返回类型: ${typeof result}, 结构: ${JSON.stringify(result).substring(0, 200)}`);
        // 兼容多种返回格式
        if (typeof result === 'string') return result;
        if (result && typeof result === 'object') {
          if (typeof result.text === 'string') return result.text;
          if (Array.isArray(result.items)) {
            return result.items
              .map((item: any) => typeof item === 'string' ? item : item.str || item.text || '')
              .join(' ');
          }
          if (Array.isArray(result.pages)) {
            return result.pages
              .map((page: any) => typeof page === 'string' ? page : page.text || '')
              .join('\n');
          }
        }
        return String(result);
      }
      default:
        throw new Error(`不支持的文件类型: ${fileType}`);
    }
  }

  /** 对文本进行分块 + 向量化 + 存储 */
  private async indexText(
    doc: KnowledgeDocument,
    text: string,
  ): Promise<void> {
    if (!text || text.trim().length === 0) {
      this.logger.warn(`文档 "${doc.title}" 内容为空，跳过索引`);
      return;
    }

    const chunks = this.chunkingService.split(text);
    this.logger.log(`文档 "${doc.title}" 分为 ${chunks.length} 块`);

    // 批量生成向量
    const embeddings = await this.embeddingService.embed(
      chunks.map((c) => c.content),
    );

    // 逐块存储
    for (let i = 0; i < chunks.length; i++) {
      const chunkEntity = this.chunkRepo.create({
        documentId: doc.id,
        content: chunks[i].content,
        embedding: embeddings[i],
        chunkIndex: chunks[i].index,
      });
      await this.chunkRepo.save(chunkEntity);
    }

    this.logger.log(`文档 "${doc.title}" 索引完成`);
  }

  /** 余弦相似度 */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
}
