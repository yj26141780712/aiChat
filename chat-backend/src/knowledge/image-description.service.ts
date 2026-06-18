import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

/** 图片描述结果 */
export interface ImageDescription {
  description: string;
}

@Injectable()
export class ImageDescriptionService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY || 'sk-25f7a2ba21d646eb8fb51edd26eecb50',
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });
  }

  /**
   * 将图片转为 base64 data URL
   */
  private imageToDataUrl(imagePath: string): string | null {
    try {
      const relativePath = imagePath.replace(/^\/uploads\//, 'uploads/');
      const fullPath = path.join(process.cwd(), relativePath);
      
      if (!fs.existsSync(fullPath)) {
        console.warn(`图片文件不存在: ${fullPath}`);
        return null;
      }
      
      const buffer = fs.readFileSync(fullPath);
      const ext = path.extname(fullPath).toLowerCase().replace('.', '');
      const mime = ext === 'jpg' ? 'jpeg' : ext;
      return `data:image/${mime};base64,${buffer.toString('base64')}`;
    } catch (err) {
      console.error(`图片转 base64 失败: ${err.message}`);
      return null;
    }
  }

  /**
   * 使用 qwen-vl-max 生成图片描述
   * @param imagePath 图片路径（相对或绝对）
   * @returns 图片描述文本
   */
  async describeImage(imagePath: string): Promise<string | null> {
    try {
      const dataUrl = this.imageToDataUrl(imagePath);
      if (!dataUrl) return null;

      const response = await this.client.chat.completions.create({
        model: 'qwen3-vl-plus',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的图像分析助手。请详细描述图片内容，包括：场景、物体、文字、图表信息等。描述要简洁准确，适合用于知识库检索。',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: '请详细描述这张图片的内容：' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      const description = response.choices?.[0]?.message?.content;
      return description || null;
    } catch (error) {
      console.error(`图片描述失败: ${error.message}`);
      return null;
    }
  }
}
