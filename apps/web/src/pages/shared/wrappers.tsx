import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { RequirePcUser } from '@pc/router/guards'
import { RequireRole } from '@/router/guards'
import { UserLayout } from '@/layouts/UserLayout'
import { AdminLayout as MobileAdminLayout } from '@/layouts/AdminLayout'
import { UserRole } from '@/types/enums'
import { userRoles } from './roleSets'

/** 桌面端登录守卫包装（对应原 vue-router requiresAuth 元信息）。 */
export function PcUser({ children }: { children: ReactNode }) {
  return <RequirePcUser>{children}</RequirePcUser>
}

/** 移动端用户页包装：角色守卫 + 底部导航布局。 */
export function MbUser({ allow = userRoles, children }: { allow?: UserRole[]; children: ReactNode }) {
  return (
    <RequireRole allow={allow}>
      <UserLayout>{children}</UserLayout>
    </RequireRole>
  )
}

/** 移动端管理页包装：管理员守卫 + 移动管理布局。 */
export function MbAdmin({ children }: { children: ReactNode }) {
  return (
    <RequireRole allow={[UserRole.Admin]}>
      <MobileAdminLayout>{children}</MobileAdminLayout>
    </RequireRole>
  )
}

/** 该页面仅另一端实现：按原部署行为弹回首页。 */
export function CrossDeviceRedirect() {
  return <Navigate replace to="/" />
}
