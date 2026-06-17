import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface KnowledgeDoc {
  id: string;
  title: string;
  sourceType: string;
  sourceId?: string;
  fileType?: string;
  originalName?: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

export interface SearchResult {
  content: string;
  title: string;
  score: number;
  documentId: string;
}

@Injectable({
  providedIn: 'root',
})
export class KnowledgeService {
  private baseUrl = `${environment.apiBase}/api/knowledge`;

  constructor(private http: HttpClient) {}

  /** 获取知识库文档列表 */
  getDocuments(): Observable<KnowledgeDoc[]> {
    return this.http.get<KnowledgeDoc[]>(this.baseUrl);
  }

  /** 上传文件到知识库 */
  uploadFile(file: File, title?: string): Observable<KnowledgeDoc> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    return this.http.post<KnowledgeDoc>(`${this.baseUrl}/upload`, formData);
  }

  /** 删除知识库文档 */
  deleteDocument(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  /** 触发 Wiki 文档索引 */
  indexWiki(documentId?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/index-wiki`, { documentId });
  }

  /** 搜索知识库 */
  search(query: string, topK = 3): Observable<SearchResult[]> {
    return this.http.get<SearchResult[]>(`${this.baseUrl}/search`, {
      params: { q: query, topK: topK.toString() },
    });
  }

  /** 获取文档预览内容 */
  getPreview(id: string): Observable<{ title: string; content: string; sourceType: string }> {
    return this.http.get<{ title: string; content: string; sourceType: string }>(`${this.baseUrl}/${id}/preview`);
  }
}
