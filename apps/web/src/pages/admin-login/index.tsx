import { useIsMobile } from '@shared/device'

import { DesktopLayout } from './DesktopLayout'
import { MobileLayout } from '../login/MobileLayout'

/**
 * 管理员登录页（`/admin/login`）：桌面端为独立的管理员登录表单，
 * 移动端复用统一登录页（管理员通过其"管理员登录"入口走独立 CAS 流程）。
 */
export default function AdminLoginPage() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileLayout /> : <DesktopLayout />
}
