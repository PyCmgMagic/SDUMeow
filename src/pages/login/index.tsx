import { useIsMobile } from '@shared/device'

import { DesktopLayout } from './DesktopLayout'
import { MobileLayout } from './MobileLayout'

/**
 * 登录页（`/login`、`/admin/login` 的移动端变体）。
 * 桌面端与移动端共用同一路由，按视口宽度渲染对应布局。
 */
export default function LoginPage() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileLayout /> : <DesktopLayout />
}
