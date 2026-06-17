import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY || 'sk-25f7a2ba21d646eb8fb51edd26eecb50',
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });
  }

  /**
   * 将文本数组转为向量数组
   * DashScope text-embedding-v3，维度 1024
   */
  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    // DashScope 单次最多 10 条，分批处理
    const results: number[][] = [];
    const batchSize = 10;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const res = await this.client.embeddings.create({
        model: 'text-embedding-v4',
        input: batch,
        dimensions: 1024,
      } as any);
      for (const item of res.data) {
        results.push(item.embedding);
      }
    }

    return results;
  }
}
