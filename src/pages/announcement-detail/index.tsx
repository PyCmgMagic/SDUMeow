import { useIsMobile } from '@shared/device'

import { DesktopLayout } from './DesktopLayout'
import { MobileLayout } from './MobileLayout'
import { MbUser } from '../shared/wrappers'

/** AnnouncementDetailPage：桌面端与移动端共用同一路由，按视口宽度渲染对应布局。 */
export default function AnnouncementDetailPage() {
  const isMobile = useIsMobile()
  return isMobile
    ? <MbUser><MobileLayout /></MbUser>
    : <DesktopLayout />
}
