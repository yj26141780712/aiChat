import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeDocument } from './entities/knowledge-document.entity';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity';
import { Document } from '../wiki/entities/document.entity';
import { EmbeddingService } from './embedding.service';
import { ChunkingService } from './chunking.service';
import { ImageDescriptionService } from './image-description.service';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([KnowledgeDocument, KnowledgeChunk, Document]),
  ],
  providers: [EmbeddingService, ChunkingService, ImageDescriptionService, KnowledgeService],
  controllers: [KnowledgeController],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
