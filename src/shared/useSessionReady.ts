import { useEffect, useState } from 'react'
import { useAuthStore } from './auth.store'
import { isJwtExpired } from './jwt'

export function useSessionReady() {
  const role = useAuthStore((state) => state.role)
  const token = useAuthStore((state) => state.role === 'admin' ? state.adminToken : state.token)
  const ensureSession = useAuthStore((state) => state.ensureSession)
  const expired = Boolean(token && isJwtExpired(token))
  const [checking, setChecking] = useState(expired)

  useEffect(() => {
    if (!expired || role === 'guest') { setChecking(false); return }
    let active = true
    setChecking(true)
    void ensureSession().finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [ensureSession, expired, role, token])

  return !expired && !checking
}
