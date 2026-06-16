import { SetMetadata } from '@nestjs/common';

/** 设置需要的权限列表 */
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
