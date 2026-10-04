import { useIsMobile } from '@shared/device'

import { DesktopLayout } from './DesktopLayout'
import { CrossDeviceRedirect, PcUser } from '../shared/wrappers'

/** NotificationPage：仅桌面端实现；移动端按原部署行为弹回首页。 */
export default function NotificationPage() {
  const isMobile = useIsMobile()
  return isMobile
    ? <CrossDeviceRedirect />
    : <PcUser><DesktopLayout /></PcUser>
}
