import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** 对话列表项 */
export interface ConversationItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/** 消息记录 */
export interface MessageRecord {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  conversationId: string;
}

@Injectable({
  providedIn: 'root',
})
export class HttpService {
  private baseUrl = `${environment.apiBase}/api/history`;

  constructor(private http: HttpClient) {}

  /** 获取当前用户的对话列表 */
  getConversations(): Observable<ConversationItem[]> {
    return this.http.get<ConversationItem[]>(this.baseUrl);
  }

  /** 获取某个对话的消息列表 */
  getMessages(conversationId: string): Observable<MessageRecord[]> {
    return this.http.get<MessageRecord[]>(
      `${this.baseUrl}/${conversationId}/messages`,
    );
  }

  /** 重命名对话 */
  renameConversation(conversationId: string, title: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${conversationId}`, { title });
  }

  /** 删除单个对话 */
  deleteConversation(conversationId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${conversationId}`);
  }

  /** 清空所有对话 */
  deleteAllConversations(): Observable<any> {
    return this.http.delete(this.baseUrl);
  }
}
