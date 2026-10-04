import type { AuthTokens } from '@/types'

const ACCESS_TOKEN_KEY = 'token'
const REFRESH_TOKEN_KEY = 'refreshToken'
const ADMIN_ACCESS_TOKEN_KEY = 'adminToken'
const ADMIN_REFRESH_TOKEN_KEY = 'adminRefreshToken'

const AUTH_ORIGIN = (
  import.meta.env.VITE_AUTH_ORIGIN ||
  import.meta.env.VITE_API_PROXY_TARGET ||
  'https://meow.sduonline.cn'
).replace(/\/+$/, '')

// Apifox documents authentication below the API base path, while the CAS
// redirect must bypass the local Vite proxy to preserve the backend cookie.
const AUTH_BASE = AUTH_ORIGIN.endsWith('/api') ? AUTH_ORIGIN : `${AUTH_ORIGIN}/api`

export const getSduAuthUrl = (scope: 'user' | 'admin') =>
  `${AUTH_BASE}/auth/${scope === 'admin' ? 'admin-login' : 'login'}`

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY) || ''

export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY) || ''

export const getAdminAccessToken = () => localStorage.getItem(ADMIN_ACCESS_TOKEN_KEY) || ''

export const getAdminRefreshToken = () => localStorage.getItem(ADMIN_REFRESH_TOKEN_KEY) || ''

const AUTH_INTENT_KEY = 'meowAuthIntent'

export type AuthIntent = 'user' | 'admin'

export const setAuthIntent = (intent: AuthIntent, redirect?: string) => {
  const fallback = intent === 'admin' ? '/admin/dashboard' : '/'
  const candidate = typeof redirect === 'string' ? redirect : fallback
  const safeRedirect = candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : fallback
  const resolvedRedirect = intent === 'admin' && !safeRedirect.startsWith('/admin')
    ? fallback
    : safeRedirect

  sessionStorage.setItem('authRedirect', resolvedRedirect)
  localStorage.setItem(AUTH_INTENT_KEY, intent)
}

export const peekAuthIntent = (): AuthIntent | '' => {
  const value = localStorage.getItem(AUTH_INTENT_KEY)
  return value === 'admin' || value === 'user' ? value : ''
}

export const clearAuthIntent = () => {
  localStorage.removeItem(AUTH_INTENT_KEY)
}

const readJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const parsed = JSON.parse(atob(padded))
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

const normalizeSessionClaim = (value: unknown) => {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

// Routing guard only. Backend still enforces administrator authorization.
// Live CAS cookies use mode=admin|user; JWT samples may expose sessionType or mode.
export const getAuthSessionType = (token: string) => {
  const parsed = readJwtPayload(token)
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
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

export const clearAuthTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem('userInfo')
}

export const saveAdminAuthTokens = ({ accessToken, refreshToken }: AuthTokens) => {
  localStorage.setItem(ADMIN_ACCESS_TOKEN_KEY, accessToken)

  if (refreshToken) {
    localStorage.setItem(ADMIN_REFRESH_TOKEN_KEY, refreshToken)
  } else {
    localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY)
  }
}

export const clearAdminAuthTokens = () => {
  localStorage.removeItem(ADMIN_ACCESS_TOKEN_KEY)
  localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY)
}
