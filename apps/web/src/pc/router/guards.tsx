import { useEffect, useState, type PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useUserStore } from '@pc/stores/user'

/**
 * 桌面端登录守卫。等价移植自统一路由前的 requireUserLoader：
 * 未恢复出会话时跳转 /login 并携带 redirect 参数，解析期间不渲染内容。
 */
export function RequirePcUser({ children }: PropsWithChildren) {
  const restoreSession = useUserStore((state) => state.restoreSession)
  const location = useLocation()
  const [phase, setPhase] = useState<'pending' | 'allowed' | 'denied'>('pending')

  useEffect(() => {
    let alive = true
    void restoreSession().then((ok) => {
      if (alive) setPhase(ok ? 'allowed' : 'denied')
    })
    return () => {
      alive = false
    }
  }, [restoreSession])

  if (phase === 'pending') return null
  if (phase === 'denied') {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)
    return <Navigate replace to={`/login?redirect=${redirect}`} />
  }
  return <>{children}</>
}

type AdminAccess = 'pending' | 'allowed' | 'expired' | 'denied' | 'unavailable'

/**
 * 桌面端管理员守卫。等价移植自统一路由前的 requireAdminLoader：
 * expired 跳 /admin/login、denied 跳 /forbidden，unavailable 放行（与原 loader 一致）。
 */
export function RequirePcAdmin({ children }: PropsWithChildren) {
  const ensureAdminAccess = useUserStore((state) => state.ensureAdminAccess)
  const location = useLocation()
  const [phase, setPhase] = useState<AdminAccess>('pending')

  useEffect(() => {
    let alive = true
    void ensureAdminAccess().then((result) => {
      if (alive) setPhase(result)
    })
    return () => {
      alive = false
    }
  }, [ensureAdminAccess])

  if (phase === 'pending') return null

  if (phase === 'expired') {
    const redirect = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)
    return <Navigate replace to={`/admin/login?redirect=${redirect}`} />
  }
  if (phase === 'denied') {
    const from = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)
    return <Navigate replace to={`/forbidden?from=${from}`} />
  }
  // allowed 与 unavailable 都放行（原 loader 对 unavailable 返回 null 直接渲染）。
  return <>{children}</>
}
