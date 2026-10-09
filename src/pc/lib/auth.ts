import type { AuthTokens } from '@pc/types'
import {
  clearSession,
  readAccessToken,
  readRefreshToken,
  writeSession,
} from '@shared/session'
import { getJwtPayload } from '@shared/jwt'
import { safeAuthRedirect } from '@shared/authRedirect'

// Token 读写已统一到 @shared/session：桌面端与移动端共享同一份会话，
// 旧的 token/refreshToken/adminToken key 在读取时自动兼容迁移。

const AUTH_ORIGIN = (
  import.meta.env.VITE_AUTH_ORIGIN ||
  import.meta.env.VITE_API_PROXY_TARGET ||
  (typeof window === 'undefined' ? '' : window.location.origin)
).replace(/\/+$/, '')

// Apifox documents authentication below the API base path, while the CAS
// redirect must bypass the local Vite proxy to preserve the backend cookie.
const AUTH_BASE = AUTH_ORIGIN.endsWith('/api') ? AUTH_ORIGIN : `${AUTH_ORIGIN}/api`

// 新契约（/auth/exchange）：CAS 回调只携带一次性 login_code，前端用它换取令牌；
// 旧后端则直接回传 meow_token——两端回调处理均兼容两种形态。
export const buildAuthExchangeUrl = () => `${AUTH_BASE}/auth/exchange`

export const getSduAuthUrl = (scope: 'user' | 'admin') =>
  scope === 'admin'
    ? `${AUTH_BASE}/auth/admin-login`
    : `${AUTH_BASE}/auth/login?platform=web`

export const getAccessToken = () => readAccessToken('user')

export const getRefreshToken = () => readRefreshToken('user')

export const getAdminAccessToken = () => readAccessToken('admin')

export const getAdminRefreshToken = () => readRefreshToken('admin')

const AUTH_INTENT_KEY = 'meowAuthIntent'

export type AuthIntent = 'user' | 'admin'

export const setAuthIntent = (intent: AuthIntent, redirect?: string) => {
  const fallback = intent === 'admin' ? '/admin/dashboard' : '/'
  const candidate = typeof redirect === 'string' ? redirect : fallback
  const safeRedirect = safeAuthRedirect(candidate, fallback)
  const resolvedRedirect = intent === 'admin' && !safeRedirect.startsWith('/admin')
    ? fallback
    : safeRedirect

  sessionStorage.setItem('authRedirect', resolvedRedirect)
  sessionStorage.setItem(AUTH_INTENT_KEY, intent)
  localStorage.setItem(AUTH_INTENT_KEY, intent)
}

export const peekAuthIntent = (): AuthIntent | '' => {
  const value = sessionStorage.getItem(AUTH_INTENT_KEY) || localStorage.getItem(AUTH_INTENT_KEY)
  return value === 'admin' || value === 'user' ? value : ''
}

export const clearAuthIntent = () => {
  sessionStorage.removeItem(AUTH_INTENT_KEY)
  localStorage.removeItem(AUTH_INTENT_KEY)
}

const normalizeSessionClaim = (value: unknown) => {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

// Routing guard only. Backend still enforces administrator authorization.
// Live CAS cookies use mode=admin|user; JWT samples may expose sessionType or mode.
export const getAuthSessionType = (token: string) => {
  const parsed = getJwtPayload(token)
  if (!parsed) return ''

  const candidates = [
    parsed.sessionType,
    parsed.session_type,
    parsed.mode,
    parsed.tokenType,
    parsed.token_type,
    parsed.typ,
  ].map(normalizeSessionClaim)

  if (candidates.some((value) => value === 'admin' || value.includes('admin'))) return 'admin'
  if (candidates.some((value) => value === 'user')) return 'user'
  return ''
}

export const isAdminAuthToken = (token: string) => getAuthSessionType(token) === 'admin'

export const saveAuthTokens = ({ accessToken, refreshToken }: AuthTokens) => {
  writeSession('user', { accessToken, refreshToken })
}

export const clearAuthTokens = () => {
  clearSession('user')
  localStorage.removeItem('userInfo')
}

export const saveAdminAuthTokens = ({ accessToken, refreshToken }: AuthTokens) => {
  writeSession('admin', { accessToken, refreshToken })
}

export const clearAdminAuthTokens = () => {
  clearSession('admin')
}
