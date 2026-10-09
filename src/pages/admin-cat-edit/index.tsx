import { Navigate } from 'react-router-dom'
import { useIsMobile } from '@shared/device'

import { MobileLayout } from './MobileLayout'

/** AdminCatEditPage：仅移动端实现；桌面端跳回对应管理列表页。 */
export default function AdminCatEditPage() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileLayout /> : <Navigate replace to="/admin/cats" />
}
