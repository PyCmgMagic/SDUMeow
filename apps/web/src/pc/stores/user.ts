import { create } from 'zustand'
import { adminAuthApi, statsApi, userApi } from '@pc/lib/api'
import { isHttpRequestError, resetSessionExpiryHandling } from '@pc/lib/https'
import {
  clearAdminAuthTokens,
  clearAuthTokens,
  getAuthSessionType,
  getAdminAccessToken,
  getAccessToken,
  saveAdminAuthTokens,
  saveAuthTokens,
} from '@pc/lib/auth'
import type { LoginParams, UpdateProfileParams, UserInfo } from '@pc/types'

type AdminAccess = 'unknown' | 'allowed' | 'denied'
type AdminAccessResult = 'allowed' | 'denied' | 'expired' | 'unavailable'

const ADMIN_ROLE_NAMES = new Set(['admin', 'administrator', 'super_admin', 'superadmin'])

const profileHasAdminRoleOf = (info: UserInfo | null) => {
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
}

interface UserStore {
  token: string
  adminToken: string
  userInfo: UserInfo | null
  isSessionResolved: boolean
  adminAccess: AdminAccess
  profileHasAdminRole: () => boolean
  login: (params: LoginParams) => Promise<void>
  adminLogin: (params: LoginParams) => Promise<void>
  completeSduLogin: (accessToken: string, refreshToken?: string, scope?: 'user' | 'admin') => Promise<void>
  restoreSession: () => Promise<boolean>
  ensureAdminAccess: () => Promise<AdminAccessResult>
  logout: () => void
  adminLogout: () => void
  logoutAll: () => void
  fetchUserInfo: () => Promise<UserInfo>
  updateProfile: (params: UpdateProfileParams, avatarKey?: string) => Promise<void>
}

let restorePromise: Promise<boolean> | null = null
let adminCheckPromise: Promise<AdminAccessResult> | null = null

export const useUserStore = create<UserStore>()((set, get) => {
  const persistTokens = (accessToken: string, refreshToken?: string) => {
    saveAuthTokens({ accessToken, refreshToken })
    resetSessionExpiryHandling()
    set({ token: accessToken })
  }

  const persistAdminTokens = (accessToken: string, refreshToken?: string) => {
    saveAdminAuthTokens({ accessToken, refreshToken })
    resetSessionExpiryHandling()
    set({ adminToken: accessToken })
  }

  const fetchUserInfo = async () => {
    const data = await userApi.getUserInfo()
    set({
      userInfo: data,
      token: getAccessToken(),
      adminAccess: profileHasAdminRoleOf(data) ? 'allowed' : 'unknown',
    })
    return data
  }

  const login = async (params: LoginParams) => {
    const result = await userApi.login(params)
    clearAdminAuthTokens()
    set({ adminToken: '' })
    persistTokens(result.accessToken, result.refreshToken)
    await fetchUserInfo()
    set({ isSessionResolved: true })
  }

  const adminLogin = async (params: LoginParams) => {
    const result = await adminAuthApi.login(params)
    // Older versions stored admin credentials in the user-token slot.
    clearAuthTokens()
    clearAdminAuthTokens()
    set({
      token: '',
      adminToken: '',
      userInfo: null,
    })
    persistAdminTokens(result.accessToken, result.refreshToken)
    set({ adminAccess: 'allowed' })
  }

  const logout = () => {
    clearAuthTokens()
    set({
      token: '',
      userInfo: null,
      isSessionResolved: true,
      adminAccess: 'unknown',
    })
  }

  const adminLogout = () => {
    clearAdminAuthTokens()
    set({
      adminToken: '',
      adminAccess: 'unknown',
    })
  }

  return {
    token: getAccessToken(),
    adminToken: getAdminAccessToken(),
    userInfo: null,
    isSessionResolved: !getAccessToken(),
    adminAccess: 'unknown',
    profileHasAdminRole: () => profileHasAdminRoleOf(get().userInfo),

    login,

    adminLogin,

    completeSduLogin: async (
      accessToken: string,
      refreshToken?: string,
      scope: 'user' | 'admin' = 'user',
    ) => {
      const sessionType = getAuthSessionType(accessToken)

      if (scope === 'admin') {
        if (sessionType && sessionType !== 'admin') {
          clearAdminAuthTokens()
          set({ adminToken: '' })
          throw new Error('统一认证当前返回的是用户会话，后端尚未启用管理员统一认证')
        }

        // Unified auth returns the same token pair shape for both entry points.
        // Keep an administrator session isolated so admin APIs never receive a
        // normal-user token and do not bootstrap /users/me on the callback.
        // When the JWT omits session claims, trust the admin-login entry + intent.
        clearAuthTokens()
        set({ token: '', userInfo: null })
        persistAdminTokens(accessToken, refreshToken)
        set({
          adminAccess: 'unknown',
          isSessionResolved: true,
        })
        return
      }

      if (sessionType === 'admin') {
        clearAuthTokens()
        set({ token: '' })
        throw new Error('统一认证返回的是管理员会话，请从管理员入口登录')
      }

      clearAdminAuthTokens()
      set({ adminToken: '' })
      persistTokens(accessToken, refreshToken)

      try {
        await fetchUserInfo()
        set({ isSessionResolved: true })
      } catch (error) {
        logout()
        throw error
      }
    },

    restoreSession: async () => {
      set({ token: getAccessToken() })
      if (!get().token) {
        set({
          userInfo: null,
          isSessionResolved: true,
        })
        return false
      }

      if (get().userInfo) {
        set({ isSessionResolved: true })
        return true
      }

      if (!restorePromise) {
        restorePromise = fetchUserInfo()
          .then(() => true)
          .catch(() => {
            set({
              token: getAccessToken(),
              userInfo: null,
            })
            return false
          })
          .finally(() => {
            set({ isSessionResolved: true })
            restorePromise = null
          })
      }

      return restorePromise
    },

    ensureAdminAccess: async (): Promise<AdminAccessResult> => {
      set({
        adminToken: getAdminAccessToken(),
        token: getAccessToken(),
      })
      const { adminToken, token, adminAccess } = get()
      if (!adminToken && !token) return 'expired'
      if (adminAccess === 'allowed' || profileHasAdminRoleOf(get().userInfo)) {
        set({ adminAccess: 'allowed' })
        return 'allowed'
      }
      if (adminAccess === 'denied') return 'denied'

      if (!adminCheckPromise) {
        adminCheckPromise = statsApi.getAdminDashboardStats({ silent: true })
          .then(() => {
            set({ adminAccess: 'allowed' })
            return 'allowed' as const
          })
          .catch((error: unknown) => {
            if (isHttpRequestError(error)) {
              if (error.status === 401 || error.responseCode === 401) {
                if (get().adminToken) adminLogout()
                else logout()
                return 'expired' as const
              }

              if ((error.status === 403 || error.responseCode === 403) && error.message.includes('会话类型')) {
                // Recover accounts created before admin credentials had their own storage slot.
                if (get().adminToken) adminLogout()
                else logout()
                return 'expired' as const
              }

              if (error.status === 403 || error.responseCode === 403) {
                set({ adminAccess: 'denied' })
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
    },

    logout,

    adminLogout,

    logoutAll: () => {
      logout()
      adminLogout()
    },

    fetchUserInfo,

    updateProfile: async (params: UpdateProfileParams, avatarKey?: string) => {
      await userApi.updateUserInfo(params)
      if (avatarKey) await userApi.updateAvatar(avatarKey)
      await fetchUserInfo()
    },
  }
})
