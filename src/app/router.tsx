/* eslint-disable react-refresh/only-export-components -- 路由表文件同时导出路由常量与根组件 */
import { Suspense, lazy, useEffect, type ComponentType } from 'react'
import {
  createBrowserRouter,
  redirect,
  type LoaderFunctionArgs,
  type RouteObject,
  useLocation,
} from 'react-router-dom'

import { AdminLayout as PcAdminLayout } from '@pc/components/layout/AdminLayout'
import PcApp from '@pc/App'
import { RequirePcAdmin } from '@pc/router/guards'
import { clearAuthIntent, isAdminAuthToken, peekAuthIntent } from '@pc/lib/auth'
import { useUserStore } from '@pc/stores/user'
import { RequireRole } from '@/router/guards'
import { AppRootLayout } from '@/layouts/AppRootLayout'
import { AdminLayout as MobileAdminLayout } from '@/layouts/AdminLayout'
import { UserRole } from '@/types/enums'
import { useIsMobile } from '@shared/device'
import { safeAuthRedirect } from '@shared/authRedirect'
import { STORAGE_KEYS } from '@/utils/constants'

/* ------------------------------------------------------------------ */
/* 路由辅助 */
/* ------------------------------------------------------------------ */

/** 页面组件均带默认导出；统一转成 React Router 的 lazy 约定。 */
const page = (loader: () => Promise<{ default: ComponentType }>) => {
  const Component = lazy(loader)
  return { element: <Suspense fallback={null}><Component /></Suspense> }
}

/** 同一路径按设备渲染对应布局（仅 /admin 分支仍需在路由层切换管理壳）。 */
function Adaptive({ desktop, mobile }: { desktop: React.ReactNode; mobile: React.ReactNode }) {
  const isMobile = useIsMobile()
  return <Suspense fallback={null}>{isMobile ? mobile : desktop}</Suspense>
}

/* ------------------------------------------------------------------ */
/* 统一认证回调：两端共用路由 loader，视口变化不会中断令牌交换。 */
/* ------------------------------------------------------------------ */

