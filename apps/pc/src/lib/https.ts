import axios from 'axios'
import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { toast } from '@/lib/toast'
import { withAppBasePath, withoutAppBasePath } from '@/lib/appPath'
import type { ApiResponse, RefreshTokenResult } from '@/types'
import {
  clearAdminAuthTokens,
  clearAuthTokens,
  getAdminAccessToken,
  getAdminRefreshToken,
  getAccessToken,
  getRefreshToken,
  saveAdminAuthTokens,
  saveAuthTokens,
} from '@/lib/auth'

type AuthScope = 'user' | 'admin' | 'none'

declare module 'axios' {
  export interface AxiosRequestConfig {
    silent?: boolean
    authScope?: AuthScope
  }

  export interface InternalAxiosRequestConfig {
    silent?: boolean
    _retry?: boolean
    _authScope?: AuthScope
    authScope?: AuthScope
  }
}

export class HttpRequestError extends Error {
  readonly status?: number
  readonly responseCode?: number

  constructor(message: string, options: { status?: number; responseCode?: number } = {}) {
    super(message)
    this.name = 'HttpRequestError'
    this.status = options.status
    this.responseCode = options.responseCode
  }
}

export const isHttpRequestError = (error: unknown): error is HttpRequestError =>
  error instanceof HttpRequestError

const SUCCESS_CODES = new Set([0, 200])
const AUTH_ENDPOINTS = ['/auth/login', '/auth/admin-login', '/admin/login', '/users/login', '/users/refresh']

const service: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

const refreshClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

const refreshPromises: Record<Exclude<AuthScope, 'none'>, Promise<string> | null> = {
  user: null,
  admin: null,
}
const sessionExpiryHandled: Record<Exclude<AuthScope, 'none'>, boolean> = {
  user: false,
  admin: false,
}

export const resetSessionExpiryHandling = () => {
  sessionExpiryHandled.user = false
  sessionExpiryHandled.admin = false
}

const getResponseMessage = (data: unknown) => {
  if (!data || typeof data !== 'object') return ''
  const response = data as Partial<ApiResponse<unknown>>
  return response.msg || response.message || ''
}

const fallbackMessages: Record<number, string> = {
  400: '请求错误(400)',
  401: '未授权，请重新登录(401)',
  403: '权限不足，拒绝访问(403)',
  404: '资源不存在(404)',
  422: '参数校验错误(422)',
  500: '服务器错误(500)',
  502: '后端网关暂时不可用(502)，请稍后重试',
  503: '后端服务暂时不可用(503)，请稍后重试',
  504: '后端网关响应超时(504)，请稍后重试',
}

const getHttpFailureMessage = (status?: number, message = '') =>
  message || (status ? fallbackMessages[status] : '') || '网络连接错误'

const isApiResponse = (data: unknown): data is ApiResponse<unknown> =>
  Boolean(data && typeof data === 'object' && typeof (data as { code?: unknown }).code === 'number')

const isTokenExpiredMessage = (message: string) => {
  const normalized = message.toLowerCase()
  return normalized.includes('token') && (
    normalized.includes('expired') ||
    normalized.includes('过期') ||
    normalized.includes('失效')
  )
}

const isAuthEndpoint = (url?: string) => {
  if (!url) return false
  return AUTH_ENDPOINTS.some((path) => url.includes(path))
}

const isAdminEndpoint = (url?: string) => Boolean(url?.startsWith('/admin/'))

const redirectToLogin = (scope: AuthScope) => {
  const resolvedScope = scope === 'admin' ? 'admin' : 'user'
  if (sessionExpiryHandled[resolvedScope]) return
  sessionExpiryHandled[resolvedScope] = true
  if (resolvedScope === 'admin') clearAdminAuthTokens()
  else clearAuthTokens()

  const loginPath = resolvedScope === 'admin' ? '/admin/login' : '/login'
  const loginUrl = withAppBasePath(loginPath)
  if (window.location.pathname === loginUrl) {
    toast.error('登录已过期，请重新登录')
    return
  }

  const redirect = `${withoutAppBasePath(window.location.pathname)}${window.location.search}${window.location.hash}`
  const query = new URLSearchParams({ expired: '1', redirect })
  window.location.assign(`${loginUrl}?${query.toString()}`)
}

const requestNewAccessToken = async (scope: Exclude<AuthScope, 'none'>) => {
  const refreshToken = scope === 'admin' ? getAdminRefreshToken() : getRefreshToken()
  if (!refreshToken) {
    throw new Error('缺少 refresh token')
  }

  const response = await refreshClient.post<ApiResponse<RefreshTokenResult>>(
    '/users/refresh',
    undefined,
    {
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    },
  )
  const payload = response.data

  if (!SUCCESS_CODES.has(payload.code) || !payload.data?.accessToken) {
    throw new Error(getResponseMessage(payload) || '刷新登录状态失败')
  }

  const tokens = {
    accessToken: payload.data.accessToken,
    refreshToken: payload.data.refreshToken || refreshToken,
  }
  if (scope === 'admin') saveAdminAuthTokens(tokens)
  else saveAuthTokens(tokens)
  return payload.data.accessToken
}

