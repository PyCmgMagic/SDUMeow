import { useIsMobile } from '@shared/device'

import { MobileLayout } from './MobileLayout'
import { strictUsers } from '../shared/roleSets'
import { CrossDeviceRedirect, MbUser } from '../shared/wrappers'

/** RewardsPage：仅移动端实现；桌面端按原部署行为弹回首页。 */
export default function RewardsPage() {
  const isMobile = useIsMobile()
  return isMobile
    ? <MbUser allow={strictUsers}><MobileLayout /></MbUser>
    : <CrossDeviceRedirect />
}