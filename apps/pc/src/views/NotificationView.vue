<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
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
} from 'lucide-vue-next'
import { announcementApi, notificationApi } from '@/lib/api'
import { useNotificationStore } from '@/stores/notifications'
import { AnnouncementTypeMap, type Announcement, type FlexiblePageResult, type NotificationItem } from '@/types'
import { Button } from '@/components/ui/button'

type TabValue = 'all' | 'unread' | 'adoption' | 'announcements'
type NotificationKind = 'adoption' | 'sos' | 'announcement' | 'new-cat' | 'system'

interface TabItem {
  label: string
  value: TabValue
  icon: Component
}

const router = useRouter()
const notificationStore = useNotificationStore()
const { notifications, unreadCount, total, totalPages, loading, errorMessage } = storeToRefs(notificationStore)

const activeTab = ref<TabValue>('all')
const currentPage = ref(1)
const pageSize = 10
const allNotificationTotal = ref(0)
const adoptionNotificationTotal = ref(0)
const announcements = ref<Announcement[]>([])
const announcementTotal = ref(0)
const announcementPages = ref(1)
const announcementLoading = ref(false)
const announcementError = ref('')
const markingAllRead = ref(false)

const tabs: TabItem[] = [
  { label: '全部通知', value: 'all', icon: Bell },
  { label: '未读', value: 'unread', icon: Info },
  { label: '领养进度', value: 'adoption', icon: HeartHandshake },
  { label: '系统公告', value: 'announcements', icon: Megaphone },
]

const pageItems = <T>(data: FlexiblePageResult<T>): T[] => data.items || data.records || data.list || []
const pageTotal = <T>(data: FlexiblePageResult<T>) => Number(data.total ?? pageItems(data).length)
const pageCount = <T>(data: FlexiblePageResult<T>) => {
  const reportedPages = Number(data.totalPage ?? data.pages)
  if (Number.isFinite(reportedPages) && reportedPages > 0) return reportedPages
  const resolvedPageSize = Number(data.size ?? pageSize)
  return Math.max(Math.ceil(pageTotal(data) / resolvedPageSize), 1)
}
const isAnnouncementTab = computed(() => activeTab.value === 'announcements')
const isLoading = computed(() => isAnnouncementTab.value ? announcementLoading.value : loading.value)
const currentError = computed(() => isAnnouncementTab.value ? announcementError.value : errorMessage.value)
const displayedTotal = computed(() => isAnnouncementTab.value ? announcementTotal.value : total.value)
const displayedPages = computed(() => isAnnouncementTab.value ? announcementPages.value : totalPages.value)

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

const visibleNotifications = computed(() => notifications.value)

const currentItemsLength = computed(() => isAnnouncementTab.value
  ? announcements.value.length
  : visibleNotifications.value.length)

const tabCount = (value: TabValue) => {
  if (value === 'unread') return unreadCount.value
  if (value === 'all') return allNotificationTotal.value
  if (value === 'adoption') return adoptionNotificationTotal.value
  return announcementTotal.value
}

const fetchTabCounts = async () => {
  const [allResult, adoptionResult, announcementResult] = await Promise.allSettled([
    notificationApi.getNotifications({ page: 1, pageSize: 1 }),
    notificationApi.getNotifications({ type: 'ADOPT', page: 1, pageSize: 1 }),
    announcementApi.getAnnouncements({ page: 1, pageSize: 1 }),
  ])

  if (allResult.status === 'fulfilled') allNotificationTotal.value = pageTotal(allResult.value)
  if (adoptionResult.status === 'fulfilled') adoptionNotificationTotal.value = pageTotal(adoptionResult.value)
  if (announcementResult.status === 'fulfilled') announcementTotal.value = pageTotal(announcementResult.value)
}

const fetchAnnouncements = async () => {
  announcementLoading.value = true
  announcementError.value = ''
  try {
    const data = await announcementApi.getAnnouncements({ page: currentPage.value, pageSize })
    announcements.value = pageItems(data)
    announcementTotal.value = pageTotal(data)
    announcementPages.value = pageCount(data)
  } catch (error) {
    announcementError.value = error instanceof Error ? error.message : '公告加载失败'
  } finally {
    announcementLoading.value = false
  }
}

