import { UserRole } from '@/types/enums'

/** 移动端游客 + 用户可访问的角色集合（与原 /user 布局组一致）。 */
export const userRoles: UserRole[] = [UserRole.User, UserRole.Guest]

/** 仅正式用户可访问的角色集合（发布、领养申请等）。 */
export const strictUsers: UserRole[] = [UserRole.User]
