import { useIsMobile } from '@shared/device'

import { MobileLayout } from './MobileLayout'
import { CrossDeviceRedirect, MbUser } from '../shared/wrappers'

export default function TeamPage() {
  const isMobile = useIsMobile()
  return isMobile
    ? <MbUser><MobileLayout /></MbUser>
    : <CrossDeviceRedirect />
}
