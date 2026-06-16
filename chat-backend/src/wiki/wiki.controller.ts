import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WikiService } from './wiki.service';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/create-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/wiki')
@UseGuards(JwtAuthGuard)
export class WikiController {
  constructor(private readonly wikiService: WikiService) {}

  /** 获取文档列表：GET /api/wiki */
  @Get()
  async findAll() {
    return this.wikiService.findAll();
  }

  /** 获取文档详情：GET /api/wiki/:id */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.wikiService.findOne(id);
  }

  /** 新建文档：POST /api/wiki */
  @Post()
  async create(@Body() dto: CreateDocumentDto, @Request() req: any) {
    return this.wikiService.create(dto, req.user.id);
  }

  /** 更新文档：PATCH /api/wiki/:id */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.wikiService.update(id, dto);
  }

  /** 删除文档：DELETE /api/wiki/:id */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.wikiService.delete(id);
    return { success: true };
  }
}
