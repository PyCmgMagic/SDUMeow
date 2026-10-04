import { render, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppRootLayout } from '@/layouts/AppRootLayout'
import { useAuthStore } from '@/store'
import { UserRole } from '@/types/enums'
import { STORAGE_KEYS } from '@/utils/constants'
import { storage } from '@/utils/storage'

const userApiMocks = vi.hoisted(() => ({
  getMeWithScope: vi.fn(),
}))

const routerMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}))

vi.mock('@/api/endpoints/user', () => ({
  getMeWithScope: userApiMocks.getMeWithScope,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => routerMocks.navigate,
  }
})

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    message: { success: vi.fn() },
  }
})

function renderAuthCallback() {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={['/?meow_token=access-token&meow_refresh_token=refresh-token']}>
        <AppRootLayout />
      </MemoryRouter>
    </StrictMode>,
  )
}

describe('AppRootLayout auth callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    useAuthStore.setState({ token: null, role: null, profile: null, hydrated: true })
  })

  it('routes admin callbacks to the admin home page', async () => {
    userApiMocks.getMeWithScope.mockResolvedValue({
      code: 200,
      msg: 'ok',
      data: { role: 'admin', nickname: 'Admin' },
    })

    renderAuthCallback()

    await waitFor(() => {
      expect(routerMocks.navigate).toHaveBeenCalledWith('/admin/dashboard', { replace: true })
    })
    expect(routerMocks.navigate).not.toHaveBeenCalledWith('/', { replace: true })
    expect(useAuthStore.getState().role).toBe(UserRole.Admin)
    expect(userApiMocks.getMeWithScope).toHaveBeenCalledWith('user')
    // Profile confirms administrator access, so the callback is migrated to
    // the isolated admin slot before the admin dashboard is entered.
    expect(storage.getToken('admin')).toBe('access-token')
    expect(storage.getRefreshToken('admin')).toBe('refresh-token')
    expect(storage.getToken('user')).toBeNull()
  })

  it('routes user callbacks to the user home page', async () => {
    userApiMocks.getMeWithScope.mockResolvedValue({
      code: 200,
      msg: 'ok',
      data: { role: 'user', nickname: 'User' },
    })

    renderAuthCallback()

    await waitFor(() => {
      expect(routerMocks.navigate).toHaveBeenCalledWith('/', { replace: true })
    })
    expect(useAuthStore.getState().role).toBe(UserRole.User)
    expect(userApiMocks.getMeWithScope).toHaveBeenCalledWith('user')
    expect(storage.getToken('user')).toBe('access-token')
    expect(storage.getToken('admin')).toBeNull()
  })

  it('rejects a pending admin callback when the profile is not an admin', async () => {
    // 产品安全语义：pendingRole=admin 但后端资料并非管理员时，不得放行管理端。
    localStorage.setItem(STORAGE_KEYS.authLoginMode, 'admin')
    userApiMocks.getMeWithScope.mockResolvedValue({
      code: 200,
      msg: 'ok',
      data: { role: 'user', nickname: 'Admin' },
    })

    renderAuthCallback()

    await waitFor(() => {
      expect(routerMocks.navigate).toHaveBeenCalledWith('/login', {
        replace: true,
        state: { loginNotice: '无管理员权限' },
      })
    })
    expect(useAuthStore.getState().role).toBeNull()
    expect(userApiMocks.getMeWithScope).toHaveBeenCalledWith('admin')
    expect(storage.getToken('admin')).toBeNull()
    expect(sessionStorage.getItem(STORAGE_KEYS.authLoginMode)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.authLoginMode)).toBeNull()
  })

  it('uses the pending admin login mode when the profile confirms admin', async () => {
    localStorage.setItem(STORAGE_KEYS.authLoginMode, 'admin')
    userApiMocks.getMeWithScope.mockResolvedValue({
      code: 200,
      msg: 'ok',
      data: { role: 'admin', nickname: 'Admin' },
    })

    renderAuthCallback()

    await waitFor(() => {
      expect(routerMocks.navigate).toHaveBeenCalledWith('/admin/dashboard', { replace: true })
    })
    expect(useAuthStore.getState().role).toBe(UserRole.Admin)
    expect(userApiMocks.getMeWithScope).toHaveBeenCalledWith('admin')
    expect(storage.getToken('admin')).toBe('access-token')
    expect(sessionStorage.getItem(STORAGE_KEYS.authLoginMode)).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.authLoginMode)).toBeNull()
  })
})
