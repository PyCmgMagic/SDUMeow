import { useIsMobile } from '@shared/device'

import { DesktopLayout } from './DesktopLayout'
import { MobileLayout } from './MobileLayout'
import { MbUser } from '../shared/wrappers'

/**
 * 猫猫详情页（`/cats/:id`）。
 * 桌面端公开访问；移动端需用户/游客会话并渲染底部导航布局（与原两端守卫一致）。
 * 两端共用的纯逻辑见 `./shared.ts`。
 */
export default function CatDetailPage() {
  const isMobile = useIsMobile()
  return isMobile
    ? <MbUser><MobileLayout /></MbUser>
    : <DesktopLayout />
}
