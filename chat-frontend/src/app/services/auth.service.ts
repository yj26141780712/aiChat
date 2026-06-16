import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

/** 用户信息 */
export interface UserInfo {
  id: string;
  email: string;
  username: string;
  role: string;
  permissions: string[];
  emailVerified: boolean;
}

/** 登录响应 */
interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserInfo;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = `${environment.apiBase}/auth`;
  private currentUserSubject = new BehaviorSubject<UserInfo | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // 从 localStorage 恢复用户信息
    const stored = localStorage.getItem('chat_user');
    if (stored) {
      this.currentUserSubject.next(JSON.parse(stored));
    }
  }

  /** 注册 */
  register(email: string, password: string, username: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, {
      email,
      password,
      username,
    });
  }

  /** 登录 */
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, {
      email,
      password,
    }).pipe(
      tap((response) => {
        localStorage.setItem('chat_access_token', response.accessToken);
        localStorage.setItem('chat_refresh_token', response.refreshToken);
        localStorage.setItem('chat_user', JSON.stringify(response.user));
        this.currentUserSubject.next(response.user);
      }),
    );
  }

  /** 登出 */
  logout(): void {
    localStorage.removeItem('chat_access_token');
    localStorage.removeItem('chat_refresh_token');
    localStorage.removeItem('chat_user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  /** 获取 access token */
  getAccessToken(): string | null {
    return localStorage.getItem('chat_access_token');
  }

  /** 获取 refresh token */
  getRefreshToken(): string | null {
    return localStorage.getItem('chat_refresh_token');
  }

  /** 获取当前用户 */
  getCurrentUser(): UserInfo | null {
    return this.currentUserSubject.value;
  }

  /** 是否已登录 */
  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }

  /** 是否是管理员 */
  isAdmin(): boolean {
    return this.currentUserSubject.value?.role === 'admin';
  }

  /** 刷新 token */
  refreshToken(): Observable<any> {
    const userId = this.currentUserSubject.value?.id;
    const refreshToken = this.getRefreshToken();

    return this.http.post<any>(`${this.baseUrl}/refresh`, {
      userId,
      refreshToken,
    }).pipe(
      tap((response) => {
        localStorage.setItem('chat_access_token', response.accessToken);
        localStorage.setItem('chat_refresh_token', response.refreshToken);
      }),
    );
  }

  /** 验证邮箱 */
  verifyEmail(token: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/verify-email?token=${token}`);
  }

  /** 发送重置密码邮件 */
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/forgot-password`, { email });
  }

  /** 重置密码 */
  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/reset-password`, {
      token,
      newPassword,
    });
  }

  /** 获取用户信息 */
  getProfile(): Observable<UserInfo> {
    return this.http.get<UserInfo>(`${this.baseUrl}/profile`).pipe(
      tap((user) => {
        localStorage.setItem('chat_user', JSON.stringify(user));
        this.currentUserSubject.next(user);
      }),
    );
  }
}
