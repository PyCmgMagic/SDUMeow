import { lazy, Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { Toaster } from '@pc/components/ui/sonner'
import { useUserStore } from '@pc/stores/user'
import { useThemeStore } from '@pc/stores/theme'
import { withoutAppBasePath } from '@pc/lib/appPath'
import { useRouteName } from '@pc/router/routeName'

const SlideBar = lazy(() =>
  import('@pc/components/layout/SlideBar').then((module) => ({ default: module.SlideBar })),
)
const TopHeader = lazy(() =>
  import('@pc/components/layout/TopHeader').then((module) => ({ default: module.TopHeader })),
)

export default function App() {
  const location = useLocation()
  const routeName = useRouteName()
  const publicTheme = useThemeStore((state) => state.publicTheme)
  const restoreSession = useUserStore((state) => state.restoreSession)
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false)

  const appPath = withoutAppBasePath(location.pathname)
  const isAdminRoute = appPath.startsWith('/admin')
  const isFullScreen =
    // 登录页、无权限页和管理后台使用全屏布局，不加载前台侧边栏和顶栏。
    routeName === 'login'
    || routeName === 'admin-login'
    || routeName === 'admin-auth-forbidden'
    || isAdminRoute
  const isAuthCallback = new URLSearchParams(location.search).get('meow_token') !== null
  const isPublicWorkbenchRoute = [
    '/publish',
    '/new-cat',
    '/adopt',
    '/sos',
    '/notifications',
    '/my-adoptions',
    '/my-sos',
  ].includes(appPath)

  useEffect(() => {
    if (isAdminRoute) {
      delete document.documentElement.dataset.publicTheme
      return
    }
    document.documentElement.dataset.publicTheme = publicTheme
    return () => {
      delete document.documentElement.dataset.publicTheme
    }
  }, [isAdminRoute, publicTheme])

  useEffect(() => {
    if (isAdminRoute || isAuthCallback) return
    void restoreSession().catch((error) => {
      console.error('恢复用户信息失败', error)
    })
  }, [isAdminRoute, isAuthCallback, restoreSession])

  return (
    <>
      {isFullScreen ? (
        <div
          className="flex min-h-dvh w-full"
          data-public-theme={isAdminRoute ? undefined : publicTheme}
        >
          <Outlet />
        </div>
      ) : (
        <div
          data-public-theme={publicTheme}
          className="public-shell flex h-dvh min-h-0 w-full overflow-hidden font-sans"
        >
          <Suspense fallback={null}>
            <SlideBar mobileOpen={mobileNavigationOpen} onClose={() => setMobileNavigationOpen(false)} />
          </Suspense>
          <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col">
            <Suspense fallback={null}>
              <TopHeader
                navigationOpen={mobileNavigationOpen}
                onToggleNavigation={() => setMobileNavigationOpen((open) => !open)}
              />
            </Suspense>
            <main
              className={
                'relative z-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8'
                + (isPublicWorkbenchRoute ? ' public-workbench' : '')
              }
            >
              <Outlet />
            </main>
          </div>
        </div>
      )}
      <Toaster
        position="top-right"
        offset="16px"
        richColors
        closeButton
        visibleToasts={2}
        duration={4000}
        expand={false}
      />
    </>
  )
}
