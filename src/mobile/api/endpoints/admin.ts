import { apiRequest } from '@/api/client'
import { stripQueryContext } from '@/api/endpoints/utils'
import type { ApiResult } from '@/types/api'
import { asRecord, toPaged } from '@/utils/format'

export function getAdminDashboardStats(): Promise<ApiResult<Record<string, unknown>>> {
  return apiRequest({ method: 'GET', url: '/admin/dashboard/stats' })
}

export type GetAdminUsersParams = {
  campus?: number
  search?: string
  page?: number
  size?: number
}

export function getAdminUsers(): Promise<ApiResult<Record<string, unknown>>>
export function getAdminUsers(params: GetAdminUsersParams): Promise<ApiResult<Record<string, unknown>>>
export function getAdminUsers(params?: GetAdminUsersParams): Promise<ApiResult<Record<string, unknown>>> {
  return apiRequest({ method: 'GET', url: '/admin/users', params: stripQueryContext<GetAdminUsersParams>(params) })
}

export function getAdminUserDetail(id: string): Promise<ApiResult<Record<string, unknown>>> {
  return apiRequest({ method: 'GET', url: `/admin/users/${id}` })
}

export function banAdminUser(id: string, payload?: Record<string, unknown>): Promise<ApiResult<Record<string, unknown>>> {
  return apiRequest({ method: 'POST', url: `/admin/users/${id}/ban`, data: payload })
}

export function getAdminAudit(): Promise<ApiResult<Record<string, unknown>>> {
  return apiRequest({ method: 'GET', url: '/admin/audit' })
}

export function runAdminAudit(id: string, payload: Record<string, unknown>): Promise<ApiResult<Record<string, unknown>>> {
  return apiRequest({ method: 'POST', url: `/admin/audit/${id}`, data: payload })
}

export type GetAdminAnnouncementsParams = {
  page?: number
  pageSize?: number
  size?: number
  type?: string | number
  status?: string
}

export function getAdminAnnouncements(): Promise<ApiResult<Record<string, unknown>>>
export function getAdminAnnouncements(params: GetAdminAnnouncementsParams): Promise<ApiResult<Record<string, unknown>>>
export function getAdminAnnouncements(params?: GetAdminAnnouncementsParams): Promise<ApiResult<Record<string, unknown>>> {
  return apiRequest({ method: 'GET', url: '/admin/announcements', params: stripQueryContext<GetAdminAnnouncementsParams>(params) })
}

/** 管理接口仅提供分页列表，草稿也必须从这里读取，不能使用公开公告详情。 */
export async function getAdminAnnouncementForEdit(id: string): Promise<Record<string, unknown>> {
  const pageSize = 100
  const visited = new Set<string>()
  let loaded = 0
  for (let page = 1; ; page += 1) {
    const result = await getAdminAnnouncements({ page, size: pageSize, pageSize })
    if (typeof result.code === 'number' && result.code >= 400) {
      throw new Error(result.message || '公告加载失败，请稍后重试')
    }
    const paged = toPaged<Record<string, unknown>>(result.data)
    const signature = paged.items.map((item) => String(item.id ?? item.announcementId ?? item.noticeId)).join(',')
    if (!paged.items.length || visited.has(signature)) break
    visited.add(signature)
    loaded += paged.items.length
    const matched = paged.items.find((item) => String(item.id ?? item.announcementId ?? item.noticeId) === id)
    if (matched) return asRecord(matched)
    const response = asRecord(result.data)
    const hasTotal = response.total !== undefined || response.totalElements !== undefined
    const hasPages = paged.pages > 0
    if (hasPages && page >= paged.pages) break
    if (!hasPages && hasTotal && loaded >= paged.total) break
    if (!hasPages && !hasTotal && paged.items.length < pageSize) break
  }
  throw new Error('未找到此公告，可能已被删除，请返回公告列表确认')
}

export function upsertAdminAnnouncement(payload: Record<string, unknown>, id?: string): Promise<ApiResult<Record<string, unknown>>> {
  return apiRequest({ method: id ? 'PUT' : 'POST', url: id ? `/admin/announcements/${id}` : '/admin/announcements', data: payload })
}

export function deleteAdminAnnouncement(id: string): Promise<ApiResult<Record<string, unknown>>> {
  return apiRequest({ method: 'DELETE', url: `/admin/announcements/${id}` })
}

export function getAdminCats(): Promise<ApiResult<Record<string, unknown>>> {
  return apiRequest({ method: 'GET', url: '/admin/cats' })
}

export function upsertAdminCat(payload: Record<string, unknown>, id?: string): Promise<ApiResult<Record<string, unknown>>> {
  return apiRequest({ method: id ? 'PUT' : 'POST', url: id ? `/admin/cats/${id}` : '/admin/cats', data: payload })
}

export function deleteAdminCat(id: string): Promise<ApiResult<Record<string, unknown>>> {
  return apiRequest({ method: 'DELETE', url: `/admin/cats/${id}` })
}

export function getAdminCatImageKeys(id: string): Promise<ApiResult<Record<string, unknown>>> {
  return apiRequest({ method: 'GET', url: `/admin/cats/${id}/image-keys` })
}

export type GetAdminNewCatsParams = {
  status?: string
  page?: number
  pageSize?: number
}

export function getAdminNewCats(): Promise<ApiResult<Record<string, unknown>>>
export function getAdminNewCats(params: GetAdminNewCatsParams): Promise<ApiResult<Record<string, unknown>>>
export function getAdminNewCats(params?: GetAdminNewCatsParams): Promise<ApiResult<Record<string, unknown>>> {
  return apiRequest({ method: 'GET', url: '/admin/new-cats', params: stripQueryContext<GetAdminNewCatsParams>(params) })
}

export function approveAdminNewCat(id: string, payload: Record<string, unknown> = {}): Promise<ApiResult<Record<string, unknown>>> {
  return apiRequest({ method: 'POST', url: `/admin/new-cats/${id}/approve`, data: payload })
}

export function rejectAdminNewCat(id: string, payload: Record<string, unknown>): Promise<ApiResult<Record<string, unknown>>> {
  return apiRequest({ method: 'POST', url: `/admin/new-cats/${id}/reject`, data: payload })
}
