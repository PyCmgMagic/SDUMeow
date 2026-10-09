import { useIsMobile } from '@shared/device'

import { DesktopLayout } from './DesktopLayout'
import { MobileLayout } from './MobileLayout'

/** 首页（`/`）：桌面端与移动端共用同一路由，按视口宽度渲染对应布局。 */
export default function HomePage() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileLayout /> : <DesktopLayout />
}
