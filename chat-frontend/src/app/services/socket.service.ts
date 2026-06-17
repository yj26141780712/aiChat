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
      reconnection: true,          // 启用自动重连
      reconnectionDelay: 1000,     // 首次重连延迟 1s
      reconnectionDelayMax: 5000,  // 最大重连延迟 5s
      reconnectionAttempts: 10,    // 最多尝试 10 次
    });

    this.socket.on('connect', () => {
      console.log('WebSocket 已连接');
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`WebSocket 已断开: ${reason}`);
      // 如果是服务端主动断开（如 token 过期），不重连
      if (reason === 'io server disconnect') {
        console.warn('服务端主动断开，需重新登录');
      }
    });

    this.socket.on('connect_error', async (err: any) => {
      console.error('WebSocket 连接错误:', err.message);
      // Token 过期或无效时，尝试刷新 token
      if (err.message?.includes('jwt') || err.message?.includes('unauthorized')) {
        console.warn('Token 无效，尝试刷新...');
        try {
          const refreshToken = this.authService.getRefreshToken();
          const userId = this.authService.getCurrentUser()?.id;
          
          if (!refreshToken || !userId) {
            console.warn('无 refresh token，需重新登录');
            this.disconnect();
            return;
          }

          // 调用刷新接口
          const response = await fetch(`${environment.apiBase}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, refreshToken }),
          }).then(r => r.json());

          if (response.accessToken && response.refreshToken) {
            // 更新本地存储
            localStorage.setItem('chat_access_token', response.accessToken);
            localStorage.setItem('chat_refresh_token', response.refreshToken);
            console.log('Token 刷新成功，重新连接');
            
            // 断开旧连接并用新 token 重连
            this.disconnect();
            setTimeout(() => this.connect(), 500);
          } else {
            console.warn('刷新失败，需重新登录');
            this.disconnect();
          }
        } catch (e) {
          console.error('刷新 token 失败:', e);
          this.disconnect();
        }
      }
    });

    // 监听连接失败（后端 JWT 验证失败时发送）
    this.socket.on('connection_failed', (data: { message: string }) => {
      console.error('WebSocket 连接被拒绝:', data.message);
    });

    // 监听重连尝试
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`尝试重连 (${attemptNumber}/10)...`);
      // 重连前更新 token（防止 token 已刷新但 socket 仍用旧 token）
      const newToken = this.authService.getAccessToken();
      if (newToken && this.socket) {
        this.socket.auth = { token: newToken };
      }
    });

    // 监听重连成功
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`重连成功 (第 ${attemptNumber} 次尝试)`);
    });

    // 监听重连失败
    this.socket.on('reconnect_failed', () => {
      console.error('重连失败，请刷新页面或重新登录');
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
  sendMessage(message: string, conversationId?: string, useRag?: boolean, images?: string[]): void {
    this.socket?.emit('user_message', { message, conversationId, useRag, images });
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
