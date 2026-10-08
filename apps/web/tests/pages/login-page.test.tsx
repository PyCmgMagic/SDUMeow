import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MobileLayout as LoginPage } from '../../src/pages/login/MobileLayout'
import { useAuthStore } from '@/store'
import { UserRole } from '@/types/enums'
import { STORAGE_KEYS } from '@/utils/constants'
import { storage } from '@/utils/storage'

const authApiMocks = vi.hoisted(() => ({
  buildAuthLoginUrl: vi.fn(() => 'https://meow.test/auth/login'),
  buildAuthAdminLoginUrl: vi.fn(() => 'https://meow.test/auth/admin-login'),
  login: vi.fn(),
  adminLogin: vi.fn(),
}))

const routerMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}))

vi.mock('@/api/endpoints/auth', async () => ({
  ...await vi.importActual('@/api/endpoints/auth'),
  buildAuthLoginUrl: authApiMocks.buildAuthLoginUrl,
  buildAuthAdminLoginUrl: authApiMocks.buildAuthAdminLoginUrl,
  login: authApiMocks.login,
  adminLogin: authApiMocks.adminLogin,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => routerMocks.navigate,
  }
})

function renderLoginPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  const originalAssign = window.location.assign

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_MOCK', '0')
    useAuthStore.setState({ token: null, role: null, profile: null, hydrated: true })
    localStorage.clear()
    sessionStorage.clear()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign: vi.fn() },
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign: originalAssign },
    })
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('starts unified auth from the user login endpoint', () => {
    renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: /山东大学统一认证登录/ }))

    expect(authApiMocks.buildAuthLoginUrl).toHaveBeenCalledWith({ platform: 'mobile' })
    expect(window.location.assign).toHaveBeenCalledWith('https://meow.test/auth/login')
  })

  it('starts admin unified auth from the admin login endpoint', () => {
    renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: /管理员登录/ }))

    expect(authApiMocks.buildAuthAdminLoginUrl).toHaveBeenCalledWith({ platform: 'mobile' })
    expect(window.location.assign).toHaveBeenCalledWith('https://meow.test/auth/admin-login')
  })

  it('enters guest mode without storing a token', () => {
    renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: '游客访问' }))

    expect(localStorage.getItem(STORAGE_KEYS.token)).toBeNull()
    expect(useAuthStore.getState().role).toBe(UserRole.Guest)
    expect(routerMocks.navigate).toHaveBeenCalledWith('/', { replace: true })
  })

  it.each([
    ['user', '普通用户', '/', UserRole.User],
    ['admin', '管理员', '/admin/dashboard', UserRole.Admin],
  ] as const)('logs in the Mock %s with a scoped session', async (mode, label, destination, role) => {
    vi.stubEnv('VITE_MOCK', '1')
    const endpoint = mode === 'admin' ? authApiMocks.adminLogin : authApiMocks.login
    endpoint.mockResolvedValue({ data: { accessToken: `${mode}-token`, refreshToken: `${mode}-refresh` } })
    renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: new RegExp(`使用${label}演示账号登录`) }))

    await waitFor(() => expect(routerMocks.navigate).toHaveBeenCalledWith(destination, { replace: true }))
    expect(endpoint).toHaveBeenCalledWith({ email: `${mode}@sdumeow.cn`, password: 'meow123' })
    expect(storage.getToken(mode)).toBe(`${mode}-token`)
    expect(storage.getRefreshToken(mode)).toBe(`${mode}-refresh`)
    expect(storage.getToken(mode === 'admin' ? 'user' : 'admin')).toBeNull()
    expect(useAuthStore.getState().role).toBe(role)
    expect(window.location.assign).not.toHaveBeenCalled()
  })

  it('shows login notice when redirected from protected features', async () => {
    sessionStorage.setItem(STORAGE_KEYS.authLoginNotice, '请登录使用功能')

    renderLoginPage()

    expect(await screen.findByText('请登录使用功能')).toBeInTheDocument()
    expect(screen.getByText('登录后即可继续使用该功能。')).toBeInTheDocument()
    expect(sessionStorage.getItem(STORAGE_KEYS.authLoginNotice)).toBeNull()
  })
})
