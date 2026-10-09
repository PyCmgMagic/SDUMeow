import axios, { type AxiosResponse } from 'axios'

import { normalizeApiEnvelope } from './adapters/normalize'
import { toApiError } from './adapters/errors'

import { useAuthStore } from '@/store'
import type { ApiResult, ApiRequestConfig } from '@/types/api'
import { STORAGE_KEYS } from '@/utils/constants'
import { resolveApiBaseUrl } from '@/utils/baseUrls'
import { asRecord, asString } from '@/utils/format'
import { storage } from '@/utils/storage'
import { isAppPath, withAppBasePath } from '@/utils/appPath'
import { UserRole } from '@/types/enums'
import { getSessionRevision, type SessionScope } from '@shared/session'
import { refreshSession } from '@shared/refresh'
import { queryClient } from '@shared/queryClient'

type RetriableRequestConfig<TBody = unknown> = ApiRequestConfig<TBody> & {
  _retry?: boolean
  _skipAuthRefresh?: boolean
  _authScope?: SessionScope
  _sessionRevision?: number
}

function isRefreshRequest(url?: string): boolean {
  if (!url) return false
  return url === '/users/refresh' || url.endsWith('/users/refresh')
}

function isAdminRequest(url?: string): boolean {
  if (!url) return false
  const path = url.split('?')[0]
  return path === '/admin' || path.startsWith('/admin/')
}

function resolveAuthScope(config?: RetriableRequestConfig): SessionScope {
  if (config?._authScope) return config._authScope
  if (config?.authScope) return config.authScope
  if (isAdminRequest(config?.url)) return 'admin'
  return useAuthStore.getState().role === UserRole.Admin ? 'admin' : 'user'
}

export const httpClient = axios.create({
  baseURL: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
  timeout: 15_000,
})

let sessionLoginRedirecting = false

httpClient.interceptors.request.use((config) => {
  const retriableConfig = config as RetriableRequestConfig
  const scope = resolveAuthScope(retriableConfig)
  retriableConfig._authScope = scope
  retriableConfig._sessionRevision ??= getSessionRevision(scope)
  if (retriableConfig._sessionRevision !== getSessionRevision(scope)) throw new axios.CanceledError('登录会话已变更')
  const token = storage.getToken(scope)
  const refreshToken = storage.getRefreshToken(scope)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (refreshToken && isRefreshRequest(config.url)) {
    config.headers['X-Refresh-Token'] = refreshToken
    config.headers['Refresh-Token'] = refreshToken
    config.headers['Meow-Refresh-Token'] = refreshToken
  }
  return config
})

function clearSession(scope: SessionScope) {
  const state = useAuthStore.getState()
  if (scope === 'admin') state.adminLogout()
  else state.logout()
}

function markLoginNotice() {
  try {
    window.sessionStorage.setItem(STORAGE_KEYS.authLoginNotice, '请登录使用功能')
  } catch {
    // Ignore storage failures; the login page can still render normally.
  }
}

function getResponseMessage(error: unknown): string {
  const payload = asRecord(asRecord(error).response ? asRecord(asRecord(error).response).data : undefined)
  return asString(payload.message || payload.msg, '')
}

function shouldPromptRelogin(error: unknown): boolean {
  const response = asRecord(asRecord(error).response)
  const status = response.status
  const message = getResponseMessage(error).toLowerCase()

  return (
    status === 403 &&
    (message.includes('token') ||
      message.includes('过期') ||
      message.includes('expired') ||
      message.includes('登录') ||
      message.includes('认证'))
  )
}

function promptRelogin(scope: SessionScope) {
  if (sessionLoginRedirecting) return

  sessionLoginRedirecting = true
  markLoginNotice()
  clearSession(scope)
  const loginPath = scope === 'admin' ? '/admin/login' : '/login'
  if (!isAppPath(window.location.pathname, loginPath)) {
    window.location.replace(withAppBasePath(loginPath))
  }
}

httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const config = response.config as RetriableRequestConfig
    if (config._sessionRevision !== getSessionRevision(resolveAuthScope(config))) throw new axios.CanceledError('登录会话已变更')
    response.data = normalizeApiEnvelope(response.data)
    if ([0, 200].includes(response.data.code) && config.method && !['get', 'head'].includes(config.method) && !isRefreshRequest(config.url)) {
      void queryClient.invalidateQueries({ refetchType: 'none' })
    }
    return response
  },
  async (error) => {
    const originalConfig = error?.config as RetriableRequestConfig | undefined
    const scope = resolveAuthScope(originalConfig)
    if (originalConfig && originalConfig._sessionRevision !== getSessionRevision(scope)) return Promise.reject(new axios.CanceledError('登录会话已变更'))
    const activeToken = storage.getToken(scope)

    if (
      error?.response?.status === 401 &&
      activeToken &&
      originalConfig &&
      !originalConfig._retry &&
      !originalConfig._skipAuthRefresh
    ) {
      originalConfig._retry = true

      try {
        const nextAccessToken = await refreshSession(scope)
        if (nextAccessToken) {
          originalConfig.headers = originalConfig.headers ?? {}
          originalConfig.headers.Authorization = `Bearer ${nextAccessToken}`
          return httpClient.request(originalConfig)
        }
      } catch {
        if (originalConfig._sessionRevision !== getSessionRevision(scope)) return Promise.reject(new axios.CanceledError('登录会话已变更'))
        // Fall through to the normal logout path below.
      }
    }

    if (error?.response?.status === 401 && activeToken) {
      markLoginNotice()
      clearSession(scope)
      const loginPath = scope === 'admin' ? '/admin/login' : '/login'
      if (!isAppPath(window.location.pathname, loginPath)) {
        window.location.replace(withAppBasePath(loginPath))
      }
    }

    if (activeToken && shouldPromptRelogin(error)) {
      promptRelogin(scope)
    }

    return Promise.reject(toApiError(error))
  },
)

export async function apiRequest<TData = unknown, TBody = unknown>(
  config: ApiRequestConfig<TBody>,
): Promise<ApiResult<TData>> {
  const response = await httpClient.request<ApiResult<TData>>(config)
  return response.data
}
