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
import type { SessionScope } from '@shared/session'

type RetriableRequestConfig<TBody = unknown> = ApiRequestConfig<TBody> & {
  _retry?: boolean
  _skipAuthRefresh?: boolean
  _authScope?: SessionScope
}

type TokenPair = {
  accessToken?: string
  refreshToken?: string
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

function pickTokens(payload: unknown): TokenPair {
  const data = asRecord(payload)
  return {
    accessToken: asString(data.accessToken || data.token || data.meowToken),
    refreshToken: asString(data.refreshToken || data.meowRefreshToken),
  }
}

async function refreshAccessToken(scope: SessionScope): Promise<string | null> {
  const currentRefreshToken = storage.getRefreshToken(scope)
  if (!currentRefreshToken) {
    return null
  }

  const response = await httpClient.request<ApiResult<unknown>>({
    method: 'POST',
    url: '/users/refresh',
    authScope: scope,
    _skipAuthRefresh: true,
  } as RetriableRequestConfig)
  const tokens = pickTokens(response.data.data)
  const nextAccessToken = tokens.accessToken?.trim()
  if (!nextAccessToken) {
    return null
  }

  storage.setTokens(
    {
      token: nextAccessToken,
      refreshToken: tokens.refreshToken?.trim() || currentRefreshToken,
    },
    scope,
  )

  return nextAccessToken
}

httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    response.data = normalizeApiEnvelope(response.data)
    return response
  },
  async (error) => {
    const originalConfig = error?.config as RetriableRequestConfig | undefined
    const scope = resolveAuthScope(originalConfig)
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
        const nextAccessToken = await refreshAccessToken(scope)
        if (nextAccessToken) {
          originalConfig.headers = originalConfig.headers ?? {}
          originalConfig.headers.Authorization = `Bearer ${nextAccessToken}`
          return httpClient.request(originalConfig)
        }
      } catch {
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
