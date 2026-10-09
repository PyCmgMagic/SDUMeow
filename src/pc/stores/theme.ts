import { create } from 'zustand'

export type PublicTheme = 'classic' | 'admin'
export type AdminTheme = 'management' | 'campus'

const PUBLIC_STORAGE_KEY = 'meow-public-theme'
const ADMIN_STORAGE_KEY = 'meow-admin-theme'

const readStoredTheme = (): PublicTheme => {
  if (typeof window === 'undefined') return 'classic'
  return window.localStorage.getItem(PUBLIC_STORAGE_KEY) === 'admin' ? 'admin' : 'classic'
}

const readStoredAdminTheme = (): AdminTheme => {
  if (typeof window === 'undefined') return 'management'
  return window.localStorage.getItem(ADMIN_STORAGE_KEY) === 'campus' ? 'campus' : 'management'
}

interface ThemeStore {
  publicTheme: PublicTheme
  adminTheme: AdminTheme
  setPublicTheme: (theme: PublicTheme) => void
  setAdminTheme: (theme: AdminTheme) => void
}

export const useThemeStore = create<ThemeStore>()((set) => ({
  publicTheme: readStoredTheme(),
  adminTheme: readStoredAdminTheme(),

  setPublicTheme: (theme) => {
    window.localStorage.setItem(PUBLIC_STORAGE_KEY, theme)
    set({ publicTheme: theme })
  },

  setAdminTheme: (theme) => {
    window.localStorage.setItem(ADMIN_STORAGE_KEY, theme)
    set({ adminTheme: theme })
  },
}))
