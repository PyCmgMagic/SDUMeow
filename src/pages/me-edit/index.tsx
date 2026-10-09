import { useIsMobile } from '@shared/device'

import { DesktopLayout } from './DesktopLayout'
import { MobileLayout } from './MobileLayout'
import { strictUsers } from '../shared/roleSets'
import { MbUser, PcUser } from '../shared/wrappers'

/** EditProfilePage：桌面端与移动端共用同一路由，按视口宽度渲染对应布局。 */
export default function EditProfilePage() {
  const isMobile = useIsMobile()
  return isMobile
    ? <MbUser allow={strictUsers}><MobileLayout /></MbUser>
    : <PcUser><DesktopLayout /></PcUser>
}