import { HttpInterceptorFn, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, BehaviorSubject, switchMap, filter, take, EMPTY, Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** 是否正在刷新 token */
let isRefreshing = false;
/** 刷新 token 的 Subject，用于通知排队的请求 */
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

/** HTTP 拦截器 - 自动添加 Authorization header + 自动刷新 token */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getAccessToken();

  // 如果有 token，添加到请求头
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 未授权 - 尝试刷新 token
      if (error.status === 401 && !req.url.includes('/auth/refresh') && !req.url.includes('/auth/login')) {
        return handle401(authService, router, req, next);
      }
      return throwError(() => error);
    }),
  );
};

/** 处理 401：尝试刷新 token，成功则重试原请求 */
function handle401(authService: AuthService, router: Router, failedReq: any, next: any): Observable<HttpEvent<unknown>> {
  if (!authService.getRefreshToken()) {
    // 没有 refresh token，直接登出
    authService.logout();
    return EMPTY;
  }

  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((res: any) => {
        isRefreshing = false;
        refreshTokenSubject.next(res.accessToken);
        // 用新 token 重试原请求
        const retryReq = failedReq.clone({
          setHeaders: { Authorization: `Bearer ${res.accessToken}` },
        });
        return next(retryReq) as Observable<HttpEvent<unknown>>;
      }),
      catchError((err) => {
        isRefreshing = false;
        // 刷新失败，登出
        authService.logout();
        return EMPTY as Observable<HttpEvent<unknown>>;
      }),
    );
  } else {
    // 已有刷新请求在进行中，等待其完成后再重试
    return refreshTokenSubject.pipe(
      filter((token) => token !== null),
      take(1),
      switchMap((token) => {
        const retryReq = failedReq.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        });
        return next(retryReq) as Observable<HttpEvent<unknown>>;
      }),
    );
  }
}
