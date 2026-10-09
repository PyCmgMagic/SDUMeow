import { Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'
import { BottomNav } from '@/components/navigation/BottomNav'
import { PersistentUserNavigationContext } from '@/components/navigation/navigationContext'
import { userNavItems } from '@/components/navigation/userNavItems'

export function AppRootLayout() {
  const location = useLocation()
  const { hydrated, isAuthenticated, isAdmin, isGuest } = useAuth()
  const showPersistentNavigation = hydrated && isAuthenticated
    && userNavItems.some((item) => item.to === location.pathname)
    && (location.pathname === '/' ? !isAdmin : !isGuest)

  return (
    <div className="min-h-screen bg-[#e0e5ec]">
      <PersistentUserNavigationContext.Provider value={showPersistentNavigation}>
        <Outlet />
      </PersistentUserNavigationContext.Provider>
      {showPersistentNavigation ? <BottomNav items={userNavItems} /> : null}
    </div>
  )
}
