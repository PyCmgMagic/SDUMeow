import { useIsMobile } from '@shared/device'

import { DesktopLayout } from './DesktopLayout'
import { MobileLayout } from './MobileLayout'

/** AdminUserDetailPage：管理后台两端布局（守卫与管理布局由 /admin 路由分支提供）。 */
export default function AdminUserDetailPage() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileLayout /> : <DesktopLayout />
}