async function authEntryLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  if (!url.searchParams.has('login_code') && !url.searchParams.has('meow_token')) return null
  const legacyMode = url.searchParams.get('auth_mode') || url.searchParams.get('login_mode')
    || url.searchParams.get('meow_role') || sessionStorage.getItem(STORAGE_KEYS.authLoginMode)
    || localStorage.getItem(STORAGE_KEYS.authLoginMode)
  const authIntent = peekAuthIntent() || (legacyMode === 'admin' ? 'admin' : 'user')
  const storedRedirect = sessionStorage.getItem('authRedirect')
  const pendingRedirect = safeAuthRedirect(storedRedirect, authIntent === 'admin' ? '/admin/dashboard' : '/')
  const clearPendingAuth = () => {
    sessionStorage.removeItem('authRedirect')
    sessionStorage.removeItem(STORAGE_KEYS.authLoginMode)
    localStorage.removeItem(STORAGE_KEYS.authLoginMode)
    clearAuthIntent()
  }

  // 新契约（/auth/exchange 描述）：回调只携带一次性 login_code，用它换取令牌。
  const loginCode = url.searchParams.get('login_code')
  if (loginCode) {
    try {
      const exchanged = await fetch('/api/auth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginCode }),
      }).then((response) => response.json())
      const data = (exchanged && typeof exchanged === 'object' ? exchanged : {}) as {
        code?: number
        data?: { accessToken?: string; refreshToken?: string }
        msg?: string
        message?: string
      }
      const accessToken = data.data?.accessToken
      if (typeof data.code === 'number' && data.code >= 400) {
        throw new Error(data.msg || data.message || '统一认证登录失败')
      }
      if (!accessToken) throw new Error('统一认证未返回有效令牌')
      url.searchParams.set('meow_token', accessToken)
      const refreshToken = data.data?.refreshToken
      if (refreshToken) url.searchParams.set('meow_refresh_token', refreshToken)
      else url.searchParams.delete('meow_refresh_token')
    } catch (error) {
      console.error('SDU authentication exchange failed', error)
      clearPendingAuth()
      const message = error instanceof Error ? error.message : ''
      const query = new URLSearchParams({ authError: 'sdu', redirect: pendingRedirect })
      const loginPath = authIntent === 'admin' ? '/admin/login' : '/login'
      return redirect(`${loginPath}?${query.toString()}${message ? `&exchangeError=${encodeURIComponent(message)}` : ''}`)
    }
  }

  const accessToken = url.searchParams.get('meow_token') || ''
  const refreshToken = url.searchParams.get('meow_refresh_token') || undefined

  if (!accessToken) return null

  const cleanQuery = new URLSearchParams(url.searchParams)
  cleanQuery.delete('meow_token')
  cleanQuery.delete('meow_refresh_token')
  cleanQuery.delete('login_code')
  cleanQuery.delete('auth_mode')
  cleanQuery.delete('login_mode')
  cleanQuery.delete('meow_role')

  const tokenIsAdmin = isAdminAuthToken(accessToken)
  const currentPath = url.pathname
  const callbackTarget = ['/', '/login', '/admin/login'].includes(currentPath) ? pendingRedirect : currentPath
  const isAdminAuthentication =
    tokenIsAdmin
    || authIntent === 'admin'
    || pendingRedirect.startsWith('/admin')
    || callbackTarget.startsWith('/admin')
  const resolvedPath = isAdminAuthentication
    ? (callbackTarget.startsWith('/admin') ? callbackTarget : '/admin/dashboard')
    : callbackTarget
  const cleanTargetQuery = resolvedPath === currentPath && cleanQuery.size ? `?${cleanQuery.toString()}` : ''
  const cleanTargetHash = resolvedPath === currentPath ? url.hash || window.location.hash : ''

  try {
    await useUserStore.getState().completeSduLogin(
      accessToken,
      refreshToken,
      isAdminAuthentication ? 'admin' : 'user',
    )
    clearPendingAuth()
    const target = `${resolvedPath}${cleanTargetQuery}${cleanTargetHash}`
    window.history.replaceState(window.history.state, '', target)
    return redirect(target)
  } catch (error) {
    console.error('SDU authentication callback failed', error)
    clearPendingAuth()
    const loginPath = isAdminAuthentication ? '/admin/login' : '/login'
    const message = error instanceof Error ? error.message : ''
    const authError = /权限|forbidden|not[_ -]?admin|管理员会话|用户会话/i.test(message)
      ? 'forbidden'
      : 'sdu'
    const query = new URLSearchParams({ authError, redirect: pendingRedirect })
    return redirect(`${loginPath}?${query.toString()}`)
  }
}

/* ------------------------------------------------------------------ */
/* 旧 URL 兼容重定向（/pc/*、/mobile/* 与两端各自的旧路径） */
/* ------------------------------------------------------------------ */

const stripAppPrefix = (prefix: string) => ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url)
  const rest = url.pathname.slice(prefix.length) || '/'
  return redirect(`${rest}${url.search}${url.hash}`)
}

