import { create } from 'zustand'
import type { UserProfile } from '@/types/domain'
import { UserRole } from '@/types/enums'
import { readRefreshToken, subscribeSession, writeSession } from '@shared/session'
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
  role: UserRole | null
  profile: UserProfile | null
  hydrated: boolean
  acceptSession: (payload: { token: string; role: UserRole; profile?: UserProfile | null }) => void
  enterGuest: () => void
  logoutActive: () => void
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

export type AuthState = UserStore

let restorePromise: Promise<boolean> | null = null
let restoreVersion = -1
let userSessionVersion = 0
let adminCheckPromise: Promise<AdminAccessResult> | null = null

const GUEST_KEY = 'meow.session.guest'

function readGuestMode(): boolean {
  if (getAccessToken() || getAdminAccessToken()) return false
  if (localStorage.getItem(GUEST_KEY) === 'true') return true
  try {
    // Only migrate the guest preference; legacy mobile tokens/profiles are
    // never authoritative when the shared session has changed.
    const legacy = JSON.parse(localStorage.getItem('sdu_meow_auth') || 'null')
    return legacy?.state?.role === UserRole.Guest
  } catch {
    return false
  }
}

export const useAuthStore = create<UserStore>()((set, get) => {
  const persistTokens = (accessToken: string, refreshToken?: string) => {
    userSessionVersion += 1
    saveAuthTokens({ accessToken, refreshToken })
    resetSessionExpiryHandling()
    set({ token: accessToken, role: UserRole.User, profile: null, userInfo: null })
  }

  const persistAdminTokens = (accessToken: string, refreshToken?: string) => {
    saveAdminAuthTokens({ accessToken, refreshToken })
    resetSessionExpiryHandling()
    set({ adminToken: accessToken, role: UserRole.Admin, profile: null })
  }

  const fetchUserInfo = async () => {
    const version = userSessionVersion
    const data = await userApi.getUserInfo()
    // A request from the previous account must not repopulate a logged-out or
    // newly logged-in session after its response arrives.
    if (version !== userSessionVersion || !getAccessToken()) throw new Error('登录会话已变更')
    set({
      userInfo: data,
      profile: get().role === UserRole.User ? {
        id: String(data.uid), nickname: data.nickname, avatar: data.avatar,
        studentId: data.sid, campus: String(data.campus), level: data.level,
        currency: data.currency, role: UserRole.User,
      } : get().profile,
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
      ...(get().role === UserRole.User ? { role: null, profile: null } : {}),
    })
  }

  const adminLogout = () => {
    clearAdminAuthTokens()
    set({
      adminToken: '',
      adminAccess: 'unknown',
      ...(get().role === UserRole.Admin ? { role: null, profile: null } : {}),
    })
  }

  return {
    role: getAccessToken() ? UserRole.User : getAdminAccessToken() ? UserRole.Admin :
      readGuestMode() ? UserRole.Guest : null,
    profile: null,
    hydrated: true,
    acceptSession: ({ token, role, profile = null }) => {
      if (role === UserRole.Guest) throw new Error('游客模式不能接入登录会话')
      const scope = role === UserRole.Admin ? 'admin' : 'user'
      userSessionVersion += 1
      if (scope === 'admin') clearAuthTokens()
      else clearAdminAuthTokens()
      writeSession(scope, { accessToken: token, refreshToken: readRefreshToken(scope) || undefined })
      localStorage.removeItem(GUEST_KEY)
      localStorage.removeItem('sdu_meow_auth')
      resetSessionExpiryHandling()
      set({ role, profile, userInfo: null, isSessionResolved: scope === 'admin' })
    },
    enterGuest: () => {
      logout()
      adminLogout()
      localStorage.setItem(GUEST_KEY, 'true')
      localStorage.removeItem('sdu_meow_auth')
      set({ role: UserRole.Guest, profile: null })
    },
    logoutActive: () => {
      if (get().role === UserRole.Admin) adminLogout()
      else logout()
      localStorage.removeItem(GUEST_KEY)
      localStorage.removeItem('sdu_meow_auth')
      set({ role: null, profile: null })
    },
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

      const version = userSessionVersion
      if (!restorePromise || restoreVersion !== version) {
        restoreVersion = version
        restorePromise = fetchUserInfo()
          .then(() => Boolean(get().token && get().userInfo))
          .catch(() => {
            if (version === userSessionVersion) {
              set({ token: getAccessToken(), userInfo: null })
            }
            return false
          })
          .finally(() => {
            if (version === userSessionVersion) set({ isSessionResolved: true })
            if (restoreVersion === version) restorePromise = null
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
      localStorage.removeItem(GUEST_KEY)
      localStorage.removeItem('sdu_meow_auth')
      set({ role: null, profile: null })
    },

    fetchUserInfo,

    updateProfile: async (params: UpdateProfileParams, avatarKey?: string) => {
      await userApi.updateUserInfo(params)
      if (avatarKey) await userApi.updateAvatar(avatarKey)
      await fetchUserInfo()
    },
  }
})

// Token writes from either HTTP client (including refresh and expiry) update
// this same store synchronously, before a newly mounted layout runs its guard.
subscribeSession((scope, accessToken, source) => {
  const state = useAuthStore.getState()
  const role = scope === 'admin' ? UserRole.Admin : UserRole.User
  const previousToken = scope === 'admin' ? state.adminToken : state.token
  const externalChange = source === 'storage' && previousToken !== accessToken
  if (scope === 'user' && (!accessToken || externalChange)) userSessionVersion += 1
  const activate = accessToken && (!previousToken || state.role === role || !state.role || state.role === UserRole.Guest)
  if (accessToken) {
    localStorage.removeItem(GUEST_KEY)
    localStorage.removeItem('sdu_meow_auth')
  }
  useAuthStore.setState({
    ...(scope === 'admin' ? { adminToken: accessToken } : { token: accessToken }),
    ...(activate ? { role } : !accessToken && state.role === role ? { role: null, profile: null } : {}),
    ...(accessToken && (externalChange || (activate && state.role !== role)) ? {
      profile: null,
      ...(scope === 'user' ? { userInfo: null, isSessionResolved: false } : {}),
      adminAccess: 'unknown',
    } : {}),
    ...(!accessToken && scope === 'user' ? { userInfo: null, isSessionResolved: true } : {}),
    ...(!accessToken ? { adminAccess: 'unknown' } : {}),
  })
})
