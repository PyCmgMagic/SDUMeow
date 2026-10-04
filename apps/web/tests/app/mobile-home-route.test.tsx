import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { MobileLayout as MobileHomeRoute } from '../../src/pages/home/MobileLayout'
import { useAuthStore } from '@/store'
import { UserRole } from '@/types/enums'

function toBase64Url(data: object): string {
  return btoa(JSON.stringify(data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function createJwtWithExpiry(exp: number): string {
  return `${toBase64Url({ alg: 'HS256', typ: 'JWT' })}.${toBase64Url({ exp })}.signature`
}

vi.mock('../../src/pages/home/MobileHomePage', () => ({
  MobileHomePage: () => <div>mobile home page</div>,
}))

function renderHomeRoute() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<MobileHomeRoute />} path="/" />
          <Route element={<div>login page</div>} path="/login" />
          <Route element={<div>admin dashboard</div>} path="/admin/dashboard" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MobileHomeRoute（统一路由下的移动端首页）', () => {
  it('redirects to login when token is expired', async () => {
    const expiredToken = createJwtWithExpiry(Math.floor(Date.now() / 1000) - 60)
    useAuthStore.setState({ token: expiredToken, role: UserRole.User, profile: null, hydrated: true })

    renderHomeRoute()

    expect(await screen.findByText('login page')).toBeInTheDocument()
  })

  it('redirects admins to the admin dashboard', async () => {
    const token = createJwtWithExpiry(Math.floor(Date.now() / 1000) + 3600)
    useAuthStore.setState({ token, role: UserRole.Admin, profile: null, hydrated: true })

    renderHomeRoute()

    expect(await screen.findByText('admin dashboard')).toBeInTheDocument()
  })

  it('renders the mobile home page for valid users', async () => {
    const token = createJwtWithExpiry(Math.floor(Date.now() / 1000) + 3600)
    useAuthStore.setState({ token, role: UserRole.User, profile: null, hydrated: true })

    renderHomeRoute()

    expect(await screen.findByText('mobile home page')).toBeInTheDocument()
  })
})
