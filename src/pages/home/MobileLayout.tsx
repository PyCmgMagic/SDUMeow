import { Navigate } from 'react-router-dom'

import { UserLayout } from '@/layouts/UserLayout'
import { RequireRole } from '@/router/guards'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/types/enums'
import { hasValidSession, isTokenExpired } from '@/utils/session'
import { useSessionReady } from '@shared/useSessionReady'

import { MobileHomePage } from './MobileHomePage'

const userAccessibleRoles = [UserRole.User, UserRole.Guest]

/**
 * 统一路由下移动端的首页（`/`）。行为承接原 LandingRedirect：
 * 管理员 → /admin/dashboard；未登录/过期 → /login（携带过期提示）；
 * 用户/游客 → 原地渲染移动端首页。
 */
export function MobileLayout() {
  const { role, token, hydrated } = useAuth()
  const sessionReady = useSessionReady()

  if (!hydrated || (token && !sessionReady)) {
    return null
  }

  if (role === UserRole.Admin && hasValidSession(role, token)) {
    return <Navigate replace to="/admin/dashboard" />
  }

  if (!hasValidSession(role, token)) {
    return (
      <Navigate
        replace
        state={token && isTokenExpired(token) ? { loginNotice: '请登录使用功能' } : undefined}
        to="/login"
      />
    )
  }

  return (
    <RequireRole allow={userAccessibleRoles}>
      <UserLayout>
        <MobileHomePage />
      </UserLayout>
    </RequireRole>
  )
}
