import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Cat,
  Heart,
  LifeBuoy,
  PawPrint,
  Users,
  Megaphone,
  Menu,
  Search,
  X,
} from 'lucide-react'

import { searchApi } from '@pc/lib/api'
import { normalizeSearchItems } from '@pc/lib/search'
import type { UnifiedSearchItem } from '@pc/types'
import { useThemeStore } from '@pc/stores/theme'
import { AdminThemeModeSwitch } from '@pc/components/layout/AdminThemeModeSwitch'

const menuGroups = [
  {
    title: '主页',
    items: [{ name: '控制台', path: '/admin/dashboard', icon: LayoutDashboard }],
  },
  {
    title: '业务管理',
    items: [
      { name: '猫咪档案', path: '/admin/cats', icon: Cat },
      { name: '领养申请', path: '/admin/adoptions', icon: Heart },
      { name: 'SOS 救援', path: '/admin/sos', icon: LifeBuoy },
    ],
  },
  {
    title: '内容中心',
    items: [
      { name: '新喵线索', path: '/admin/new-cats', icon: PawPrint },
      { name: '公告管理', path: '/admin/announcements', icon: Megaphone },
    ],
  },
  {
    title: '系统管理',
    items: [{ name: '用户管理', path: '/admin/users', icon: Users }],
  },
]

const searchLabel = (item: UnifiedSearchItem) => item.title || item.name || `搜索结果 #${item.id}`