const legacyRedirects: RouteObject[] = [
  { path: '/pc/*', loader: stripAppPrefix('/pc') },
  { path: '/mobile/*', loader: stripAppPrefix('/mobile') },
  // 桌面端旧路径
  { path: '/cat/:id', loader: ({ params }: LoaderFunctionArgs) => redirect(`/cats/${params.id}`) },
  { path: '/userCenter', loader: () => redirect('/me') },
  { path: '/editProfile', loader: () => redirect('/me/edit') },
  { path: '/post', loader: () => redirect('/publish') },
  { path: '/ranking/:type', loader: () => redirect('/leaderboard') },
  // 移动端旧路径
  { path: '/user/home', loader: () => redirect('/') },
  { path: '/user/home-alt', loader: () => redirect('/home-alt') },
  { path: '/user/cats/:id/profile', loader: ({ params }: LoaderFunctionArgs) => redirect(`/cats/${params.id}/profile`) },
  { path: '/user/cats/:id', loader: ({ params }: LoaderFunctionArgs) => redirect(`/cats/${params.id}`) },
  { path: '/user/publish', loader: () => redirect('/publish') },
  { path: '/user/new-cat', loader: () => redirect('/new-cat') },
  { path: '/user/sos/report', loader: () => redirect('/sos') },
  { path: '/user/leaderboard', loader: () => redirect('/leaderboard') },
  { path: '/user/adopt/apply', loader: () => redirect('/adopt') },
  { path: '/user/rewards', loader: () => redirect('/rewards') },
  { path: '/user/kepu', loader: () => redirect('/kepu') },
  { path: '/user/announcements/:id', loader: ({ params }: LoaderFunctionArgs) => redirect(`/announcements/${params.id}`) },
  { path: '/user/announcements', loader: () => redirect('/announcements') },
  { path: '/user/articles/:id', loader: ({ params }: LoaderFunctionArgs) => redirect(`/articles/${params.id}`) },
  { path: '/user/me/edit', loader: () => redirect('/me/edit') },
  { path: '/user/me-center', loader: () => redirect('/me') },
  { path: '/user/me', loader: () => redirect('/profile') },
  { path: '/user/team', loader: () => redirect('/team') },
  { path: '/admin/home', loader: () => redirect('/admin/dashboard') },
]

/* ------------------------------------------------------------------ */
/* 统一路由树：一套 URL，每个页面组件内部按设备渲染对应布局 */
/* ------------------------------------------------------------------ */

