import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  Cat,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  Inbox,
  Info,
  LifeBuoy,
  LoaderCircle,
  Megaphone,
  RefreshCw,
} from 'lucide-react'
import { announcementApi, notificationApi } from '@pc/lib/api'
import { useNotificationStore } from '@pc/stores/notifications'
import { AnnouncementTypeMap, type Announcement, type FlexiblePageResult, type NotificationItem } from '@pc/types'
import { Button } from '@pc/components/ui/button'
import { cn } from '@pc/lib/utils'

type TabValue = 'all' | 'unread' | 'adoption' | 'announcements'
type NotificationKind = 'adoption' | 'sos' | 'announcement' | 'new-cat' | 'system'

interface TabItem {
  label: string
  value: TabValue
  icon: LucideIcon
}

export function DesktopLayout() {
const navigate = useNavigate()
const notifications = useNotificationStore((s) => s.notifications)
const unreadCount = useNotificationStore((s) => s.unreadCount)
const total = useNotificationStore((s) => s.total)
const totalPages = useNotificationStore((s) => s.totalPages)
const loading = useNotificationStore((s) => s.loading)
const errorMessage = useNotificationStore((s) => s.errorMessage)
const fetchPage = useNotificationStore((s) => s.fetchPage)
const markAsRead = useNotificationStore((s) => s.markAsRead)
const markAllAsRead = useNotificationStore((s) => s.markAllAsRead)
const markAnnouncementsSeen = useNotificationStore((s) => s.markAnnouncementsSeen)
const fetchPreview = useNotificationStore((s) => s.fetchPreview)

const [activeTab, setActiveTab] = useState<TabValue>('all')
const [currentPage, setCurrentPage] = useState(1)
const pageSize = 10
const [allNotificationTotal, setAllNotificationTotal] = useState(0)
const [adoptionNotificationTotal, setAdoptionNotificationTotal] = useState(0)
const [announcements, setAnnouncements] = useState<Announcement[]>([])
const [announcementTotal, setAnnouncementTotal] = useState(0)
const [announcementPages, setAnnouncementPages] = useState(1)
const [announcementLoading, setAnnouncementLoading] = useState(false)
const [announcementError, setAnnouncementError] = useState('')
const [markingAllRead, setMarkingAllRead] = useState(false)

const tabs: TabItem[] = [
  { label: '全部通知', value: 'all', icon: Bell },
  { label: '未读', value: 'unread', icon: Info },
  { label: '领养进度', value: 'adoption', icon: HeartHandshake },
  { label: '系统公告', value: 'announcements', icon: Megaphone },
]

const pageItems = <T,>(data: FlexiblePageResult<T>): T[] => data.items || data.records || data.list || []
const pageTotal = <T,>(data: FlexiblePageResult<T>) => Number(data.total ?? pageItems(data).length)
const pageCount = <T,>(data: FlexiblePageResult<T>) => {
  const reportedPages = Number(data.totalPage ?? data.pages)
  if (Number.isFinite(reportedPages) && reportedPages > 0) return reportedPages
  const resolvedPageSize = Number(data.size ?? pageSize)
  return Math.max(Math.ceil(pageTotal(data) / resolvedPageSize), 1)
}
const isAnnouncementTab = activeTab === 'announcements'
const isLoading = isAnnouncementTab ? announcementLoading : loading
const currentError = isAnnouncementTab ? announcementError : errorMessage
const displayedTotal = isAnnouncementTab ? announcementTotal : total
const displayedPages = isAnnouncementTab ? announcementPages : totalPages

const formatTime = (value?: string) => {
  if (!value) return '刚刚'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const notificationKind = (item: NotificationItem): NotificationKind => {
  const value = `${item.type} ${item.relatedType || ''} ${item.title || ''}`.toUpperCase()
  if (value.includes('ADOPT') || value.includes('领养')) return 'adoption'
  if (value.includes('SOS') || value.includes('救助') || value.includes('求助')) return 'sos'
  if (value.includes('ANNOUNCEMENT') || value.includes('NOTICE') || value.includes('公告')) return 'announcement'
  if (value.includes('NEW_CAT') || value.includes('新猫')) return 'new-cat'
  return 'system'
}

const notificationLabel = (item: NotificationItem) => {
  const kind = notificationKind(item)
  if (kind === 'adoption') return '领养进度'
  if (kind === 'sos') return 'SOS 进度'
  if (kind === 'announcement') return '系统公告'
  if (kind === 'new-cat') return '新猫进度'
  return '系统通知'
}

const notificationIcon = (item: NotificationItem) => {
  const kind = notificationKind(item)
  if (kind === 'adoption') return HeartHandshake
  if (kind === 'sos') return LifeBuoy
  if (kind === 'announcement') return Megaphone
  if (kind === 'new-cat') return Cat
  return Bell
}

const announcementTypeLabel = (type: Announcement['type']) => {
  return AnnouncementTypeMap[String(type)] || '系统公告'
}

const visibleNotifications = notifications

const currentItemsLength = isAnnouncementTab
  ? announcements.length
  : visibleNotifications.length

const tabCount = (value: TabValue) => {
  if (value === 'unread') return unreadCount
  if (value === 'all') return allNotificationTotal
  if (value === 'adoption') return adoptionNotificationTotal
  return announcementTotal
}

const fetchTabCounts = async () => {
  const [allResult, adoptionResult, announcementResult] = await Promise.allSettled([
    notificationApi.getNotifications({ page: 1, pageSize: 1 }),
    notificationApi.getNotifications({ type: 'ADOPT', page: 1, pageSize: 1 }),
    announcementApi.getAnnouncements({ page: 1, pageSize: 1 }),
  ])

  if (allResult.status === 'fulfilled') setAllNotificationTotal(pageTotal(allResult.value))
  if (adoptionResult.status === 'fulfilled') setAdoptionNotificationTotal(pageTotal(adoptionResult.value))
  if (announcementResult.status === 'fulfilled') setAnnouncementTotal(pageTotal(announcementResult.value))
}

const fetchAnnouncements = async () => {
  setAnnouncementLoading(true)
  setAnnouncementError('')
  try {
    const data = await announcementApi.getAnnouncements({ page: currentPage, pageSize })
    setAnnouncements(pageItems(data))
    setAnnouncementTotal(pageTotal(data))
    setAnnouncementPages(pageCount(data))
  } catch (error) {
    setAnnouncementError(error instanceof Error ? error.message : '公告加载失败')
  } finally {
    setAnnouncementLoading(false)
  }
}

const fetchNotifications = async () => {
  try {
    const params = { page: currentPage, pageSize }
    if (activeTab === 'unread') {
      await fetchPage({ ...params, isRead: false })
    } else if (activeTab === 'adoption') {
      await fetchPage({ ...params, type: 'ADOPT' })
      setAdoptionNotificationTotal(useNotificationStore.getState().total)
    } else {
      await fetchPage(params)
      setAllNotificationTotal(useNotificationStore.getState().total)
    }
  } catch (error) {
    console.error('Failed to load notifications', error)
  }
}

const fetchCurrentTab = () => isAnnouncementTab ? fetchAnnouncements() : fetchNotifications()

const openNotification = async (item: NotificationItem) => {
  if (!item.isRead) {
    try {
      await markAsRead(item.id)
    } catch (error) {
      console.error('Failed to mark notification as read', error)
    }
  }

  if (item.targetUrl?.startsWith('/')) {
    await navigate(item.targetUrl)
    return
  }

  const kind = notificationKind(item)
  if (kind === 'announcement' && item.relatedId) {
    await navigate(`/announcements/${item.relatedId}`)
    return
  }
  if (kind === 'new-cat' && item.payload?.catId) {
    await navigate(`/cats/${item.payload.catId}`)
    return
  }
  if (kind === 'adoption') {
    await navigate('/my-adoptions')
    return
  }
  if (kind === 'sos') await navigate('/my-sos')
}

const openAnnouncement = async (item: Announcement) => {
  markAnnouncementsSeen()
  await navigate(`/announcements/${item.id}`)
}

const handleMarkAllAsRead = async () => {
  setMarkingAllRead(true)
  try {
    await markAllAsRead()
    if (activeTab === 'unread') await fetchNotifications()
  } finally {
    setMarkingAllRead(false)
  }
}

const changePage = (page: number) => {
  if (page < 1 || page > displayedPages || page === currentPage) return
  setCurrentPage(page)
}

// watch(activeTab, ...)：跳过首次执行（Vue 的 watch 默认不 immediate）
const activeTabFirstRun = useRef(true)
useEffect(() => {
  if (activeTabFirstRun.current) {
    activeTabFirstRun.current = false
    return
  }
  if (currentPage !== 1) setCurrentPage(1)
  else void fetchCurrentTab()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 模拟 Vue watch(activeTab)
}, [activeTab])

// watch(currentPage, ...)：跳过首次执行（Vue 的 watch 默认不 immediate）
const currentPageFirstRun = useRef(true)
useEffect(() => {
  if (currentPageFirstRun.current) {
    currentPageFirstRun.current = false
    return
  }
  void fetchCurrentTab()
// eslint-disable-next-line react-hooks/exhaustive-deps -- 意图为仅挂载执行 / 模拟 Vue watch
}, [currentPage])

useEffect(() => {
  void (async () => {
    await Promise.allSettled([fetchPreview(), fetchCurrentTab(), fetchTabCounts()])
  })()
// eslint-disable-next-line react-hooks/exhaustive-deps -- 意图为仅挂载执行 / 模拟 Vue watch
}, [])

return (
  <div className="public-workbench min-h-full bg-gray-50 px-4 py-6 sm:px-6">
    <main className="mx-auto w-full max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-black pb-5">
        <div>
          <p className="text-sm font-bold text-[#116B5E]">NOTIFICATION CENTER</p>
          <h1 className="mt-1 text-2xl font-black text-gray-950">通知中心</h1>
          <p className="mt-1 text-sm text-gray-500">
            {unreadCount ? `你有 ${unreadCount} 条未读消息` : '暂无未读消息'}
          </p>
        </div>
        {!isAnnouncementTab ? (
          <Button
            variant="outline"
            className="border-2 border-black bg-white hover:bg-[#DDF8F2]"
            disabled={markingAllRead || unreadCount === 0}
            onClick={() => void handleMarkAllAsRead()}
          >
            {markingAllRead ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            全部已读
          </Button>
        ) : null}
      </header>

      <div className="mb-6 overflow-x-auto border-2 border-black bg-white p-3 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:min-w-max">
          {tabs.map((tab) => {
            const TabIcon = tab.icon
            return (
              <button
                key={tab.value}
                type="button"
                className={cn(
                  'flex h-10 min-w-0 items-center justify-center gap-2 border-2 px-2 text-sm font-bold transition-colors sm:px-4',
                  activeTab === tab.value
                    ? 'border-black bg-[#5CD6C2] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                    : 'border-transparent bg-gray-100 text-gray-600 hover:border-black hover:bg-[#DDF8F2]',
                )}
                onClick={() => setActiveTab(tab.value)}
              >
                <TabIcon className="h-4 w-4 shrink-0" />
                {tab.label}
                <span className="border border-black/20 bg-white/70 px-1.5 text-xs text-gray-700">
                  {tabCount(tab.value) > 99 ? '99+' : tabCount(tab.value)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <section className="overflow-hidden border-2 border-black bg-white shadow-[5px_5px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between border-b-2 border-black bg-[#F3F4F6] px-5 py-3">
          <span className="text-sm text-gray-500">当前共 {displayedTotal} 条</span>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center border-2 border-transparent text-gray-500 hover:border-black hover:bg-[#DDF8F2] hover:text-black"
            title="刷新"
            aria-label="刷新通知"
            onClick={() => void fetchCurrentTab()}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
        </div>

        {currentError ? (
          <div className="px-6 py-14 text-center">
            <Info className="mx-auto h-9 w-9 text-red-400" />
            <p className="mt-3 text-sm text-gray-600">{currentError}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void fetchCurrentTab()}>重新加载</Button>
          </div>
        ) : isLoading ? (
          <div className="divide-y-2 divide-gray-100">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex gap-4 p-5">
                <div className="h-10 w-10 animate-pulse bg-gray-100" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-1/3 animate-pulse bg-gray-100" />
                  <div className="h-3 w-3/4 animate-pulse bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : currentItemsLength === 0 ? (
          <div className="px-6 py-16 text-center">
            <Inbox className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">暂无相关消息</p>
          </div>
        ) : isAnnouncementTab ? (
          <div className="divide-y-2 divide-gray-100">
            {announcements.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex w-full gap-4 p-5 text-left transition-colors hover:bg-[#DDF8F2]"
                onClick={() => void openAnnouncement(item)}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black bg-[#5CD6C2] text-black">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-800">{item.title}</span>
                    <span className="border border-black/20 bg-[#DDF8F2] px-2 py-0.5 text-xs font-medium text-[#116B5E]">{announcementTypeLabel(item.type)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-500">{item.summary || item.content}</p>
                </div>
                <time className="hidden shrink-0 text-xs text-gray-400 sm:block">{formatTime(item.createTime)}</time>
              </button>
            ))}
          </div>
        ) : (
          <div className="divide-y-2 divide-gray-100">
            {visibleNotifications.map((item) => {
              const ItemIcon = notificationIcon(item)
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn('flex w-full gap-4 p-5 text-left transition-colors hover:bg-[#DDF8F2]', !item.isRead && 'bg-[#FFF8DE]')}
                  onClick={() => void openNotification(item)}
                >
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black bg-[#DDF8F2] text-[#116B5E]">
                    <ItemIcon className="h-5 w-5" />
                    {!item.isRead ? (
                      <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-black bg-[#FACC15] ring-2 ring-white" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('text-gray-800', !item.isRead ? 'font-bold' : 'font-semibold')}>{item.title}</span>
                      <span className="text-xs font-bold text-[#116B5E]">{notificationLabel(item)}</span>
                    </div>
                    {item.content ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-500">{item.content}</p> : null}
                  </div>
                  <time className="hidden shrink-0 text-xs text-gray-400 sm:block">{formatTime(item.createTime)}</time>
                </button>
              )
            })}
          </div>
        )}

        {displayedPages > 1 && !currentError ? (
          <footer className="flex items-center justify-between border-t-2 border-black bg-gray-50 px-5 py-4">
            <span className="text-sm text-gray-500">第 {currentPage} / {displayedPages} 页</span>
            <div className="flex gap-2">
              <Button variant="outline" size="icon-sm" className="border-2 border-black bg-white hover:bg-[#DDF8F2]" disabled={currentPage <= 1} onClick={() => changePage(currentPage - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon-sm" className="border-2 border-black bg-white hover:bg-[#DDF8F2]" disabled={currentPage >= displayedPages} onClick={() => changePage(currentPage + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </footer>
        ) : null}
      </section>
    </main>
  </div>
)
}
