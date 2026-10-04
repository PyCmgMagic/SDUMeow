import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { announcementApi, notificationApi } from '@/lib/api'
import { getAccessToken } from '@/lib/auth'
import type {
  Announcement,
  FlexiblePageResult,
  NotificationItem,
  NotificationQueryParams
} from '@/types'

const ANNOUNCEMENT_SEEN_KEY = 'lastSeenAnnouncementId'
const POLL_INTERVAL = 45_000

const pageItems = <T>(data: FlexiblePageResult<T> | T[] | undefined): T[] => {
  if (Array.isArray(data)) return data
  return data?.items || data?.records || data?.list || []
}

const pageTotal = <T>(data: FlexiblePageResult<T> | T[] | undefined): number => {
  if (Array.isArray(data)) return data.length
  return Number(data?.total ?? pageItems(data).length)
}

const pageCount = <T>(
  data: FlexiblePageResult<T> | T[] | undefined,
  requestedPageSize: number,
): number => {
  if (Array.isArray(data)) return 1
  const reportedPages = Number(data?.totalPage ?? data?.pages)
  if (Number.isFinite(reportedPages) && reportedPages > 0) return reportedPages

  const resolvedPageSize = Number(data?.size ?? requestedPageSize)
  if (!Number.isFinite(resolvedPageSize) || resolvedPageSize <= 0) return 1
  return Math.max(Math.ceil(pageTotal(data) / resolvedPageSize), 1)
}

