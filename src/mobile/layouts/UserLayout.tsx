import { useContext, useEffect, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'

import { BottomNav } from '@/components/navigation/BottomNav'
import { PersistentUserNavigationContext } from '@/components/navigation/navigationContext'
import { userNavItems } from '@/components/navigation/userNavItems'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types/enums'
import { checkinOnce } from '@shared/checkin.store'

// 统一路由下既作为 /user 布局组的 Outlet 容器，也支持直接包裹单页（children 优先）。
export function UserLayout({ children }: { children?: ReactNode }) {
  const persistentNavigation = useContext(PersistentUserNavigationContext)
  const { role, token, hydrated } = useAuth()

  useEffect(() => {
    if (!hydrated || !token || role !== UserRole.User) return
    void checkinOnce().catch((error) => console.warn('自动签到失败', error))
  }, [hydrated, role, token])

  return (
    <div className="h5-shell">
      {children ?? <Outlet />}
      {persistentNavigation ? null : <BottomNav items={userNavItems} />}
    </div>
  )
}
