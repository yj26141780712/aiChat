import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

/** 多模态内容块 */
export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

/** 消息接口定义 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
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
    // 检测是否包含图片，自动切换多模态模型
    const hasImages = messages.some(
      (m) => Array.isArray(m.content) && m.content.some((p) => p.type === 'image_url'),
    );
    const model = hasImages ? 'qwen3.7-plus' : 'qwen3.7-max';

    // 空闲超时：30秒内无任何数据则终止
    const IDLE_TIMEOUT_MS = 30_000;
    const abortController = new AbortController();
    let idleTimer: ReturnType<typeof setTimeout> = undefined!;

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        console.warn(`[ChatService] 流式响应超时（${IDLE_TIMEOUT_MS / 1000}s 无数据），主动终止`);
        abortController.abort();
      }, IDLE_TIMEOUT_MS);
    };

    // 如果外部传入了 signal，监听它来同步取消
    if (signal) {
      signal.addEventListener('abort', () => abortController.abort());
    }

    resetIdleTimer(); // 启动计时器

    try {
      const stream = await this.client.chat.completions.create(
        {
          model,
          messages: messages as any,
          stream: true,
          temperature: 0.7,
          ...({ enable_thinking: true, thinking_budget: 10000 } as object),
        },
        { signal: abortController.signal },
      );

      let fullReply = '';

      for await (const chunk of stream) {
        resetIdleTimer(); // 每次收到数据重置计时器
        const delta = chunk.choices?.[0]?.delta as any;

        if (delta?.reasoning_content && onThinking) {
          onThinking(delta.reasoning_content);
        }

        const content = delta?.content;
        if (content) {
          fullReply += content;
          onChunk(content);
        }
      }

      return fullReply;
    } finally {
      clearTimeout(idleTimer);
    }
  }
}
