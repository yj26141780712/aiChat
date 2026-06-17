import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/** 修复 multer 中文文件名乱码 */
function fixEncoding(str: string): string {
  return Buffer.from(str, 'latin1').toString('utf-8');
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

@Controller('api/chat')
@UseGuards(JwtAuthGuard)
export class ChatUploadController {
  /** 上传聊天图片 */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/chat',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!ALLOWED_TYPES.includes(file.mimetype)) {
          return cb(new BadRequestException('仅支持 jpg/png/gif/webp 格式图片'), false);
        }
        if (file.size > MAX_SIZE) {
          return cb(new BadRequestException('图片大小不能超过 10MB'), false);
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请选择图片文件');
    }
    return { url: `/uploads/chat/${file.filename}` };
  }
}