export const router = createBrowserRouter(
  [
    ...legacyRedirects,
    {
      path: '/',
      element: <UnifiedRoot />,
      loader: authEntryLoader,
      children: [
        {
          index: true,
          handle: { name: 'home' },
          ...page(() => import('../pages/home')),
        },
        {
          path: 'login',
          handle: { name: 'login' },
          ...page(() => import('../pages/login')),
        },
        {
          path: 'admin/login',
          handle: { name: 'admin-login' },
          ...page(() => import('../pages/admin-login')),
        },
        {
          path: 'admin/forbidden',
          handle: { name: 'admin-auth-forbidden' },
          ...page(() => import('../pages/admin-forbidden')),
        },
        {
          path: 'forbidden',
          handle: { name: 'forbidden' },
          ...page(() => import('../pages/forbidden')),
        },

        // ---- 用户侧（守卫与移动端底部导航在各页面组件内部，保持两端原语义） ----
        {
          path: 'cats/:id',
          handle: { name: 'cat-detail' },
          ...page(() => import('../pages/cat-detail')),
        },
        {
          path: 'cats/:id/profile',
          ...page(() => import('../pages/cat-profile')),
        },
        {
          path: 'publish',
          handle: { name: 'post-moment' },
          ...page(() => import('../pages/publish')),
        },
        {
          path: 'new-cat',
          handle: { name: 'new-cat' },
          ...page(() => import('../pages/new-cat')),
        },
        {
          path: 'sos',
          handle: { name: 'sos' },
          ...page(() => import('../pages/sos')),
        },
        {
          path: 'adopt',
          handle: { name: 'adopt' },
          ...page(() => import('../pages/adopt')),
        },
        {
          path: 'leaderboard',
          handle: { name: 'ranking' },
          ...page(() => import('../pages/leaderboard')),
        },
        {
          path: 'me',
          handle: { name: 'userCenter' },
          ...page(() => import('../pages/me')),
        },
        {
          path: 'profile',
          ...page(() => import('../pages/profile')),
        },
        {
          path: 'me/edit',
          handle: { name: 'editProfile' },
          ...page(() => import('../pages/me-edit')),
        },
        {
          path: 'announcements',
          ...page(() => import('../pages/announcements')),
        },
        {
          path: 'announcements/:id',
          handle: { name: 'announcement-detail' },
          ...page(() => import('../pages/announcement-detail')),
        },
        {
          path: 'articles/:id',
          ...page(() => import('../pages/article-detail')),
        },
        {
          path: 'kepu',
          ...page(() => import('../pages/kepu')),
        },
        {
          path: 'rewards',
          ...page(() => import('../pages/rewards')),
        },
        {
          path: 'home-alt',
          ...page(() => import('../pages/home-alt')),
        },
        {
          path: 'my-adoptions',
          handle: { name: 'my-adoptions' },
          ...page(() => import('../pages/my-adoptions')),
        },
        {
          path: 'my-sos',
          handle: { name: 'my-sos' },
          ...page(() => import('../pages/my-sos')),
        },
        {
          path: 'checkin-history',
          handle: { name: 'checkin-history' },
          ...page(() => import('../pages/checkin-history')),
        },
        {
          path: 'notifications',
          handle: { name: 'notifications' },
          ...page(() => import('../pages/notifications')),
        },
        {
          path: 'team',
          handle: { name: 'team' },
          ...page(() => import('../pages/team')),
        },

        // ---- 管理端（守卫与管理布局由本分支提供，页面组件只做设备切换） ----
        {
          path: 'admin',
          handle: { name: 'admin' },
          element: (
            <Adaptive
              desktop={<RequirePcAdmin><PcAdminLayout /></RequirePcAdmin>}
              mobile={<RequireRole allow={[UserRole.Admin]}><MobileAdminLayout /></RequireRole>}
            />
          ),
          children: [
            { index: true, loader: () => redirect('/admin/dashboard') },
            {
              path: 'dashboard',
              handle: { name: 'admin-dashboard' },
              ...page(() => import('../pages/admin-dashboard')),
            },
            {
              path: 'sos',
              handle: { name: 'admin-sos' },
              ...page(() => import('../pages/admin-sos')),
            },
            {
              path: 'sos/:id',
              ...page(() => import('../pages/admin-sos-detail')),
            },
            {
              path: 'cats',
              handle: { name: 'admin-cats' },
              ...page(() => import('../pages/admin-cats')),
            },
            {
              path: 'cats/:id',
              handle: { name: 'admin-cat-detail' },
              ...page(() => import('../pages/admin-cat-detail')),
            },
            {
              path: 'cats/:id/edit',
              ...page(() => import('../pages/admin-cat-edit')),
            },
            {
              path: 'adoptions',
              handle: { name: 'admin-adoptions' },
              ...page(() => import('../pages/admin-adoptions')),
            },
            {
              path: 'adoptions/:id',
              ...page(() => import('../pages/admin-adoption-detail')),
            },
            {
              path: 'users',
              handle: { name: 'admin-users' },
              ...page(() => import('../pages/admin-users')),
            },
            {
              path: 'users/:id',
              handle: { name: 'admin-user-detail' },
              ...page(() => import('../pages/admin-user-detail')),
            },
            {
              path: 'new-cats',
              handle: { name: 'admin-new-cats' },
              ...page(() => import('../pages/admin-new-cats')),
            },
            {
              path: 'announcements',
              handle: { name: 'admin-announcements' },
              ...page(() => import('../pages/admin-announcements')),
            },
            {
              path: 'announcements/new/edit',
              ...page(() => import('../pages/admin-announcement-edit')),
            },
            {
              path: 'announcements/:id/edit',
              ...page(() => import('../pages/admin-announcement-edit')),
            },
            {
              path: 'me',
              ...page(() => import('../pages/admin-me')),
            },
          ],
        },

        // ---- 404 ----
        {
          path: '*',
          ...page(() => import('../pages/not-found')),
        },
      ],
    },
  ],
  {
    basename: '/',
  },
)

/** 统一根：桌面端渲染 PC 壳（侧栏+顶栏），移动端渲染移动端根布局。 */
function UnifiedRoot() {
  const isMobile = useIsMobile()
  const authRevision = useUserStore((state) => state.authRevision)
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const key = params.has('meow_token') || params.has('login_code') ? 'auth-callback' : authRevision

  useEffect(() => {
    document.documentElement.dataset.device = isMobile ? 'mobile' : 'pc'
  }, [isMobile])

  return isMobile ? <AppRootLayout key={key} /> : <PcApp key={key} />
}
