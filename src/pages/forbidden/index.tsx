import { useIsMobile } from '@shared/device'

import { DesktopLayout } from './DesktopLayout'
import { CrossDeviceRedirect } from '../shared/wrappers'

/** ForbiddenPage：仅桌面端实现；移动端按原部署行为弹回首页。 */
export default function ForbiddenPage() {
  const isMobile = useIsMobile()
  return isMobile
    ? <CrossDeviceRedirect />
    : <DesktopLayout />
}
