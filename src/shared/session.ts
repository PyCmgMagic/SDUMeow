/**
 * 统一会话存储 —— 桌面端与移动端共用一份 token 读写实现。
 *
 * 旧版两端各用各的 localStorage key（桌面端 `token`/`refreshToken`，
 * 移动端 `sdu_meow_token`/`sdu_meow_refresh_token`），统一后写入
 * `meow.session.{scope}.*`；读取时按「新 key → 桌面端旧 key → 移动端旧 key」
 * 回退，因此升级前已登录的用户会话不丢，且一端登录后另一端直接可用。
 * 清除时把新旧 key 一并删除，避免残留误导排查。
 *
 * 管理员会话（scope='admin'）与用户会话相互隔离；移动端根据当前路由
 * 和登录角色选择对应 scope，跨视口共享时也不会混用 token。
 */

export type SessionScope = 'user' | 'admin'

export interface SessionTokens {
  accessToken: string
  refreshToken?: string
}

type SessionListener = (scope: SessionScope, accessToken: string, source: 'local' | 'storage') => void
const sessionListeners = new Set<SessionListener>()

export function subscribeSession(listener: SessionListener): () => void {
  sessionListeners.add(listener)
  return () => { sessionListeners.delete(listener) }
}

function notifySession(scope: SessionScope, source: 'local' | 'storage' = 'local'): void {
  const accessToken = readAccessToken(scope)
  for (const listener of sessionListeners) listener(scope, accessToken, source)
}

const NEW_KEY = {
  accessToken: (scope: SessionScope) => `meow.session.${scope}.accessToken`,
  refreshToken: (scope: SessionScope) => `meow.session.${scope}.refreshToken`,
} as const

// 迁移兼容期读取顺序：桌面端旧 key 在前（它先上线）。
const LEGACY_KEYS: Record<SessionScope, { accessToken: string[]; refreshToken: string[] }> = {
  user: {
    accessToken: ['token', 'sdu_meow_token'],
    refreshToken: ['refreshToken', 'sdu_meow_refresh_token'],
  },
  admin: {
    accessToken: ['adminToken'],
    refreshToken: ['adminRefreshToken'],
  },
}

const readFirst = (keys: string[]): string | null => {
  for (const key of keys) {
    const value = localStorage.getItem(key)
    if (value) return value
  }
  return null
}

export function readAccessToken(scope: SessionScope = 'user'): string {
  return readFirst([NEW_KEY.accessToken(scope), ...LEGACY_KEYS[scope].accessToken]) || ''
}

export function readRefreshToken(scope: SessionScope = 'user'): string {
  return readFirst([NEW_KEY.refreshToken(scope), ...LEGACY_KEYS[scope].refreshToken]) || ''
}

export function writeSession(scope: SessionScope, tokens: SessionTokens): void {
  localStorage.setItem(NEW_KEY.accessToken(scope), tokens.accessToken)

  if (tokens.refreshToken) {
    localStorage.setItem(NEW_KEY.refreshToken(scope), tokens.refreshToken)
  } else {
    localStorage.removeItem(NEW_KEY.refreshToken(scope))
  }
  // Remove obsolete credentials so a later refresh/logout cannot fall back to
  // a different account's old token or refresh token.
  for (const key of LEGACY_KEYS[scope].accessToken) localStorage.removeItem(key)
  for (const key of LEGACY_KEYS[scope].refreshToken) localStorage.removeItem(key)
  notifySession(scope)
}

export function clearSession(scope: SessionScope): void {
  localStorage.removeItem(NEW_KEY.accessToken(scope))
  localStorage.removeItem(NEW_KEY.refreshToken(scope))
  for (const key of LEGACY_KEYS[scope].accessToken) localStorage.removeItem(key)
  for (const key of LEGACY_KEYS[scope].refreshToken) localStorage.removeItem(key)
  notifySession(scope)
}

// Browser storage events cover other tabs; writes in this tab notify directly.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.storageArea !== localStorage) return
    for (const scope of ['user', 'admin'] as const) {
      const keys = [NEW_KEY.accessToken(scope), NEW_KEY.refreshToken(scope),
        ...LEGACY_KEYS[scope].accessToken, ...LEGACY_KEYS[scope].refreshToken]
      if (event.key === null || keys.includes(event.key)) notifySession(scope, 'storage')
    }
  })
}
