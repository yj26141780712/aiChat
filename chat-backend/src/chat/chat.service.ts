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
   * @param onThinking 每收到一块思考内容时调用的回调
   * @param signal 可选的 AbortSignal，用于取消请求
   * @returns 完整的 AI 回复
   */
  async streamChat(
    messages: ChatMessage[],
    onChunk: (content: string) => void,
    onThinking?: (content: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const stream = await this.client.chat.completions.create(
      {
        model: 'qwen3.7-max',
        messages,
        stream: true,
        temperature: 0.7,
        // 开启千问3深度思考模式（与官网一致）
        ...( { enable_thinking: true } as object),
      },
      signal ? { signal } : {},
    );

    let fullReply = '';
    let hasStartedContent = false;

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta as any;

      // 思考内容
      if (delta?.reasoning_content && onThinking) {
        onThinking(delta.reasoning_content);
      }

      // 实际回复内容
      const content = delta?.content;
      if (content) {
        if (!hasStartedContent) {
          hasStartedContent = true;
        }
        fullReply += content;
        onChunk(content);
      }
    }

    return fullReply;
  }
}
