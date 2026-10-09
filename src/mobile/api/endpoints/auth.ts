import { apiRequest } from '@/api/client'
import type { ApiResult } from '@/types/api'
import { resolveApiBaseUrl } from '@/utils/baseUrls'
import { asRecord, asString } from '@/utils/format'

export type AuthLoginPayload = {
  email: string
  password: string
}

export type AuthRegisterPayload = {
  email: string
  password: string
  code: string
}

export type SendVerificationCodePayload = {
  email: string
}

export type ChangePasswordPayload = {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

export type ForgotPasswordPayload = {
  email: string
  code: string
  newPassword: string
  confirmPassword: string
}

export type AuthLoginData = {
  accessToken?: string
  refreshToken?: string
  email?: string
}

export type AuthRedirectParams = {
  platform?: string
}

export type AuthExchangePayload = {
  loginCode: string
}

/** 新契约：用 CAS 回调携带的一次性 login_code 换取令牌。 */
export function exchangeAuthCode(payload: AuthExchangePayload): Promise<ApiResult<AuthLoginData>> {
  return apiRequest({
    method: 'POST',
    url: '/auth/exchange',
    data: payload,
  })
}

export function buildAuthLoginUrl(params: AuthRedirectParams = {}): string {
  // 基地址可能配置为相对路径（如 /api，见 .env.example），此时以当前源为 base；
  // 绝对基地址（生产默认）时第二参数会被 URL 忽略。
  const url = new URL(`${resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL)}/auth/login`, window.location.origin)
  if (params.platform) {
    url.searchParams.set('platform', params.platform)
  }
  return url.toString()
}

export function buildAuthAdminLoginUrl(params: AuthRedirectParams = {}): string {
  const url = new URL(`${resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL)}/auth/admin-login`, window.location.origin)
  if (params.platform) {
    url.searchParams.set('platform', params.platform)
  }
  return url.toString()
}

export function getAuthTokens(data: unknown): { accessToken: string; refreshToken: string } {
  const record = asRecord(data)
  return {
    accessToken: asString(record.accessToken || record.token || record.meowToken).trim(),
    refreshToken: asString(record.refreshToken || record.meowRefreshToken).trim(),
  }
}

export function login(payload: AuthLoginPayload): Promise<ApiResult<AuthLoginData>> {
  return apiRequest({
    method: 'POST',
    url: '/users/login',
    authScope: 'user',
    data: payload,
  })
}

export function adminLogin(payload: AuthLoginPayload): Promise<ApiResult<AuthLoginData>> {
  return apiRequest({
    method: 'POST',
    url: '/admin/login',
    authScope: 'admin',
    data: payload,
  })
}

export function register(payload: AuthRegisterPayload): Promise<ApiResult<Record<string, unknown>>> {
  return apiRequest({
    method: 'POST',
    url: '/users/register',
    authScope: 'user',
    data: payload,
  })
}

export function sendVerificationCode(payload: SendVerificationCodePayload): Promise<ApiResult<Record<string, unknown>>> {
  return apiRequest({
    method: 'POST',
    url: '/users/send-verification-code',
    authScope: 'user',
    data: payload,
  })
}

export function changePassword(payload: ChangePasswordPayload): Promise<ApiResult<Record<string, unknown>>> {
  return apiRequest({
    method: 'POST',
    url: '/users/change-password',
    authScope: 'user',
    data: payload,
  })
}

export function forgotPassword(payload: ForgotPasswordPayload): Promise<ApiResult<Record<string, unknown>>> {
  return apiRequest({
    method: 'POST',
    url: '/users/change-password',
    authScope: 'user',
    data: payload,
  })
}
