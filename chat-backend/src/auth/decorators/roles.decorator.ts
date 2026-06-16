import { SetMetadata } from '@nestjs/common';

/** 设置允许访问的角色列表 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
