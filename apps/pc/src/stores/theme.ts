import { ref } from 'vue'
import { defineStore } from 'pinia'

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

export const useThemeStore = defineStore('theme', () => {
  const publicTheme = ref<PublicTheme>(readStoredTheme())
  const adminTheme = ref<AdminTheme>(readStoredAdminTheme())

  const setPublicTheme = (theme: PublicTheme) => {
    publicTheme.value = theme
    window.localStorage.setItem(PUBLIC_STORAGE_KEY, theme)
  }

  const setAdminTheme = (theme: AdminTheme) => {
    adminTheme.value = theme
    window.localStorage.setItem(ADMIN_STORAGE_KEY, theme)
  }

  return { publicTheme, adminTheme, setPublicTheme, setAdminTheme }
})
