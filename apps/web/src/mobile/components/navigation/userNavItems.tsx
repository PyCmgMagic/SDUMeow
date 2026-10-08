import { HomeFilled, PlusSquareFilled, UserOutlined } from '@ant-design/icons'
import type { NavItem } from '@/types/ui'

export const userNavItems: NavItem[] = [
  { key: 'home', label: '首页', to: '/', icon: <HomeFilled /> },
  { key: 'publish', label: '发布', to: '/publish', icon: <PlusSquareFilled /> },
  { key: 'me', label: '我的', to: '/profile', icon: <UserOutlined /> },
]
