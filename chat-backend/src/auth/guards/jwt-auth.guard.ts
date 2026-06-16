import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** JWT 认证守卫 - 验证 Bearer Token */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /** 可选：允许某些路由跳过认证 */
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
