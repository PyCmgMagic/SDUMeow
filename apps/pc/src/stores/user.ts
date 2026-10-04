import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { adminAuthApi, statsApi, userApi } from '@/lib/api'
import { isHttpRequestError, resetSessionExpiryHandling } from '@/lib/https'
import {
  clearAdminAuthTokens,
  clearAuthTokens,
  getAuthSessionType,
  getAdminAccessToken,
  getAccessToken,
  saveAdminAuthTokens,
  saveAuthTokens,
} from '@/lib/auth'
import type { LoginParams, UpdateProfileParams, UserInfo } from '@/types'

type AdminAccess = 'unknown' | 'allowed' | 'denied'
type AdminAccessResult = 'allowed' | 'denied' | 'expired' | 'unavailable'

const ADMIN_ROLE_NAMES = new Set(['admin', 'administrator', 'super_admin', 'superadmin'])

export const useUserStore = defineStore('user', () => {
  const token = ref(getAccessToken())
  const adminToken = ref(getAdminAccessToken())
  const userInfo = ref<UserInfo | null>(null)
  const isSessionResolved = ref(!token.value)
  const adminAccess = ref<AdminAccess>('unknown')

  let restorePromise: Promise<boolean> | null = null
  let adminCheckPromise: Promise<AdminAccessResult> | null = null

  const profileHasAdminRole = computed(() => {
    const info = userInfo.value
    if (!info) return false

    const values = [
      info.role,
      info.roleName,
      info.permission,
      ...(info.roles || []),
      ...(info.permissions || []),
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.trim().toLowerCase())

    return values.some((value) => ADMIN_ROLE_NAMES.has(value) || value.includes('管理员'))
  })

  const persistTokens = (accessToken: string, refreshToken?: string) => {
    saveAuthTokens({ accessToken, refreshToken })
    resetSessionExpiryHandling()
    token.value = accessToken
  }

  const persistAdminTokens = (accessToken: string, refreshToken?: string) => {
    saveAdminAuthTokens({ accessToken, refreshToken })
    resetSessionExpiryHandling()
    adminToken.value = accessToken
  }

  const fetchUserInfo = async () => {
    const data = await userApi.getUserInfo()
    userInfo.value = data
    token.value = getAccessToken()
    adminAccess.value = profileHasAdminRole.value ? 'allowed' : 'unknown'
    return data
  }

  const login = async (params: LoginParams) => {
    const result = await userApi.login(params)
    clearAdminAuthTokens()
    adminToken.value = ''
    persistTokens(result.accessToken, result.refreshToken)
    await fetchUserInfo()
    isSessionResolved.value = true
  }

  const adminLogin = async (params: LoginParams) => {
    const result = await adminAuthApi.login(params)
    // Older versions stored admin credentials in the user-token slot.
    clearAuthTokens()
    clearAdminAuthTokens()
    token.value = ''
    adminToken.value = ''
    userInfo.value = null
    persistAdminTokens(result.accessToken, result.refreshToken)
    adminAccess.value = 'allowed'
  }

  const completeSduLogin = async (
    accessToken: string,
    refreshToken?: string,
    scope: 'user' | 'admin' = 'user',
  ) => {
    const sessionType = getAuthSessionType(accessToken)

    if (scope === 'admin') {
      if (sessionType && sessionType !== 'admin') {
        clearAdminAuthTokens()
        adminToken.value = ''
        throw new Error('统一认证当前返回的是用户会话，后端尚未启用管理员统一认证')
      }

      // Unified auth returns the same token pair shape for both entry points.
      // Keep an administrator session isolated so admin APIs never receive a
      // normal-user token and do not bootstrap /users/me on the callback.
      // When the JWT omits session claims, trust the admin-login entry + intent.
      clearAuthTokens()
      token.value = ''
      userInfo.value = null
      persistAdminTokens(accessToken, refreshToken)
      adminAccess.value = 'unknown'
      isSessionResolved.value = true
      return
    }

    if (sessionType === 'admin') {
      clearAuthTokens()
      token.value = ''
      throw new Error('统一认证返回的是管理员会话，请从管理员入口登录')
    }

    clearAdminAuthTokens()
    adminToken.value = ''
    persistTokens(accessToken, refreshToken)

    try {
      await fetchUserInfo()
      isSessionResolved.value = true
    } catch (error) {
      logout()
      throw error
    }
  }

  const restoreSession = async () => {
    token.value = getAccessToken()
    if (!token.value) {
      userInfo.value = null
      isSessionResolved.value = true
      return false
    }

    if (userInfo.value) {
      isSessionResolved.value = true
      return true
    }

    if (!restorePromise) {
      restorePromise = fetchUserInfo()
        .then(() => true)
        .catch(() => {
          token.value = getAccessToken()
          userInfo.value = null
          return false
        })
        .finally(() => {
          isSessionResolved.value = true
          restorePromise = null
        })
    }

    return restorePromise
  }

  const ensureAdminAccess = async () => {
    adminToken.value = getAdminAccessToken()
    token.value = getAccessToken()
    if (!adminToken.value && !token.value) return 'expired' as const
    if (adminAccess.value === 'allowed' || profileHasAdminRole.value) {
      adminAccess.value = 'allowed'
      return 'allowed' as const
    }
    if (adminAccess.value === 'denied') return 'denied' as const

    if (!adminCheckPromise) {
      adminCheckPromise = statsApi.getAdminDashboardStats({ silent: true })
        .then(() => {
          adminAccess.value = 'allowed'
          return 'allowed' as const
        })
        .catch((error: unknown) => {
          if (isHttpRequestError(error)) {
            if (error.status === 401 || error.responseCode === 401) {
              if (adminToken.value) adminLogout()
              else logout()
              return 'expired' as const
            }

            if ((error.status === 403 || error.responseCode === 403) && error.message.includes('会话类型')) {
              // Recover accounts created before admin credentials had their own storage slot.
              if (adminToken.value) adminLogout()
              else logout()
              return 'expired' as const
            }

            if (error.status === 403 || error.responseCode === 403) {
              adminAccess.value = 'denied'
              return 'denied' as const
            }
          }

          return 'unavailable' as const
        })
        .finally(() => {
          adminCheckPromise = null
        })
    }

    return adminCheckPromise
  }

  const logout = () => {
    clearAuthTokens()
    token.value = ''
    userInfo.value = null
    isSessionResolved.value = true
    adminAccess.value = 'unknown'
  }

  const adminLogout = () => {
    clearAdminAuthTokens()
    adminToken.value = ''
    adminAccess.value = 'unknown'
  }

  const logoutAll = () => {
    logout()
    adminLogout()
  }

  const updateProfile = async (params: UpdateProfileParams, avatarKey?: string) => {
    await userApi.updateUserInfo(params)
    if (avatarKey) await userApi.updateAvatar(avatarKey)
    await fetchUserInfo()
  }

  return {
    token,
    adminToken,
    userInfo,
    isSessionResolved,
    profileHasAdminRole,
    login,
    adminLogin,
    completeSduLogin,
    restoreSession,
    ensureAdminAccess,
    logout,
    adminLogout,
    logoutAll,
    fetchUserInfo,
    updateProfile,
  }
})
