import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface WikiDocument {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author?: { id: string; username: string };
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class WikiService {
  private baseUrl = 'http://localhost:3000/api/wiki';

  constructor(private http: HttpClient) {}

  /** 获取文档列表 */
  getDocuments(): Observable<WikiDocument[]> {
    return this.http.get<WikiDocument[]>(this.baseUrl);
  }

  /** 获取文档详情 */
  getDocument(id: string): Observable<WikiDocument> {
    return this.http.get<WikiDocument>(`${this.baseUrl}/${id}`);
  }

  /** 新建文档 */
  createDocument(title: string, content: string): Observable<WikiDocument> {
    return this.http.post<WikiDocument>(this.baseUrl, { title, content });
  }

  /** 更新文档 */
  updateDocument(id: string, data: { title?: string; content?: string }): Observable<WikiDocument> {
    return this.http.patch<WikiDocument>(`${this.baseUrl}/${id}`, data);
  }

  /** 删除文档 */
  deleteDocument(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
