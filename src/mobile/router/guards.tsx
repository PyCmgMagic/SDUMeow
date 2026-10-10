import type { PropsWithChildren } from 'react'

import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'
import { UserRole, type UserRole as UserRoleType } from '@/types/enums'
import { hasValidSession } from '@/utils/session'
import { storage } from '@/utils/storage'
import { useSessionReady } from '@shared/useSessionReady'

type RequireRoleProps = PropsWithChildren<{
  allow: UserRoleType[]
}>

function canAccess(role: UserRoleType, allow: UserRoleType[]): boolean {
  if (allow.includes(role)) {
    return true
  }

  // Admin inherits all user capabilities.
  if (role === UserRole.Admin && allow.includes(UserRole.User)) {
    return true
  }

  return false
}

export function RequireRole({ allow, children }: RequireRoleProps) {
  const { role, token, hydrated } = useAuth()
  const sessionReady = useSessionReady()
  const location = useLocation()
  const loginPath = allow.includes(UserRole.Admin) && !allow.includes(UserRole.User) ? '/admin/login' : '/login'
  const from = `${location.pathname}${location.search}${location.hash}`
  const loginTarget = `${loginPath}?${new URLSearchParams({ redirect: from })}`
  const loginState = {
    from,
    loginNotice: '请登录使用功能',
  }

  if (!hydrated || (token && !sessionReady)) {
    return null
  }

  // Admin sessions are kept in their own shared slot. Reading that slot here
  // prevents a stale persisted user token from satisfying an admin route when
  // another viewport has changed the active role.
  const guardToken = role === UserRole.Admin ? storage.getToken('admin') : token

  if (!hasValidSession(role, guardToken)) {
    return <Navigate replace state={loginState} to={loginTarget} />
  }

  if (!role) {
    return <Navigate replace state={loginState} to={loginTarget} />
  }

  if (!canAccess(role, allow)) {
    return <Navigate replace state={loginState} to={loginTarget} />
  }

  return <>{children}</>
}
