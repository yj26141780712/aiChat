import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/** 权限守卫 - 检查用户是否拥有所需权限 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果没有设置权限要求，直接放行
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('请先登录');
    }

    // admin 角色拥有所有权限
    if (user.role === 'admin') {
      return true;
    }

    // 检查用户是否拥有所需权限
    const hasPermission = requiredPermissions.every((perm) =>
      user.permissions?.includes(perm),
    );

    if (!hasPermission) {
      throw new ForbiddenException('权限不足');
    }

    return true;
  }
}
