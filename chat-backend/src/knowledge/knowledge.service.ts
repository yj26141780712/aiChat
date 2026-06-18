import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeDocument } from './entities/knowledge-document.entity';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity';
import { Document as WikiDocument } from '../wiki/entities/document.entity';
import { EmbeddingService } from './embedding.service';
import { ChunkingService } from './chunking.service';
import { ImageDescriptionService } from './image-description.service';
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
    @InjectRepository(WikiDocument)
    private wikiDocRepo: Repository<WikiDocument>,
    private embeddingService: EmbeddingService,
    private chunkingService: ChunkingService,
    private imageDescriptionService: ImageDescriptionService,
  ) {}

  /** 获取所有知识库文档 */
  async findAll(): Promise<KnowledgeDocument[]> {
    return this.docRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  /** 获取文档预览信息（用于原始文件预览） */
  async getPreview(id: string): Promise<{ 
    title: string; 
    sourceType: string;
    fileType?: string;
    originalName?: string;
    filePath?: string; // 上传文件的相对路径
  }> {
    const doc = await this.docRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('知识库文档不存在');

    // Wiki 文档：返回 Wiki 原始内容
    if (doc.sourceType === 'wiki' && doc.sourceId) {
      const wikiDoc = await this.wikiDocRepo.findOne({ where: { id: doc.sourceId } });
      if (wikiDoc) {
        return { 
          title: doc.title, 
          sourceType: 'wiki',
          content: wikiDoc.content, // Wiki 仍返回文本
        } as any;
      }
    }

    // 上传文档：返回文件路径和元数据
    return {
      title: doc.title,
      sourceType: doc.sourceType,
      fileType: doc.fileType,
      originalName: doc.originalName,
      // 构建文件访问 URL（假设文件在 uploads/knowledge/ 目录）
      filePath: doc.fileType ? `/uploads/knowledge/${id}.${doc.fileType}` : undefined,
    };
  }

  /** 删除文档（级联删除 chunks + 原始文件） */
  async delete(id: string): Promise<void> {
    const doc = await this.docRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('知识库文档不存在');

    // 删除原始文件副本
    if (doc.fileType && doc.sourceType === 'upload') {
      const filePath = path.join(process.cwd(), 'uploads', 'knowledge', `${id}.${doc.fileType}`);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          this.logger.log(`已删除原始文件: ${filePath}`);
        }
      } catch (err) {
        this.logger.warn(`删除原始文件失败: ${err.message}`);
      }
    }

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
      // 保存原始文件副本到 uploads/knowledge/ 目录（用于预览）
      const uploadDir = path.join(process.cwd(), 'uploads', 'knowledge');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const destPath = path.join(uploadDir, `${doc.id}.${fileType}`);
      fs.copyFileSync(filePath, destPath);
      this.logger.log(`原始文件已保存到: ${destPath}`);

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
  async search(query: string, topK = 5): Promise<SearchResult[]> {
    const chunks = await this.chunkRepo.find({
      relations: { document: true },
    });

    if (chunks.length === 0) {
      this.logger.warn('知识库为空，无 chunks 可检索');
      return [];
    }

    this.logger.log(`RAG 检索：知识库共 ${chunks.length} 个 chunks，开始生成查询向量...`);

    // 生成查询向量（带 10 秒超时）
    let queryVec: number[];
    try {
      const embeddingPromise = this.embeddingService.embed([query]);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Embedding API 超时（10s）')), 10000),
      );
      const queryEmbedding = await Promise.race([embeddingPromise, timeoutPromise]);
      if (!queryEmbedding || queryEmbedding.length === 0) return [];
      queryVec = queryEmbedding[0];
    } catch (err) {
      this.logger.error(`RAG 查询向量生成失败: ${err.message}`);
      throw err;
    }

    this.logger.log(`RAG 向量生成完成，开始计算相似度...`);

    // 计算余弦相似度，排序取 Top-K
    const scored = chunks
      .filter((c) => c.embedding && c.embedding.length > 0)
      .map((chunk) => ({
        chunk,
        score: this.cosineSimilarity(queryVec, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score);

    // 日志 Top-5 分数，方便调试检索质量
    scored.slice(0, 5).forEach((s, i) => {
      this.logger.log(`RAG Top-${i + 1}: score=${s.score.toFixed(4)}, chunk="${s.chunk.content.substring(0, 60)}..."`);
    });

    // 只保留相似度 >= 0.3 的结果，避免无关内容干扰
    const MIN_SCORE = 0.3;
    const results = scored
      .filter((s) => s.score >= MIN_SCORE)
      .slice(0, topK);

    if (results.length === 0) {
      this.logger.warn(`RAG 无结果达到阈值 ${MIN_SCORE}，最高分: ${scored[0]?.score.toFixed(4) || 0}`);
    }

    return results.map(({ chunk, score }) => ({
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
    this.logger.log(`文档 "${doc.title}" 分为 ${chunks.length} 个文本块`);

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

    this.logger.log(`文档 "${doc.title}" 索引完成（共 ${chunks.length} 个文本块）`);
  }

  /**
   * 对带图片的文档进行分块 + 向量化 + 存储
   * @param doc 知识库文档
   * @param text 文本内容
   * @param imagePaths 图片路径列表（相对于 uploads/ 目录）
   */
  private async indexTextWithImages(
    doc: KnowledgeDocument,
    text: string,
    imagePaths: string[],
  ): Promise<void> {
    if (!text && imagePaths.length === 0) {
      this.logger.warn(`文档 "${doc.title}" 内容为空且无图片，跳过索引`);
      return;
    }

    let chunkIndex = 0;

    // 1. 处理文本 chunks
    if (text && text.trim().length > 0) {
      const textChunks = this.chunkingService.split(text);
      this.logger.log(`文档 "${doc.title}" 分为 ${textChunks.length} 个文本块`);

      const embeddings = await this.embeddingService.embed(
        textChunks.map((c) => c.content),
      );

      for (let i = 0; i < textChunks.length; i++) {
        const chunkEntity = this.chunkRepo.create({
          documentId: doc.id,
          content: textChunks[i].content,
          embedding: embeddings[i],
          chunkIndex: chunkIndex++,
        });
        await this.chunkRepo.save(chunkEntity);
      }
    }

    // 2. 处理图片：生成描述并作为独立 chunk
    if (imagePaths.length > 0) {
      this.logger.log(`开始处理 ${imagePaths.length} 张图片...`);
      
      for (const imagePath of imagePaths) {
        try {
          // 调用 qwen-vl-max 生成图片描述
          const description = await this.imageDescriptionService.describeImage(imagePath);
          
          if (description) {
            // 将图片描述作为独立 chunk 存入知识库
            const imageChunk = this.chunkingService.createImageChunk({
              path: imagePath,
              description,
            });

            const embedding = await this.embeddingService.embed([imageChunk.content]);
            
            const chunkEntity = this.chunkRepo.create({
              documentId: doc.id,
              content: imageChunk.content,
              embedding: embedding[0],
              chunkIndex: chunkIndex++,
            });
            await this.chunkRepo.save(chunkEntity);
            
            this.logger.log(`图片 ${imagePath} 描述已索引`);
          } else {
            this.logger.warn(`图片 ${imagePath} 描述生成失败`);
          }
        } catch (err) {
          this.logger.error(`处理图片 ${imagePath} 失败: ${err.message}`);
        }
      }
    }

    this.logger.log(`文档 "${doc.title}" 索引完成（共 ${chunkIndex} 个块，含 ${imagePaths.length} 个图片块）`);
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
