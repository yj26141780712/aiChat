import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { WikiService } from './wiki.service';
import { WikiController } from './wiki.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Document])],
  providers: [WikiService],
  controllers: [WikiController],
})
export class WikiModule {}