const refreshAccessToken = (scope: Exclude<AuthScope, 'none'>) => {
  if (!refreshPromises[scope]) {
    refreshPromises[scope] = requestNewAccessToken(scope).finally(() => {
      refreshPromises[scope] = null
    })
  }
  return refreshPromises[scope]
}

const retryRequest = async (config: InternalAxiosRequestConfig) => {
  const scope = config._authScope || 'user'
  const refreshToken = scope === 'admin' ? getAdminRefreshToken() : getRefreshToken()
  if (scope === 'none' || config._retry || !refreshToken) {
    redirectToLogin(scope)
    throw new HttpRequestError('登录已过期', { status: 401 })
  }

  config._retry = true

  try {
    const accessToken = await refreshAccessToken(scope)
    config.headers.set('Authorization', `Bearer ${accessToken}`)
    return service.request(config)
  } catch {
    redirectToLogin(scope)
    throw new HttpRequestError('登录已过期', { status: 401 })
  }
}

service.interceptors.request.use(
  (config) => {
    const authEndpoint = isAuthEndpoint(config.url)
    const requestedScope = config.authScope
    // Keep an explicit user scope for authenticated user operations such as email binding.
    const explicitUserRequest = requestedScope === 'user'
    const unauthenticatedRequest = requestedScope === 'none' || (authEndpoint && !explicitUserRequest)
    const adminRequest = (requestedScope === 'admin' || isAdminEndpoint(config.url)) && !authEndpoint
    const adminAccessToken = adminRequest ? getAdminAccessToken() : ''
    const accessToken = unauthenticatedRequest
      ? ''
      : adminRequest
        ? adminAccessToken
        : getAccessToken()
    config._authScope = unauthenticatedRequest ? 'none' : adminRequest ? 'admin' : 'user'
    if (accessToken) {
      config.headers.set('Authorization', `Bearer ${accessToken}`)
    } else {
      config.headers.delete('Authorization')
    }

    if (config.data instanceof FormData) {
      config.headers.delete('Content-Type')
    }
    return config
  },
  (error) => Promise.reject(error),
)

service.interceptors.response.use(
  async (response: AxiosResponse<ApiResponse<unknown>>) => {
    const payload = response.data
    if (!isApiResponse(payload)) {
      const displayMessage = getHttpFailureMessage(response.status)
      if (!response.config.silent && !isAuthEndpoint(response.config.url)) {
        toast.error(displayMessage)
      }
      return Promise.reject(new HttpRequestError(displayMessage, { status: response.status }))
    }
    const message = getResponseMessage(payload)

    if (SUCCESS_CODES.has(payload.code)) {
      const skipMessages = ['success', '成功', '用户信息获取成功', '获取成功', '请求成功']
      if (
        message &&
        !response.config.silent &&
        !skipMessages.some((item) => message.toLowerCase().includes(item.toLowerCase()))
      ) {
        toast.success(message)
      }
      return payload.data as unknown as AxiosResponse
    }

    if (
      (payload.code === 401 || isTokenExpiredMessage(message)) &&
      !isAuthEndpoint(response.config.url)
    ) {
      return retryRequest(response.config)
    }

    if (message && !response.config.silent && !isAuthEndpoint(response.config.url)) {
      toast.error(message)
    }
    return Promise.reject(new HttpRequestError(message || '请求失败', {
      responseCode: payload.code,
    }))
  },
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const status = error.response?.status
    const message = getResponseMessage(error.response?.data)
    const config = error.config

    if (status === 401 && config && !isAuthEndpoint(config.url)) {
      return retryRequest(config)
    }

    const displayMessage = getHttpFailureMessage(status, message)

    if (!config?.silent && !isAuthEndpoint(config?.url)) {
      toast.error(displayMessage)
    }
    return Promise.reject(new HttpRequestError(displayMessage, {
      status,
      responseCode: error.response?.data?.code,
    }))
  },
)

export const http = {
  get<T>(url: string, config?: AxiosRequestConfig) {
    return service.get<ApiResponse<T>, T>(url, config)
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return service.post<ApiResponse<T>, T>(url, data, config)
  },
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return service.put<ApiResponse<T>, T>(url, data, config)
  },
  delete<T>(url: string, config?: AxiosRequestConfig) {
    return service.delete<ApiResponse<T>, T>(url, config)
  },
}