export function AdminLayout() {
  const route = useLocation()
  const router = useNavigate()
  const adminTheme = useThemeStore((state) => state.adminTheme)

  // 计算当前路由，用于高亮侧边栏
  const currentRoute = route.pathname

  // 检查是否在业务管理页面（猫咪档案、领养申请、SOS救援）
  const isBusinessPage =
    route.pathname.includes('/admin/cats') ||
    route.pathname.includes('/admin/adoptions') ||
    route.pathname.includes('/admin/sos')

  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('')
  const [catSuggestions, setCatSuggestions] = useState<UnifiedSearchItem[]>([])
  const [userSuggestions, setUserSuggestions] = useState<UnifiedSearchItem[]>([])
  const [searching, setSearching] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const debounceTimerRef = useRef<number | null>(null)
  const latestSearchIdRef = useRef(0)

  useEffect(() => {
    document.documentElement.dataset.adminTheme = adminTheme
    return () => {
      delete document.documentElement.dataset.adminTheme
    }
  }, [adminTheme])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
      latestSearchIdRef.current += 1
    }
  }, [])

  const doSearch = async (keyword: string) => {
    if (!keyword || keyword.trim().length === 0) {
      latestSearchIdRef.current += 1
      setCatSuggestions([])
      setUserSuggestions([])
      setSearching(false)
      return
    }

    const trimmedKeyword = keyword.trim()
    const requestId = ++latestSearchIdRef.current
    setSearching(true)
    try {
      const result = await searchApi.search({ keyword: trimmedKeyword, page: 1, pageSize: 5 })
      if (requestId === latestSearchIdRef.current) {
        const items = normalizeSearchItems(result)
        setCatSuggestions(items.filter((item) => item.type === 0))
        setUserSuggestions(items.filter((item) => item.type === 1))
      }
    } catch {
      if (requestId !== latestSearchIdRef.current) return
      setCatSuggestions([])
      setUserSuggestions([])
    } finally {
      if (requestId === latestSearchIdRef.current) setSearching(false)
    }
  }

  const onSearchInput = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = window.setTimeout(() => void doSearch(searchQuery), 300)
  }

  const withQuery = (pathname: string, params: Record<string, string>) => {
    const search = new URLSearchParams(route.search)
    for (const [key, value] of Object.entries(params)) search.set(key, value)
    return `${pathname}?${search.toString()}`
  }

  const chooseCat = (cat: UnifiedSearchItem) => {
    // 根据当前页面的类型决定跳转方式
    if (isBusinessPage) {
      // 业务管理页面（猫咪档案、领养申请、SOS救援）：保留筛选条件
      router(withQuery(route.pathname, { search: searchLabel(cat), page: '1' }))
    } else {
      // 其他页面：跳转到猫咪档案页并搜索
      router(withQuery('/admin/cats', { search: searchLabel(cat), page: '1' }))
    }
    setCatSuggestions([])
    setUserSuggestions([])
    setSearchQuery('')
  }

  const chooseUser = (user: UnifiedSearchItem) => {
    // Keep user results in the management list, matching the cat navigation flow.
    router(withQuery('/admin/users', { search: searchLabel(user), page: '1' }))
    setCatSuggestions([])
    setUserSuggestions([])
    setSearchQuery('')
  }

  const onSearchEnter = () => {
    const resultCount = catSuggestions.length + userSuggestions.length
    if (resultCount !== 1) return

    if (catSuggestions[0]) {
      chooseCat(catSuggestions[0])
    } else if (userSuggestions[0]) {
      chooseUser(userSuggestions[0])
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setCatSuggestions([])
    setUserSuggestions([])
    latestSearchIdRef.current += 1
  }

  return (
    <div
      className="admin-shell flex h-screen w-full overflow-hidden font-sans"
      data-admin-theme={adminTheme}
    >
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="关闭导航菜单"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* 侧边栏 (Sidebar) */}
      <aside
        className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-200 lg:static lg:z-20 lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo 区域 */}
        <div className="admin-sidebar-brand flex h-20 items-center justify-between px-6">
          <div className="flex items-center min-w-0">
            {/* 替换为你的猫猫 Logo 图标 */}
            <svg
              className="admin-brand-icon mr-3 size-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3.1-9-7.56c0-1.25.5-2.4 1.1-3.48 0 0-1.93-6.42-.53-7 1.4-.58 4.5 0 6.28 2 .67-.18 1.34-.27 2-.27z"></path>
              <path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"></path>
              <path d="M9 13h.01"></path>
              <path d="M15 13h.01"></path>
            </svg>
            <span className="text-2xl font-black tracking-tight truncate">SDU Meow</span>
          </div>
          <button
            type="button"
            className="admin-sidebar-close flex size-9 shrink-0 items-center justify-center lg:hidden"
            aria-label="关闭导航菜单"
            onClick={() => setMobileNavOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* 导航菜单区域 */}
        <nav className="admin-sidebar-nav flex flex-1 flex-col gap-8 overflow-y-auto px-4 py-6">
          {menuGroups.map((group) => (
            <div key={group.title}>
              <div className="admin-nav-group-label mb-3 px-2 text-xs font-bold uppercase">
                {group.title}
              </div>
              <ul className="flex flex-col gap-2">
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={() => setMobileNavOpen(false)}
                        className={`admin-nav-item group flex items-center px-4 py-3 transition-all duration-200 ${
                          currentRoute === item.path ? 'admin-nav-item-active' : ''
                        }`}
                      >
                        <Icon
                          className="mr-3 size-5"
                          strokeWidth={currentRoute === item.path ? 2.5 : 2}
                        />
                        <span className="text-base">{item.name}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <AdminThemeModeSwitch />

        {/* 底部用户信息 */}
        <div className="admin-profile flex items-center">
          <div className="admin-profile-avatar mr-4 flex size-12 shrink-0 items-center justify-center text-lg font-black">
            AD
          </div>
          <div className="flex flex-col gap-0.5 overflow-hidden">
            <span className="admin-profile-name truncate text-base font-black">管理员</span>
            <span className="admin-profile-meta truncate text-xs font-medium">
              admin@sdumeow.com
            </span>
          </div>
        </div>
      </aside>

      {/* 右侧主体区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 (Header) */}
        <header className="admin-header relative z-30 flex h-20 shrink-0 items-center justify-between px-4 sm:px-8">
          {/* 左侧搜索框 */}
          <div className="flex flex-1 items-center gap-3 max-w-lg">
            <button
              type="button"
              className="admin-mobile-menu-button flex size-10 shrink-0 items-center justify-center lg:hidden"
              aria-label="打开导航菜单"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <div className="group relative flex w-full items-center">
              <Search
                className="admin-search-icon absolute left-4 size-5 transition-colors"
                strokeWidth="2.5"
              />
              <input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                  onSearchInput()
                }}
                onKeyUp={(event) => {
                  if (event.key === 'Enter') onSearchEnter()
                }}
                type="text"
                placeholder="搜索猫咪、用户或内容..."
                className="admin-search-input w-full py-3 pl-12 pr-10 text-sm font-bold focus:outline-none focus:ring-0"
              />
              {/* 清除按钮 */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="admin-search-clear absolute right-4 transition-colors"
                >
                  <X className="w-5 h-5" strokeWidth="2.5" />
                </button>
              )}

              {/* 搜索建议框 */}
              {(searching || catSuggestions.length > 0 || userSuggestions.length > 0) && (
                <div className="admin-search-results absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto">
                  {searching ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">正在搜索...</div>
                  ) : (
                    <>
                      {/* 猫咪搜索结果 */}
                      {catSuggestions.length > 0 && (
                        <div>
                          <div className="admin-search-group-label flex items-center gap-2 px-4 py-2 text-xs font-bold">
                            <Cat className="w-4 h-4" />
                            猫咪
                          </div>
                          <ul>
                            {catSuggestions.map((item) => (
                              <li
                                key={`cat-${item.id}`}
                                className="admin-search-result group/item flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors last:border-b-0"
                                onClick={() => chooseCat(item)}
                              >
                                <img
                                  src={item.image || item.avatar}
                                  alt={searchLabel(item)}
                                  className="admin-search-avatar size-10 shrink-0 rounded-full object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-bold text-gray-900 truncate group-hover/item:text-primary transition-colors">
                                    {searchLabel(item)}
                                  </div>
                                  <p className="mt-1 truncate text-xs text-gray-500">
                                    {item.description || '猫咪搜索结果'}
                                  </p>
                                </div>
                                <div className="text-lg opacity-0 group-hover/item:opacity-100 transition-opacity">
                                  →
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 用户搜索结果 */}
                      {userSuggestions.length > 0 && (
                        <div>
                          <div className="admin-search-group-label flex items-center gap-2 px-4 py-2 text-xs font-bold">
                            <Users className="w-4 h-4" />
                            用户
                          </div>
                          <ul>
                            {userSuggestions.map((user) => (
                              <li
                                key={`user-${user.id}`}
                                className="admin-search-result group/item flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors last:border-b-0"
                                onClick={() => chooseUser(user)}
                              >
                                {user.image || user.avatar ? (
                                  <div className="admin-search-avatar size-10 shrink-0 overflow-hidden rounded-full">
                                    <img
                                      src={user.image || user.avatar}
                                      alt={searchLabel(user)}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="admin-search-avatar admin-search-avatar-fallback flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                                    {searchLabel(user).charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-bold text-gray-900 truncate group-hover/item:text-blue-600 transition-colors">
                                    {searchLabel(user)}
                                  </div>
                                  <p className="mt-1 truncate text-xs text-gray-500">
                                    {user.description || `用户 ID: ${user.id}`}
                                  </p>
                                </div>
                                <div className="text-lg opacity-0 group-hover/item:opacity-100 transition-opacity">
                                  →
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {searchQuery && catSuggestions.length === 0 && userSuggestions.length === 0 && (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">
                          未找到匹配的结果
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 右侧操作区 */}
          <div className="ml-8 hidden items-center gap-4 sm:flex">
            {/* 顶部头像 */}
            <div className="admin-header-avatar flex size-10 cursor-pointer items-center justify-center rounded-full text-sm font-black transition-shadow">
              AD
            </div>
          </div>
        </header>

        {/* 路由视图 (Main Content) */}
        <main className="admin-main flex-1 overflow-auto p-4 sm:p-8">
          <div className="admin-content mx-auto max-w-7xl pb-10">
            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        /* 隐藏滚动条但保留滚动功能 */
        aside.admin-sidebar nav::-webkit-scrollbar {
          width: 4px;
        }
        aside.admin-sidebar nav::-webkit-scrollbar-track {
          background: transparent;
        }
        aside.admin-sidebar nav::-webkit-scrollbar-thumb {
          background-color: #e5e7eb;
          border-radius: 20px;
        }
      `}</style>
    </div>
  )
}
