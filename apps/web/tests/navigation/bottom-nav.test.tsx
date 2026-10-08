import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BottomNav } from '@/components/navigation/BottomNav'
import { AppRootLayout } from '@/layouts/AppRootLayout'
import { UserLayout } from '@/layouts/UserLayout'
import { useAuthStore } from '@/store'
import { UserRole } from '@/types/enums'

vi.mock('@/api/endpoints/user', () => ({ checkin: vi.fn(async () => ({ data: {} })) }))

function HomeTab() { return <UserLayout><p>首页内容</p></UserLayout> }
function PublishTab() { return <UserLayout><p>发布内容</p></UserLayout> }
function ProfileTab() { return <UserLayout><p>个人内容</p></UserLayout> }

function renderTabs() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppRootLayout />}>
            <Route index element={<HomeTab />} />
            <Route path="publish" element={<PublishTab />} />
            <Route path="profile" element={<ProfileTab />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('mobile bottom navigation', () => {
  beforeEach(() => {
    localStorage.clear()
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))
    useAuthStore.setState({ role: UserRole.User, token: `header.${payload}.signature`, hydrated: true })
  })

  it('keeps one navigation instance through page unmounts and rapid switches', async () => {
    renderTabs()
    const nav = screen.getByRole('navigation', { name: '底部导航' })
    const indicator = nav.querySelector('.mobile-bottom-nav__indicator')
    expect(within(nav).getAllByRole('link')).toHaveLength(3)

    for (const label of ['发布', '我的', '首页']) {
      fireEvent.click(within(nav).getByRole('link', { name: label }), { detail: 1 })
      await waitFor(() => expect(within(nav).getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page'))
      expect(screen.getAllByRole('navigation')).toHaveLength(1)
      expect(screen.getByRole('navigation')).toBe(nav)
      expect(nav.querySelector('.mobile-bottom-nav__indicator')).toBe(indicator)
    }
    expect(nav).toHaveAttribute('data-motion', 'animated')
  })

  it('switches keyboard navigation immediately and restores pointer motion', async () => {
    renderTabs()
    const nav = screen.getByRole('navigation')
    fireEvent.click(within(nav).getByRole('link', { name: '发布' }), { detail: 0 })
    expect(await screen.findByText('发布内容')).toBeInTheDocument()
    expect(nav).toHaveAttribute('data-motion', 'instant')
    fireEvent.click(within(nav).getByRole('link', { name: '我的' }), { detail: 1 })
    expect(await screen.findByText('个人内容')).toBeInTheDocument()
    expect(nav).toHaveAttribute('data-motion', 'animated')
  })

  it('labels admin links and selects nested routes without duplicate interactive copies', () => {
    render(<MemoryRouter initialEntries={['/admin/cats/cat-1']}>
      <BottomNav variant="admin" items={[
        { key: 'home', label: '工作台', to: '/admin/dashboard' },
        { key: 'cats', label: '猫咪', to: '/admin/cats' },
      ]} />
    </MemoryRouter>)
    expect(screen.getAllByRole('link')).toHaveLength(2)
    expect(screen.getByRole('link', { name: '猫咪' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: '工作台' })).not.toHaveAttribute('aria-current')
  })
})
