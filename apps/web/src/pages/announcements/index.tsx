import { useIsMobile } from '@shared/device'

import { MobileLayout } from './MobileLayout'
import { CrossDeviceRedirect, MbUser } from '../shared/wrappers'

/** AnnouncementsPage：仅移动端实现；桌面端按原部署行为弹回首页。 */
export default function AnnouncementsPage() {
  const isMobile = useIsMobile()
  return isMobile
    ? <MbUser><MobileLayout /></MbUser>
    : <CrossDeviceRedirect />
}
