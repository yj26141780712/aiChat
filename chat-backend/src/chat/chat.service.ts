import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

/** 消息接口定义 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable()
export class ChatService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      // 使用阿里云百炼 DashScope 兼容接口
      apiKey: process.env.DASHSCOPE_API_KEY || 'sk-25f7a2ba21d646eb8fb51edd26eecb50',
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });
  }

  /**
   * 流式调用 AI API，通过回调函数逐块返回内容
   * @param messages 对话历史
   * @param onChunk 每收到一块内容时调用的回调
   * @returns 完整的 AI 回复
   */
  async streamChat(
    messages: ChatMessage[],
    onChunk: (content: string) => void,
  ): Promise<string> {
    const stream = await this.client.chat.completions.create({
      model: 'qwen-max',
      messages,
      stream: true,
    });

    let fullReply = '';
    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        fullReply += content;
        onChunk(content); // 逐块推送给调用方
      }
    }

    return fullReply;
  }
}