const fetchNotifications = async () => {
  try {
    const params = { page: currentPage.value, pageSize }
    if (activeTab.value === 'unread') {
      await notificationStore.fetchPage({ ...params, isRead: false })
    } else if (activeTab.value === 'adoption') {
      await notificationStore.fetchPage({ ...params, type: 'ADOPT' })
      adoptionNotificationTotal.value = total.value
    } else {
      await notificationStore.fetchPage(params)
      allNotificationTotal.value = total.value
    }
  } catch (error) {
    console.error('Failed to load notifications', error)
  }
}

const fetchCurrentTab = () => isAnnouncementTab.value ? fetchAnnouncements() : fetchNotifications()

const openNotification = async (item: NotificationItem) => {
  if (!item.isRead) {
    try {
      await notificationStore.markAsRead(item.id)
    } catch (error) {
      console.error('Failed to mark notification as read', error)
    }
  }

  if (item.targetUrl?.startsWith('/')) {
    await router.push(item.targetUrl)
    return
  }

  const kind = notificationKind(item)
  if (kind === 'announcement' && item.relatedId) {
    await router.push(`/announcements/${item.relatedId}`)
    return
  }
  if (kind === 'new-cat' && item.payload?.catId) {
    await router.push({ name: 'cat-detail', params: { id: item.payload.catId } })
    return
  }
  if (kind === 'adoption') {
    await router.push('/my-adoptions')
    return
  }
  if (kind === 'sos') await router.push('/my-sos')
}

const openAnnouncement = async (item: Announcement) => {
  notificationStore.markAnnouncementsSeen()
  await router.push(`/announcements/${item.id}`)
}

const handleMarkAllAsRead = async () => {
  markingAllRead.value = true
  try {
    await notificationStore.markAllAsRead()
    if (activeTab.value === 'unread') await fetchNotifications()
  } finally {
    markingAllRead.value = false
  }
}

const changePage = (page: number) => {
  if (page < 1 || page > displayedPages.value || page === currentPage.value) return
  currentPage.value = page
}

watch(activeTab, () => {
  if (currentPage.value !== 1) currentPage.value = 1
  else void fetchCurrentTab()
})

watch(currentPage, () => void fetchCurrentTab())

onMounted(async () => {
  await Promise.allSettled([notificationStore.fetchPreview(), fetchCurrentTab(), fetchTabCounts()])
})
</script>

