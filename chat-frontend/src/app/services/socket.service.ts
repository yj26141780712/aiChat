import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

/** 消息接口 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket;

  constructor() {
    // 连接到 NestJS 后端 WebSocket
    this.socket = io('http://localhost:3000');

    this.socket.on('connect', () => {
      console.log('WebSocket 已连接, ID:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket 已断开');
    });
  }

  /** 发送用户消息 */
  sendMessage(message: string): void {
    this.socket.emit('user_message', { message });
  }

  /** 监听流式内容块 */
  onStreamChunk(): Observable<{ content: string }> {
    return new Observable((observer) => {
      this.socket.on('stream_chunk', (data: { content: string }) => {
        observer.next(data);
      });
      return () => this.socket.off('stream_chunk');
    });
  }

  /** 监听流式结束 */
  onStreamDone(): Observable<{ fullReply: string }> {
    return new Observable((observer) => {
      this.socket.on('stream_done', (data: { fullReply: string }) => {
        observer.next(data);
      });
      return () => this.socket.off('stream_done');
    });
  }

  /** 监听错误 */
  onStreamError(): Observable<{ message: string }> {
    return new Observable((observer) => {
      this.socket.on('stream_error', (data: { message: string }) => {
        observer.next(data);
      });
      return () => this.socket.off('stream_error');
    });
  }

  /** 监听对话创建 */
  onConversationCreated(): Observable<{ conversationId: string }> {
    return new Observable((observer) => {
      this.socket.on('conversation_created', (data: { conversationId: string }) => {
        observer.next(data);
      });
      return () => this.socket.off('conversation_created');
    });
  }

  /** 监听标题更新 */
  onTitleUpdated(): Observable<{ title: string }> {
    return new Observable((observer) => {
      this.socket.on('title_updated', (data: { title: string }) => {
        observer.next(data);
      });
      return () => this.socket.off('title_updated');
    });
  }

  /** 获取当前 socket ID */
  getSocketId(): string | undefined {
    return this.socket.id;
  }
}
