import { MobileLayout } from './MobileLayout'
import { strictUsers } from '../shared/roleSets'
import { MbUser } from '../shared/wrappers'

export default function RewardsPage() {
  return <MbUser allow={strictUsers}><MobileLayout /></MbUser>
}
