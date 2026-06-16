import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { KnowledgeService } from './knowledge.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../wiki/entities/document.entity';

@Controller('api/knowledge')
@UseGuards(JwtAuthGuard)
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    @InjectRepository(Document)
    private wikiDocRepo: Repository<Document>,
  ) {}

  /** 获取知识库文档列表 */
  @Get()
  async findAll() {
    return this.knowledgeService.findAll();
  }

  /** 上传文件到知识库 */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowed = ['.txt', '.md', '.pdf'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error('仅支持 .txt .md .pdf 格式'), false);
        }
      },
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
    @Req() req: any,
  ) {
    const fileType = extname(file.originalname).toLowerCase().slice(1);
    // multer 默认 latin1 编码读取文件名，需转 utf-8 修复中文乱码
    const decodedName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    return this.knowledgeService.processUploadedFile(
      file.path,
      decodedName,
      fileType,
      req.user?.id || '',
      title,
    );
  }

  /** 删除知识库文档 */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.knowledgeService.delete(id);
    return { success: true };
  }

  /** 触发 Wiki 文档索引 */
  @Post('index-wiki')
  async indexWiki(@Body('documentId') documentId?: string) {
    if (documentId) {
      // 索引单个 Wiki 文档
      const doc = await this.wikiDocRepo.findOne({ where: { id: documentId } });
      if (!doc) return { error: 'Wiki 文档不存在' };
      const result = await this.knowledgeService.indexWikiDocument(
        doc.id,
        doc.title,
        doc.content,
      );
      return result;
    }

    // 索引所有 Wiki 文档
    const docs = await this.wikiDocRepo.find();
    await this.knowledgeService.indexAllWiki(
      docs.map((d) => ({ id: d.id, title: d.title, content: d.content })),
    );
    return { success: true, count: docs.length };
  }

  /** 搜索知识库（测试用） */
  @Get('search')
  async search(@Query('q') query: string, @Query('topK') topK?: string) {
    return this.knowledgeService.search(query, parseInt(topK || '3', 10));
  }
}
