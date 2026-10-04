import { useIsMobile } from '@shared/device'

import { DesktopLayout } from './DesktopLayout'
import { MobileLayout } from './MobileLayout'
import { strictUsers } from '../shared/roleSets'
import { MbUser } from '../shared/wrappers'

/** LeaderboardPage：桌面端公开访问；移动端需正式用户登录（与原两端守卫一致）。 */
export default function LeaderboardPage() {
  const isMobile = useIsMobile()
  return isMobile
    ? <MbUser allow={strictUsers}><MobileLayout /></MbUser>
    : <DesktopLayout />
}