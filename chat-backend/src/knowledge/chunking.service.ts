import { Injectable } from '@nestjs/common';

/** 分块结果 */
export interface TextChunk {
  content: string;
  index: number;
}

@Injectable()
export class ChunkingService {
  /**
   * 将文本按指定大小分块，带重叠
   * @param text 原始文本
   * @param chunkSize 每块字符数，默认 500
   * @param overlap 重叠字符数，默认 50
   */
  split(text: string, chunkSize = 500, overlap = 50): TextChunk[] {
    if (!text || text.trim().length === 0) return [];

    const chunks: TextChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const content = text.slice(start, end).trim();

      if (content.length > 0) {
        chunks.push({ content, index: index++ });
      }

      // 如果已到末尾就退出
      if (end >= text.length) break;

      // 下一步起点 = 当前终点 - 重叠
      start = end - overlap;
    }

    return chunks;
  }
}