const normalizeNotification = (raw: NotificationItem | Record<string, unknown>): NotificationItem => {
  const value = raw as Record<string, unknown>
  const readValue = value.isRead ?? value.read ?? value.readStatus
  const isRead = readValue === true || readValue === 1 || readValue === '1' || readValue === 'READ'
  const payload = value.payload && typeof value.payload === 'object'
    ? value.payload as Record<string, unknown>
    : {}
  const type = value.type ?? value.notificationType ?? 'SYSTEM'
  const payloadRelatedId = payload.announcementId
    ?? payload.adoptionId
    ?? payload.sosId
    ?? payload.catId
    ?? payload.clueId
  const relatedId = value.relatedId ?? value.bizId ?? payloadRelatedId
  const targetUrl = value.targetUrl ?? value.url ?? payload.targetUrl

  return {
    id: String(value.id ?? value.notificationId ?? ''),
    type: type as string | number,
    title: String(value.title ?? value.subject ?? value.message ?? '系统通知'),
    content: String(value.content ?? value.message ?? value.description ?? ''),
    isRead,
    payload: {
      announcementId: payload.announcementId ? String(payload.announcementId) : undefined,
      sosId: payload.sosId ? String(payload.sosId) : undefined,
      adoptionId: payload.adoptionId ? String(payload.adoptionId) : undefined,
      catId: payload.catId ? String(payload.catId) : undefined,
      clueId: payload.clueId ? String(payload.clueId) : undefined,
      status: typeof payload.status === 'string' || typeof payload.status === 'number' ? payload.status : undefined,
      targetUrl: payload.targetUrl ? String(payload.targetUrl) : undefined,
    },
    relatedId: relatedId ? String(relatedId) : undefined,
    relatedType: value.relatedType ? String(value.relatedType) : String(type),
    targetUrl: targetUrl ? String(targetUrl) : undefined,
    createTime: String(value.createTime ?? value.createdAt ?? value.create_time ?? '')
  }
}

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<NotificationItem[]>([])
  const previewNotifications = ref<NotificationItem[]>([])
  const latestAnnouncements = ref<Announcement[]>([])
  const unreadCount = ref(0)
  const total = ref(0)
  const totalPages = ref(1)
  const loading = ref(false)
  const errorMessage = ref('')
  const previewLoading = ref(false)
  const lastSeenAnnouncementId = ref(localStorage.getItem(ANNOUNCEMENT_SEEN_KEY) || '')
  let pollTimer: number | undefined
  let pageRequestId = 0

  const hasNewAnnouncement = computed(() => {
    const latestId = latestAnnouncements.value[0]?.id
    return Boolean(latestId && latestId !== lastSeenAnnouncementId.value)
  })

  const badgeCount = computed(() => unreadCount.value + (hasNewAnnouncement.value ? 1 : 0))

  const fetchPage = async (params: NotificationQueryParams = {}) => {
    const requestId = ++pageRequestId
    loading.value = true
    errorMessage.value = ''
    try {
      const requestParams = { page: 1, pageSize: 20, ...params }
      const data = await notificationApi.getNotifications(requestParams)
      const rawItems = pageItems(data)
      const items = rawItems.map(normalizeNotification)

      if (requestId === pageRequestId) {
        const resolvedTotal = pageTotal(data)
        notifications.value = items
        total.value = resolvedTotal
        totalPages.value = pageCount(data, requestParams.pageSize)
        if (requestParams.isRead === false) unreadCount.value = resolvedTotal
      }
      return items
    } catch (error) {
      if (requestId === pageRequestId) {
        errorMessage.value = error instanceof Error ? error.message : '通知加载失败'
      }
      throw error
    } finally {
      if (requestId === pageRequestId) loading.value = false
    }
  }

  const fetchAnnouncements = async () => {
    const data = await announcementApi.getAnnouncements({ page: 1, pageSize: 5 })
    latestAnnouncements.value = pageItems(data)
  }

  const fetchPreview = async () => {
    previewLoading.value = true
    try {
      const tasks: Promise<unknown>[] = [fetchAnnouncements()]

      if (getAccessToken()) {
        tasks.push(
          notificationApi.getNotifications({ page: 1, pageSize: 5 }).then((data) => {
            previewNotifications.value = pageItems(data).map(normalizeNotification)
          }),
          notificationApi.getNotifications({ isRead: false, page: 1, pageSize: 1 }).then((data) => {
            unreadCount.value = pageTotal(data)
          })
        )
      } else {
        previewNotifications.value = []
        unreadCount.value = 0
      }

      await Promise.allSettled(tasks)
    } finally {
      previewLoading.value = false
    }
  }

  const markAsRead = async (id: string) => {
    const target = [...notifications.value, ...previewNotifications.value].find((item) => item.id === id)
    await notificationApi.markAsRead(id)

    notifications.value = notifications.value.map((item) => item.id === id ? { ...item, isRead: true } : item)
    previewNotifications.value = previewNotifications.value.map((item) => item.id === id ? { ...item, isRead: true } : item)
    if (target && !target.isRead) unreadCount.value = Math.max(0, unreadCount.value - 1)
  }

  const markAllAsRead = async () => {
    await notificationApi.markAllAsRead()
    notifications.value = notifications.value.map((item) => ({ ...item, isRead: true }))
    previewNotifications.value = previewNotifications.value.map((item) => ({ ...item, isRead: true }))
    unreadCount.value = 0
  }

  const markAnnouncementsSeen = () => {
    const latestId = latestAnnouncements.value[0]?.id
    if (!latestId) return
    lastSeenAnnouncementId.value = latestId
    localStorage.setItem(ANNOUNCEMENT_SEEN_KEY, latestId)
  }

  const refreshWhenVisible = () => {
    if (document.visibilityState === 'visible') void fetchPreview()
  }

  const startPolling = () => {
    stopPolling()
    void fetchPreview()
    pollTimer = window.setInterval(refreshWhenVisible, POLL_INTERVAL)
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
  }

  const stopPolling = () => {
    if (pollTimer !== undefined) {
      window.clearInterval(pollTimer)
      pollTimer = undefined
    }
    window.removeEventListener('focus', refreshWhenVisible)
    document.removeEventListener('visibilitychange', refreshWhenVisible)
  }

  const reset = () => {
    notifications.value = []
    previewNotifications.value = []
    unreadCount.value = 0
    total.value = 0
    totalPages.value = 1
    errorMessage.value = ''
    pageRequestId += 1
    stopPolling()
  }

  return {
    notifications,
    previewNotifications,
    latestAnnouncements,
    unreadCount,
    badgeCount,
    total,
    totalPages,
    loading,
    errorMessage,
    previewLoading,
    fetchPage,
    fetchPreview,
    markAsRead,
    markAllAsRead,
    markAnnouncementsSeen,
    startPolling,
    stopPolling,
    reset
  }
})
