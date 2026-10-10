import type { ReactNode } from 'react'
import { useIsMobile } from '@shared/device'

import { RequirePcUser } from '@pc/router/guards'
import { RequireRole } from '@/router/guards'
import { UserLayout } from '@/layouts/UserLayout'
import { AdminLayout as MobileAdminLayout } from '@/layouts/AdminLayout'
import { UserRole } from '@/types/enums'
import { userRoles } from './roleSets'

/** 桌面端登录守卫包装（对应原 vue-router requiresAuth 元信息）。 */
export function PcUser({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile()
  return <RequirePcUser>{isMobile ? <UserLayout>{children}</UserLayout> : children}</RequirePcUser>
}

/** 移动端用户页包装：角色守卫 + 底部导航布局。 */
export function MbUser({ allow = userRoles, children }: { allow?: UserRole[]; children: ReactNode }) {
  const isMobile = useIsMobile()
  return (
    <RequireRole allow={allow}>
      {isMobile ? <UserLayout>{children}</UserLayout> : <div className="mx-auto w-full max-w-3xl">{children}</div>}
    </RequireRole>
  )
}

/** 管理页包装：管理员守卫 + 移动管理布局。 */
export function MbAdmin({ children }: { children: ReactNode }) {
  return (
    <RequireRole allow={[UserRole.Admin]}>
      <MobileAdminLayout>{children}</MobileAdminLayout>
    </RequireRole>
  )
}
