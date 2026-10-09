import { AppstoreOutlined, HomeOutlined, HomeTwoTone, TeamOutlined, UserOutlined } from '@ant-design/icons'
import { Outlet, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

import { BottomNav } from '@/components/navigation/BottomNav'

const navItems = [
  { key: 'dashboard', label: '工作台', to: '/admin/dashboard', icon: <HomeOutlined /> },
  { key: 'cats', label: '猫咪', to: '/admin/cats', icon: <AppstoreOutlined /> },
  { key: 'adoptions', label: '领养', to: '/admin/adoptions', icon: <HomeTwoTone twoToneColor="#94a3b8" /> },
  { key: 'users', label: '用户', to: '/admin/users', icon: <TeamOutlined /> },
  { key: 'me', label: '我的', to: '/admin/me', icon: <UserOutlined /> },
]

const hiddenNavPatterns = [
  /^\/admin\/cats\/[^/]+$/,
  /^\/admin\/cats\/[^/]+\/edit$/,
  /^\/admin\/adoptions\/[^/]+$/,
  /^\/admin\/sos\/[^/]+$/,
  /^\/admin\/announcements\/[^/]+\/edit$/,
]

// 统一路由下既作为 /admin 布局组的 Outlet 容器，也支持直接包裹单页（children 优先）。
export function AdminLayout({ children }: { children?: ReactNode } = {}) {
  const location = useLocation()
  const hideNav = hiddenNavPatterns.some((pattern) => pattern.test(location.pathname))

  return (
    <div className="h5-shell">
      {children ?? <Outlet />}
      {hideNav ? null : <BottomNav items={navItems} variant="admin" />}
    </div>
  )
}
