import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket | null = null;

  constructor(private authService: AuthService) {}

  /** 连接 WebSocket（需要在登录后调用） */
  connect(): void {
    const token = this.authService.getAccessToken();
    if (!token) return;

    this.socket = io(environment.apiBase || window.location.origin, {
      auth: { token },
    });

    this.socket.on('connect', () => {
      console.log('WebSocket 已连接');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket 已断开');
    });
  }

  /** 断开 WebSocket */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /** 发送用户消息 */
  sendMessage(message: string, conversationId?: string, useRag?: boolean): void {
    this.socket?.emit('user_message', { message, conversationId, useRag });
  }

  /** 设置当前对话 */
  setConversation(conversationId: string): void {
    this.socket?.emit('set_conversation', { conversationId });
  }

  /** 创建新对话 */
  createConversation(): void {
    this.socket?.emit('create_conversation');
  }

  /** 监听流式内容块 */
  onStreamChunk(): Observable<{ content: string; conversationId: string }> {
    return new Observable((observer) => {
      this.socket?.on('stream_chunk', (data: { content: string; conversationId: string }) => {
        observer.next(data);
      });
      return () => this.socket?.off('stream_chunk');
    });
  }

  /** 监听流式思考内容 */
  onStreamThinking(): Observable<{ content: string; conversationId: string }> {
    return new Observable((observer) => {
      this.socket?.on('stream_thinking', (data: { content: string; conversationId: string }) => {
        observer.next(data);
      });
      return () => this.socket?.off('stream_thinking');
    });
  }

  /** 监听流式结束 */
  onStreamDone(): Observable<{ fullReply: string; conversationId: string }> {
    return new Observable((observer) => {
      this.socket?.on('stream_done', (data: { fullReply: string; conversationId: string }) => {
        observer.next(data);
      });
      return () => this.socket?.off('stream_done');
    });
  }

  /** 监听错误 */
  onStreamError(): Observable<{ message: string; conversationId?: string }> {
    return new Observable((observer) => {
      this.socket?.on('stream_error', (data: { message: string; conversationId?: string }) => {
        observer.next(data);
      });
      return () => this.socket?.off('stream_error');
    });
  }

  /** 监听对话创建 */
  onConversationCreated(): Observable<{ conversationId: string }> {
    return new Observable((observer) => {
      this.socket?.on('conversation_created', (data: { conversationId: string }) => {
        observer.next(data);
      });
      return () => this.socket?.off('conversation_created');
    });
  }

  /** 监听标题更新 */
  onTitleUpdated(): Observable<{ title: string; conversationId: string }> {
    return new Observable((observer) => {
      this.socket?.on('title_updated', (data: { title: string; conversationId: string }) => {
        observer.next(data);
      });
      return () => this.socket?.off('title_updated');
    });
  }

  /** 监听连接成功 */
  onConnected(): Observable<{ userId: string; username: string }> {
    return new Observable((observer) => {
      this.socket?.on('connected', (data: { userId: string; username: string }) => {
        observer.next(data);
      });
      return () => this.socket?.off('connected');
    });
  }

  /** 获取当前用户 ID */
  getUserId(): string | null {
    return this.authService.getCurrentUser()?.id || null;
  }
}
