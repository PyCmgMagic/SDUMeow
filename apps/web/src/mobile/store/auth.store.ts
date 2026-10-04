import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { UserProfile } from '@/types/domain'
import { UserRole } from '@/types/enums'
import { STORAGE_KEYS } from '@/utils/constants'
import { inferRoleFromToken } from '@/utils/auth'
import { readAccessToken } from '@shared/session'

function readSharedSession(state: Pick<AuthState, 'role'>): { token: string; role: UserRole } | null {
  // Keep the role that was active in this viewport when both slots exist. This
  // prevents a desktop user session from replacing an active mobile admin
  // session (and vice versa) merely because both share localStorage.
  if (state.role === UserRole.Admin) {
    const adminToken = readAccessToken('admin')
    if (adminToken) return { token: adminToken, role: UserRole.Admin }
  }
  if (state.role === UserRole.User) {
    const userToken = readAccessToken('user')
    if (userToken) return { token: userToken, role: UserRole.User }
  }

  // Guest mode is an explicit choice. Do not silently promote a guest to an
  // administrator just because another viewport has an admin session.
  if (state.role === UserRole.Guest) return null

  const adminToken = readAccessToken('admin')
  const userToken = readAccessToken('user')
  if (adminToken && !userToken) return { token: adminToken, role: UserRole.Admin }
  if (userToken) return { token: userToken, role: inferRoleFromToken(userToken, UserRole.User) }
  if (adminToken) return { token: adminToken, role: UserRole.Admin }
  return null
}

export type AuthState = {
  token: string | null
  role: UserRole | null
  profile: UserProfile | null
  hydrated: boolean
  login: (payload: { token: string | null; role: UserRole; profile?: UserProfile | null }) => void
  enterGuest: () => void
  logout: () => void
  setHydrated: (hydrated: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      profile: null,
      hydrated: true,
      login: ({ token, role, profile = null }) =>
        set({
          token,
          role,
          profile,
        }),
      enterGuest: () =>
        set({
          token: null,
          role: UserRole.Guest,
          profile: null,
        }),
      logout: () =>
        set({
          token: null,
          role: null,
          profile: null,
        }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: STORAGE_KEYS.auth,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ token, role, profile }) => ({ token, role, profile }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
        // 统一会话（@shared/session）是 token 的权威存储。 User and admin
        // credentials live in separate slots so switching viewport cannot
        // accidentally send an administrator token to user APIs (or reverse).
        if (!state) return
        const sharedSession = readSharedSession(state)
        if (!sharedSession) {
          if (state.token || state.role !== UserRole.Guest) state.logout()
          return
        }
        if (state.token === sharedSession.token && state.role === sharedSession.role) return
        // Token changed in another viewport: discard stale profile data and
        // adopt the session from the matching scope.
        state.login({ token: sharedSession.token, role: sharedSession.role })
      },
    },
  ),
)
