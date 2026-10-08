import { useQueryClient } from '@tanstack/react-query'
import { useContext, useEffect, useRef, type ReactNode } from 'react'
import { Outlet } from 'react-router-dom'

import { checkin } from '@/api/endpoints/user'
import { BottomNav } from '@/components/navigation/BottomNav'
import { PersistentUserNavigationContext } from '@/components/navigation/navigationContext'
import { userNavItems } from '@/components/navigation/userNavItems'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types/enums'
import { asNumber, asRecord } from '@/utils/format'

const AUTO_CHECKIN_TOTAL_DAYS_STORAGE_KEY = 'user:auto-checkin:total-days'
const AUTO_CHECKIN_CONTINUOUS_DAYS_STORAGE_KEY = 'user:auto-checkin:continuous-days'

// 统一路由下既作为 /user 布局组的 Outlet 容器，也支持直接包裹单页（children 优先）。
export function UserLayout({ children }: { children?: ReactNode }) {
  const persistentNavigation = useContext(PersistentUserNavigationContext)
  const { role, token, hydrated } = useAuth()
  const queryClient = useQueryClient()
  const hasTriggeredRef = useRef(false)

  useEffect(() => {
    if (!hydrated || !token || (role !== UserRole.User && role !== UserRole.Admin)) {
      hasTriggeredRef.current = false
      return
    }
    if (hasTriggeredRef.current) return
    hasTriggeredRef.current = true

    ;(async () => {
      console.log('[auto-checkin] trigger /users/me/checkin', { role })
      try {
        const result = await checkin()
        const checkinData = asRecord(result.data)
        const totalDays = asNumber(checkinData.totalDays, -1)
        if (totalDays >= 0) {
          window.localStorage.setItem(AUTO_CHECKIN_TOTAL_DAYS_STORAGE_KEY, String(Math.floor(totalDays)))
        }
        const continuousDays = asNumber(checkinData.continuousDays, -1)
        if (continuousDays >= 0) {
          window.localStorage.setItem(AUTO_CHECKIN_CONTINUOUS_DAYS_STORAGE_KEY, String(Math.floor(continuousDays)))
        }
        await queryClient.invalidateQueries({ queryKey: ['me'] })
        console.log('[auto-checkin] success', result?.data)
      } catch (error) {
        console.log('[auto-checkin] failed', error)
      }
    })()
  }, [hydrated, queryClient, role, token])

  return (
    <div className="h5-shell">
      {children ?? <Outlet />}
      {persistentNavigation ? null : <BottomNav items={userNavItems} />}
    </div>
  )
}
