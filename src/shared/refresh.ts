import axios from 'axios'
import { getSessionRevision, readAccessToken, readRefreshToken, writeSession, type SessionScope } from './session'

const refreshClient = axios.create({ baseURL: '/api', timeout: 15_000 })
const pending: Record<SessionScope, { revision: number; promise: Promise<string> } | null> = { user: null, admin: null }

export function refreshSession(scope: SessionScope): Promise<string> {
  const revision = getSessionRevision(scope)
  const current = pending[scope]
  if (current?.revision === revision) return current.promise
  const refreshToken = readRefreshToken(scope)
  const accessToken = readAccessToken(scope)
  if (!refreshToken) return Promise.reject(new Error('缺少 refresh token'))

  const promise = refreshClient.post('/users/refresh', undefined, {
    headers: { Authorization: `Bearer ${refreshToken}` },
  }).then(({ data }) => {
    const token = data?.data?.accessToken
    if (![0, 200].includes(data?.code) || typeof token !== 'string' || !token.trim()) {
      throw new Error(data?.msg || data?.message || '刷新登录状态失败')
    }
    // Ignore a refresh response belonging to an account that has logged out
    // or changed while the request was in flight.
    if (getSessionRevision(scope) !== revision || readAccessToken(scope) !== accessToken || readRefreshToken(scope) !== refreshToken) {
      throw new Error('登录会话已变更')
    }
    writeSession(scope, { accessToken: token, refreshToken: data.data.refreshToken || refreshToken }, true)
    return token
  }).finally(() => { if (pending[scope]?.promise === promise) pending[scope] = null })
  pending[scope] = { revision, promise }
  return promise
}