<template>
  <div class="public-workbench min-h-full bg-gray-50 px-4 py-6 sm:px-6">
    <main class="mx-auto w-full max-w-6xl">
      <header class="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-black pb-5">
        <div>
          <p class="text-sm font-bold text-[#116B5E]">NOTIFICATION CENTER</p>
          <h1 class="mt-1 text-2xl font-black text-gray-950">通知中心</h1>
          <p class="mt-1 text-sm text-gray-500">
            {{ unreadCount ? `你有 ${unreadCount} 条未读消息` : '暂无未读消息' }}
          </p>
        </div>
        <Button
          v-if="!isAnnouncementTab"
          variant="outline"
          class="border-2 border-black bg-white hover:bg-[#DDF8F2]"
          :disabled="markingAllRead || unreadCount === 0"
          @click="handleMarkAllAsRead"
        >
          <LoaderCircle v-if="markingAllRead" class="h-4 w-4 animate-spin" />
          <CheckCheck v-else class="h-4 w-4" />
          全部已读
        </Button>
      </header>

      <div class="mb-6 overflow-x-auto border-2 border-black bg-white p-3 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
        <div class="flex min-w-max gap-2">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            :class="[
              'flex h-10 items-center gap-2 border-2 px-4 text-sm font-bold transition-colors',
              activeTab === tab.value
                ? 'border-black bg-[#5CD6C2] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                : 'border-transparent bg-gray-100 text-gray-600 hover:border-black hover:bg-[#DDF8F2]',
            ]"
            @click="activeTab = tab.value"
          >
            <component :is="tab.icon" class="h-4 w-4" />
            {{ tab.label }}
            <span class="border border-black/20 bg-white/70 px-1.5 text-xs text-gray-700">
              {{ tabCount(tab.value) > 99 ? '99+' : tabCount(tab.value) }}
            </span>
          </button>
        </div>
      </div>

      <section class="overflow-hidden border-2 border-black bg-white shadow-[5px_5px_0px_rgba(0,0,0,1)]">
        <div class="flex items-center justify-between border-b-2 border-black bg-[#F3F4F6] px-5 py-3">
          <span class="text-sm text-gray-500">当前共 {{ displayedTotal }} 条</span>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center border-2 border-transparent text-gray-500 hover:border-black hover:bg-[#DDF8F2] hover:text-black"
            title="刷新"
            aria-label="刷新通知"
            @click="fetchCurrentTab"
          >
            <RefreshCw :class="['h-4 w-4', isLoading && 'animate-spin']" />
          </button>
        </div>

        <div v-if="currentError" class="px-6 py-14 text-center">
          <Info class="mx-auto h-9 w-9 text-red-400" />
          <p class="mt-3 text-sm text-gray-600">{{ currentError }}</p>
          <Button variant="outline" size="sm" class="mt-4" @click="fetchCurrentTab">重新加载</Button>
        </div>

        <div v-else-if="isLoading" class="divide-y-2 divide-gray-100">
          <div v-for="index in 5" :key="index" class="flex gap-4 p-5">
            <div class="h-10 w-10 animate-pulse bg-gray-100" />
            <div class="flex-1 space-y-2 py-1">
              <div class="h-3 w-1/3 animate-pulse bg-gray-100" />
              <div class="h-3 w-3/4 animate-pulse bg-gray-100" />
            </div>
          </div>
        </div>

        <div v-else-if="currentItemsLength === 0" class="px-6 py-16 text-center">
          <Inbox class="mx-auto h-10 w-10 text-gray-300" />
          <p class="mt-3 text-sm text-gray-500">暂无相关消息</p>
        </div>

        <div v-else-if="isAnnouncementTab" class="divide-y-2 divide-gray-100">
          <button
            v-for="item in announcements"
            :key="item.id"
            type="button"
            class="flex w-full gap-4 p-5 text-left transition-colors hover:bg-[#DDF8F2]"
            @click="openAnnouncement(item)"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black bg-[#5CD6C2] text-black">
              <Megaphone class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-semibold text-gray-800">{{ item.title }}</span>
                <span class="border border-black/20 bg-[#DDF8F2] px-2 py-0.5 text-xs font-medium text-[#116B5E]">{{ announcementTypeLabel(item.type) }}</span>
              </div>
              <p class="mt-1 line-clamp-2 text-sm leading-6 text-gray-500">{{ item.summary || item.content }}</p>
            </div>
            <time class="hidden shrink-0 text-xs text-gray-400 sm:block">{{ formatTime(item.createTime) }}</time>
          </button>
        </div>

        <div v-else class="divide-y-2 divide-gray-100">
          <button
            v-for="item in visibleNotifications"
            :key="item.id"
            type="button"
            :class="['flex w-full gap-4 p-5 text-left transition-colors hover:bg-[#DDF8F2]', !item.isRead && 'bg-[#FFF8DE]']"
            @click="openNotification(item)"
          >
            <div class="relative flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black bg-[#DDF8F2] text-[#116B5E]">
              <component :is="notificationIcon(item)" class="h-5 w-5" />
              <span v-if="!item.isRead" class="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-black bg-[#FACC15] ring-2 ring-white" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span :class="['text-gray-800', !item.isRead ? 'font-bold' : 'font-semibold']">{{ item.title }}</span>
                <span class="text-xs font-bold text-[#116B5E]">{{ notificationLabel(item) }}</span>
              </div>
              <p v-if="item.content" class="mt-1 line-clamp-2 text-sm leading-6 text-gray-500">{{ item.content }}</p>
            </div>
            <time class="hidden shrink-0 text-xs text-gray-400 sm:block">{{ formatTime(item.createTime) }}</time>
          </button>
        </div>

        <footer v-if="displayedPages > 1 && !currentError" class="flex items-center justify-between border-t-2 border-black bg-gray-50 px-5 py-4">
          <span class="text-sm text-gray-500">第 {{ currentPage }} / {{ displayedPages }} 页</span>
          <div class="flex gap-2">
            <Button variant="outline" size="icon-sm" class="border-2 border-black bg-white hover:bg-[#DDF8F2]" :disabled="currentPage <= 1" @click="changePage(currentPage - 1)">
              <ChevronLeft class="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon-sm" class="border-2 border-black bg-white hover:bg-[#DDF8F2]" :disabled="currentPage >= displayedPages" @click="changePage(currentPage + 1)">
              <ChevronRight class="h-4 w-4" />
            </Button>
          </div>
        </footer>
      </section>
    </main>
  </div>
</template>
