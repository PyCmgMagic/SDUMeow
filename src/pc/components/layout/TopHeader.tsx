import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, Menu, Search, X } from 'lucide-react'

import logo from '@/assets/猫猫图鉴-logo.png'
import { Input } from '@pc/components/ui/input'
import { catApi, typeApi } from '@pc/lib/api'
import { useUserStore } from '@pc/stores/user'
import { useNotificationStore } from '@pc/stores/notifications'
import { useRouteName } from '@pc/router/routeName'
import { CampusMap, type CatListItem, type TypeOption } from '@pc/types'

interface TopHeaderProps {
  navigationOpen: boolean
  onToggleNavigation: () => void
}

export function TopHeader({ navigationOpen, onToggleNavigation }: TopHeaderProps) {
  const router = useNavigate()
  const route = useLocation()
  const routeName = useRouteName()
  const token = useUserStore((state) => state.token)
  const badgeCount = useNotificationStore((state) => state.badgeCount())
  const startPolling = useNotificationStore((state) => state.startPolling)
  const stopPolling = useNotificationStore((state) => state.stopPolling)
  const fetchPreview = useNotificationStore((state) => state.fetchPreview)

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<CatListItem[]>([])
  const [colorOptions, setColorOptions] = useState<TypeOption[]>([])
  const [locationOptions, setLocationOptions] = useState<TypeOption[]>([])
  const [searching, setSearching] = useState(false)
  const [searchedKeyword, setSearchedKeyword] = useState('')
  const debounceTimerRef = useRef<number | null>(null)
  const latestSearchIdRef = useRef(0)

  const isAdminRoute = route.pathname.includes('/admin/cats')
  const pageTitle = useMemo(() => {
    const titles: Record<string, string> = {
      team: '开发团队',
      sos: '紧急 SOS',
      adopt: '申请领养',
      'post-moment': '发布动态',
      notifications: '通知中心',
      'announcement-detail': '公告详情',
      userCenter: '个人中心',
      'my-adoptions': '我的领养',
      'my-sos': '我的 SOS',
    }
    return titles[routeName] || '首页'
  }, [routeName])

  const colorLabels = useMemo(
    () => new Map(colorOptions.map((item) => [item.id, item.label])),
    [colorOptions],
  )
  const locationLabels = useMemo(
    () => new Map(locationOptions.map((item) => [item.id, item.label])),
    [locationOptions],
  )
  const colorLabel = (id: number) => colorLabels.get(id) || `#${id}`
  const locationLabel = (id: number | null | undefined) =>
    id == null ? '' : locationLabels.get(id) || `地点 #${id}`

  const showSuggestionPanel = useMemo(() => {
    const keyword = query.trim()
    return Boolean(keyword && (searching || suggestions.length || searchedKeyword === keyword))
  }, [query, searching, suggestions, searchedKeyword])

  const doSearch = async (keyword: string) => {
    const normalizedKeyword = keyword.trim()
    const requestId = ++latestSearchIdRef.current
    if (!normalizedKeyword) {
      setSuggestions([])
      setSearchedKeyword('')
      setSearching(false)
      return
    }

    setSearching(true)
    try {
      const result = await catApi.getCatList({ page: 1, pageSize: 8, search: normalizedKeyword })
      if (requestId !== latestSearchIdRef.current) return
      setSuggestions(result.items)
      setSearchedKeyword(normalizedKeyword)
    } catch {
      if (requestId !== latestSearchIdRef.current) return
      setSuggestions([])
      setSearchedKeyword(normalizedKeyword)
    } finally {
      if (requestId === latestSearchIdRef.current) setSearching(false)
    }
  }

  // 防抖回调里读取的是本次渲染闭包的 query，必须显式传入最新输入值
  //（Vue 版的 ref 实时取值语义在 React 下要用事件值传递）。
  const onInput = (latestValue: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = window.setTimeout(() => void doSearch(latestValue), 300)
  }

  const withQuery = (pathname: string, params: Record<string, string | undefined>) => {
    const search = new URLSearchParams(route.search)
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) search.delete(key)
      else search.set(key, value)
    }
    const queryString = search.toString()
    return queryString ? `${pathname}?${queryString}` : pathname
  }

  const chooseSuggestion = (item: CatListItem) => {
    if (routeName === 'adopt' || routeName === 'sos' || routeName === 'post-moment') {
      router(withQuery(route.pathname, { catId: String(item.id) }), { replace: true })
    } else if (isAdminRoute) {
      // 在 AdminCatView 中，更新搜索查询参数
      router(withQuery(route.pathname, { search: item.name, page: '1' }))
    } else {
      router(withQuery('/', { search: item.name }))
    }
    setSuggestions([])
    setSearchedKeyword('')
    setQuery('')
  }

  const onSearchEnter = () => {
    const q = String(query || '').trim()
    if (isAdminRoute) {
      // 在 AdminCatView 中，更新搜索查询参数
      router(withQuery(route.pathname, { search: q || undefined, page: '1' }))
    } else {
      router(withQuery('/', { search: q || undefined, page: '1' }))
    }
    setSuggestions([])
    setSearchedKeyword('')
  }

  const clearSearch = () => {
    setQuery('')
    setSuggestions([])
    setSearchedKeyword('')
    latestSearchIdRef.current += 1
    if (isAdminRoute) {
      router(withQuery(route.pathname, { search: undefined, page: '1' }))
    }
  }

  useEffect(() => {
    startPolling()
    void (async () => {
      try {
        const [colors, locations] = await Promise.all([typeApi.getColors(), typeApi.getLocations()])
        setColorOptions(colors)
        setLocationOptions(locations)
      } catch (e) {
        console.warn('加载猫咪类型选项失败', e)
      }
    })()

    // 同步路由查询参数到搜索框
    if (isAdminRoute) {
      const search = new URLSearchParams(route.search).get('search')
      if (search) setQuery(search)
    }
    return () => {
      stopPolling()
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
      latestSearchIdRef.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 监听路由变化，同步搜索框值
  useEffect(() => {
    if (isAdminRoute || route.pathname === '/') {
      setQuery(new URLSearchParams(route.search).get('search') || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.search])

  useEffect(() => {
    void fetchPreview()
  }, [token, fetchPreview])

  return (
    <header className="public-header sticky top-0 z-[100] grid h-[64px] w-full grid-cols-[minmax(0,1fr)_auto] items-center border-b border-gray-200 bg-meow-bg gap-3 px-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-6 sm:px-6">
      <div className="flex min-w-0 items-center text-xs text-gray-500 tracking-wider sm:text-sm">
        <button
          type="button"
          className="mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-white hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
          aria-label="打开导航菜单"
          aria-controls="mobile-navigation"
          aria-expanded={navigationOpen}
          onClick={onToggleNavigation}
        >
          <Menu className="h-5 w-5" />
        </button>
        <img src={logo} alt="猫猫图鉴 logo" className="h-10 w-10 shrink-0 rounded-[10px] object-contain" />
        <span className="mx-2 shrink-0 text-gray-400" aria-hidden="true">/</span>
        <span className="min-w-0 truncate font-bold text-gray-900">{pageTitle}</span>
      </div>
      {/* 搜索框 */}
      <div className="hidden justify-center w-full group sm:flex">
        <div className="relative w-full max-w-[500px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 group-focus-within:opacity-100 transition-opacity text-gray-500" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              onInput(event.target.value)
            }}
            onKeyUp={(event) => {
              if (event.key === 'Enter') onSearchEnter()
            }}
            className="pl-10 pr-10 h-10 w-full rounded-full bg-gray-200 border-transparent focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:border-transparent placeholder:text-gray-400 text-sm transition-all"
            placeholder={
              isAdminRoute ? '搜索猫咪名字、花色或常驻地...' : '搜索猫咪花名，花色或出没地点...'
            }
          />
          {/* 清除按钮 */}
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* 建议框 */}
          {showSuggestionPanel && (
            <div className="absolute left-0 right-0 top-full z-[101] mt-2 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {searching ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">正在搜索...</div>
              ) : suggestions.length ? (
                <ul className="py-1">
                  {suggestions.map((item) => (
                    <li
                      key={item.id}
                      className="px-4 py-3 hover:bg-primary/10 cursor-pointer flex items-center gap-3 border-b border-gray-100 last:border-b-0 transition-colors group/item"
                      onClick={() => chooseSuggestion(item)}
                    >
                      <img
                        src={item.avatar}
                        alt={item.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-900 truncate group-hover/item:text-primary transition-colors">
                          {item.name}
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <span className="text-gray-400">花色:</span>
                            <span className="text-gray-700 font-medium">{colorLabel(item.color!)}</span>
                          </span>
                          {typeof item.location === 'number' ? (
                            <span className="flex items-center gap-1">
                              <span className="text-gray-400">地点:</span>
                              <span className="text-gray-700 font-medium">
                                {locationLabel(item.location)}
                              </span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <span className="text-gray-400">校区:</span>
                              <span className="text-gray-700 font-medium">
                                {CampusMap[item.campus!]}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xl opacity-0 group-hover/item:opacity-100 transition-opacity">
                        ➔
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-gray-500">未找到匹配内容</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        {token && (
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:bg-white hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="打开通知"
            title="查看通知"
            onClick={() => router('/notifications')}
          >
            <Bell className="w-5 h-5" />
            {badgeCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-meow-bg">
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  )
}
