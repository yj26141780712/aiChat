import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private baseUrl = 'http://localhost:3000/api/history';

  constructor(private http: HttpClient) {}

  /** 获取用户的对话列表 */
  getConversations(userId: string): Observable<ConversationItem[]> {
    return this.http.get<ConversationItem[]>(`${this.baseUrl}?userId=${userId}`);
  }

  /** 获取某个对话的消息列表 */
  getMessages(conversationId: string): Observable<MessageRecord[]> {
    return this.http.get<MessageRecord[]>(
      `${this.baseUrl}/${conversationId}/messages`,
    );
  }
}
