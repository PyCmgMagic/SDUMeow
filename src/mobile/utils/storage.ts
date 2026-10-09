import {
  clearSession,
  readAccessToken,
  readRefreshToken,
  writeSession,
} from '@shared/session'
import type { SessionScope } from '@shared/session'

// Token 读写已统一到 @shared/session（与桌面端共用同一份会话）。
// 本对象保留移动端原有签名，页面与 API 客户端无需改动。

export const storage = {
  getToken(scope: SessionScope = 'user') {
    return readAccessToken(scope) || null
  },
  setToken(token: string, scope: SessionScope = 'user') {
    writeSession(scope, { accessToken: token, refreshToken: readRefreshToken(scope) || undefined })
  },
  getRefreshToken(scope: SessionScope = 'user') {
    return readRefreshToken(scope) || null
  },
  setRefreshToken(token: string, scope: SessionScope = 'user') {
    writeSession(scope, { accessToken: readAccessToken(scope), refreshToken: token })
  },
  setTokens(tokens: { token?: string | null; refreshToken?: string | null }, scope: SessionScope = 'user') {
    writeSession(scope, {
      accessToken: tokens.token || readAccessToken(scope),
      refreshToken: tokens.refreshToken || readRefreshToken(scope) || undefined,
    })
  },
  clearToken(scope: SessionScope = 'user') {
    clearSession(scope)
  },
}
