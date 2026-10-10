import { create } from 'zustand'
import { announcementApi, notificationApi } from '@pc/lib/api'
import { getAccessToken } from '@pc/lib/auth'
import { getSessionRevision } from '@shared/session'
import { useAuthStore } from '@shared/auth.store'
import { ANNOUNCEMENT_SEEN_EVENT, getNewAnnouncementCount, markAnnouncementsSeen, readAnnouncementSeenAt } from '@shared/announcementNotifications'
import type {
  Announcement,
  FlexiblePageResult,
  NotificationItem,
  NotificationQueryParams
} from '@pc/types'

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

interface NotificationStore {
  notifications: NotificationItem[]
  previewNotifications: NotificationItem[]
  latestAnnouncements: Announcement[]
  unreadCount: number
  total: number
  totalPages: number
  loading: boolean
  errorMessage: string
  previewLoading: boolean
  announcementSeenAt: number
  badgeCount: () => number
  fetchPage: (params?: NotificationQueryParams) => Promise<NotificationItem[]>
  fetchPreview: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  markAnnouncementsSeen: () => void
  startPolling: () => void
  stopPolling: () => void
  reset: () => void
}

let pollTimer: number | undefined
let pageRequestId = 0

export const useNotificationStore = create<NotificationStore>()((set, get) => {
  const fetchAnnouncements = async () => {
    const data = await announcementApi.getAnnouncements({ page: 1, pageSize: 100 })
    set({ latestAnnouncements: pageItems(data) })
  }

  const refreshWhenVisible = () => {
    if (document.visibilityState === 'visible') void get().fetchPreview()
  }

  const stopPolling = () => {
    if (pollTimer !== undefined) {
      window.clearInterval(pollTimer)
      pollTimer = undefined
    }
    window.removeEventListener('focus', refreshWhenVisible)
    document.removeEventListener('visibilitychange', refreshWhenVisible)
  }

  return {
    notifications: [],
    previewNotifications: [],
    latestAnnouncements: [],
    unreadCount: 0,
    total: 0,
    totalPages: 1,
    loading: false,
    errorMessage: '',
    previewLoading: false,
    announcementSeenAt: readAnnouncementSeenAt(),
    badgeCount: () => {
      const { unreadCount, latestAnnouncements, announcementSeenAt } = get()
      return unreadCount + getNewAnnouncementCount(latestAnnouncements, announcementSeenAt)
    },

    fetchPage: async (params: NotificationQueryParams = {}) => {
      const requestId = ++pageRequestId
      set({ loading: true, errorMessage: '' })
      try {
        const requestParams = { page: 1, pageSize: 20, ...params }
        const data = await notificationApi.getNotifications(requestParams)
        const rawItems = pageItems(data)
        const items = rawItems.map(normalizeNotification)

        if (requestId === pageRequestId) {
          const resolvedTotal = pageTotal(data)
          set({
            notifications: items,
            total: resolvedTotal,
            totalPages: pageCount(data, requestParams.pageSize),
            ...(requestParams.isRead === false ? { unreadCount: resolvedTotal } : {}),
          })
        }
        return items
      } catch (error) {
        if (requestId === pageRequestId) {
          set({ errorMessage: error instanceof Error ? error.message : '通知加载失败' })
        }
        throw error
      } finally {
        if (requestId === pageRequestId) set({ loading: false })
      }
    },

    fetchPreview: async () => {
      const revision = getSessionRevision('user')
      set({ previewLoading: true })
      try {
        const tasks: Promise<unknown>[] = [fetchAnnouncements()]

        if (getAccessToken()) {
          tasks.push(
            notificationApi.getNotifications({ page: 1, pageSize: 5 }).then((data) => {
              if (revision === getSessionRevision('user')) set({ previewNotifications: pageItems(data).map(normalizeNotification) })
            }),
            notificationApi.getNotifications({ isRead: false, page: 1, pageSize: 1 }).then((data) => {
              if (revision === getSessionRevision('user')) set({ unreadCount: pageTotal(data) })
            })
          )
        } else {
          set({
            previewNotifications: [],
            unreadCount: 0,
          })
        }

        await Promise.allSettled(tasks)
      } finally {
        if (revision === getSessionRevision('user')) set({ previewLoading: false })
      }
    },

    markAsRead: async (id: string) => {
      const { notifications, previewNotifications, unreadCount } = get()
      const target = [...notifications, ...previewNotifications].find((item) => item.id === id)
      await notificationApi.markAsRead(id)

      set({
        notifications: notifications.map((item) => item.id === id ? { ...item, isRead: true } : item),
        previewNotifications: previewNotifications.map((item) => item.id === id ? { ...item, isRead: true } : item),
        ...(target && !target.isRead ? { unreadCount: Math.max(0, unreadCount - 1) } : {}),
      })
    },

    markAllAsRead: async () => {
      await notificationApi.markAllAsRead()
      const { notifications, previewNotifications } = get()
      set({
        notifications: notifications.map((item) => ({ ...item, isRead: true })),
        previewNotifications: previewNotifications.map((item) => ({ ...item, isRead: true })),
        unreadCount: 0,
      })
    },

    markAnnouncementsSeen: () => {
      markAnnouncementsSeen()
      set({ announcementSeenAt: readAnnouncementSeenAt() })
    },

    startPolling: () => {
      stopPolling()
      void get().fetchPreview()
      pollTimer = window.setInterval(refreshWhenVisible, POLL_INTERVAL)
      window.addEventListener('focus', refreshWhenVisible)
      document.addEventListener('visibilitychange', refreshWhenVisible)
    },

    stopPolling,

    reset: () => {
      set({
        notifications: [],
        previewNotifications: [],
        unreadCount: 0,
        total: 0,
        totalPages: 1,
        errorMessage: '',
        loading: false,
        previewLoading: false,
      })
      pageRequestId += 1
      stopPolling()
    },
  }
})

useAuthStore.subscribe((state, previous) => {
  if (state.authRevision !== previous.authRevision || state.role !== previous.role) useNotificationStore.getState().reset()
})
const syncAnnouncementSeen = () => useNotificationStore.setState({ announcementSeenAt: readAnnouncementSeenAt() })
window.addEventListener(ANNOUNCEMENT_SEEN_EVENT, syncAnnouncementSeen)
window.addEventListener('storage', syncAnnouncementSeen)
