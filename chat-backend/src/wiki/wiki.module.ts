import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { WikiService } from './wiki.service';
import { WikiController } from './wiki.controller';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document]),
    forwardRef(() => KnowledgeModule),
  ],
  providers: [WikiService],
  controllers: [WikiController],
  exports: [WikiService],
})
export class WikiModule {}
