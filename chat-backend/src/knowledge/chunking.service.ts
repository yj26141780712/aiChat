import { Injectable } from '@nestjs/common';

/** 分块结果 */
export interface TextChunk {
  content: string;
  index: number;
}

@Injectable()
export class ChunkingService {
  /**
   * 将文本按语义边界分块，带重叠
   * 优先在段落/句号/换行处分割，避免截断语义
   * @param text 原始文本
   * @param chunkSize 每块字符数，默认 800
   * @param overlap 重叠字符数，默认 100
   */
  split(text: string, chunkSize = 800, overlap = 100): TextChunk[] {
    if (!text || text.trim().length === 0) return [];

    const chunks: TextChunk[] = [];
    let start = 0;
    let index = 0;

    // 分割边界符，优先级从高到低
    const boundaries = ['\n\n', '\n', '。', '.', '；', ';', '！', '？', '，', ' '];

    while (start < text.length) {
      let end = Math.min(start + chunkSize, text.length);

      // 如果还没到末尾，尝试在语义边界处截断
      if (end < text.length) {
        const windowStart = Math.max(start + chunkSize * 0.6, start);
        const windowText = text.slice(windowStart, end + 20);
        let bestBoundary = -1;

        for (const b of boundaries) {
          const idx = windowText.lastIndexOf(b);
          if (idx >= 0) {
            bestBoundary = windowStart + idx + b.length;
            break; // 用最高优先级的边界
          }
        }

        if (bestBoundary > start) {
          end = bestBoundary;
        }
      }

      const content = text.slice(start, end).trim();
      if (content.length > 0) {
        chunks.push({ content, index: index++ });
      }

      if (end >= text.length) break;

      // 下一步起点 = 当前终点 - 重叠
      start = end - overlap;
      if (start < 0) start = 0;
    }

    return chunks;
  }
}
