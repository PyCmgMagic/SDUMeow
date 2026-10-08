import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as Antd from 'antd'

import { MobileLayout as CatDetailPage } from '../../src/pages/cat-detail/MobileLayout'
import type { ApiResult } from '@/types/api'

const catsApiMocks = vi.hoisted(() => ({
  feedCat: vi.fn(),
  getCatDetail: vi.fn(),
}))

const momentsApiMocks = vi.hoisted(() => ({
  deleteMoment: vi.fn(),
  getMoments: vi.fn(),
  likeMoment: vi.fn(),
  unlikeMoment: vi.fn(),
}))

const userApiMocks = vi.hoisted(() => ({
  getMe: vi.fn(),
}))

const typesApiMocks = vi.hoisted(() => ({
  getColors: vi.fn(), getLocations: vi.fn(), getRoles: vi.fn(), getTags: vi.fn(),
}))

const antdMocks = vi.hoisted(() => ({
  modalSuccess: vi.fn(),
  messageError: vi.fn(),
  messageSuccess: vi.fn(),
}))

vi.mock('@/api/endpoints/cats', () => ({
  feedCat: catsApiMocks.feedCat,
  getCatDetail: catsApiMocks.getCatDetail,
}))

vi.mock('@/api/endpoints/moments', () => ({
  deleteMoment: momentsApiMocks.deleteMoment,
  getMoments: momentsApiMocks.getMoments,
  likeMoment: momentsApiMocks.likeMoment,
  unlikeMoment: momentsApiMocks.unlikeMoment,
}))

vi.mock('@/api/endpoints/user', () => ({
  getMe: userApiMocks.getMe,
}))

vi.mock('@/api/endpoints/types', () => typesApiMocks)

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof Antd>('antd')
  return {
    ...actual,
    Modal: { ...actual.Modal, success: antdMocks.modalSuccess },
    message: { ...actual.message, error: antdMocks.messageError, success: antdMocks.messageSuccess },
  }
})

function apiResult<T>(data: T): ApiResult<T> {
  return {
    data,
    code: 200,
    message: 'ok',
    raw: { code: 200, data, msg: 'ok' },
  }
}

function renderCatDetail() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 15_000 },
      mutations: { retry: false },
    },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/cats/cat-1']}>
        <Routes>
          <Route element={<CatDetailPage />} path="/cats/:id" />
          <Route element={<p>领养申请 cat-1</p>} path="/adopt" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return queryClient
}

describe('CatDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    typesApiMocks.getColors.mockResolvedValue(apiResult([{ id: 1, label: '橘白' }]))
    typesApiMocks.getLocations.mockResolvedValue(apiResult([{ id: 1, label: '食堂北侧花坛' }]))
    typesApiMocks.getRoles.mockResolvedValue(apiResult([]))
    typesApiMocks.getTags.mockResolvedValue(apiResult([{ id: 1, name: '亲人' }]))
    catsApiMocks.getCatDetail.mockResolvedValue(
      apiResult({
        id: 'cat-1',
        name: 'Mimi',
        avatar: '',
        images: [],
        basicInfo: {
          status: '在校',
          role: '校园猫',
          campus: '软件园校区',
          hauntLocation: '教学楼',
          neutered: { isNeutered: false },
        },
        attributes: {
          friendliness: 8,
          gluttony: 8,
          fight: 3,
          appearance: 9,
        },
        tags: [],
        relationship: [],
        description: '',
        popularity: 10,
      }),
    )
    momentsApiMocks.getMoments.mockResolvedValue(apiResult({ items: [] }))
    momentsApiMocks.deleteMoment.mockResolvedValue(apiResult({}))
    userApiMocks.getMe.mockResolvedValue(apiResult({ currency: 5, stats: { feedCount: 2 } }))
    catsApiMocks.feedCat.mockResolvedValue(apiResult({ userCurrency: 4 }))
  })

  it('renders the full archive and opens adoption for this cat', async () => {
    catsApiMocks.getCatDetail.mockResolvedValue(apiResult({
      id: 'cat-1', name: '橘座', aliases: ['大橘', '橘部长'],
      basicInfo: {
        color: 1, gender: 1, campus: 5, status: '在校', hauntLocation: 1,
        healthStatus: 0, lastSeenTime: '2026-10-01T17:40:00',
        neutered: { isNeutered: true, neuteredDate: '2024-03-12' },
      },
      tags: [1], popularity: 428,
    }))
    renderCatDetail()

    expect(await screen.findByText('橘白')).toBeInTheDocument()
    expect(screen.getByText('公猫')).toBeInTheDocument()
    expect(screen.getByText('软件园校区')).toBeInTheDocument()
    expect(screen.getByText('2024-03-12')).toBeInTheDocument()
    expect(screen.getByText('健康')).toBeInTheDocument()
    expect(screen.getByText('428')).toBeInTheDocument()
    expect(screen.getByText('别名：大橘、橘部长')).toBeInTheDocument()
    expect(screen.getByText('亲人')).toBeInTheDocument()
    expect(screen.getByText(/2026.*10.*01.*17:40/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '申请领养此猫' }))
    expect(await screen.findByText('领养申请 cat-1')).toBeInTheDocument()
  })

  it.each(['毕业', '喵星', '领养交接中'])('disables adoption for %s cats', async (status) => {
    catsApiMocks.getCatDetail.mockResolvedValue(apiResult({ id: 'cat-1', name: 'Mimi', basicInfo: { status } }))
    renderCatDetail()
    expect(await screen.findByRole('button', { name: /暂不可申请领养/ })).toBeDisabled()
  })

  it('shows all fetched moments instead of truncating to three', async () => {
    momentsApiMocks.getMoments.mockResolvedValue(apiResult({
      items: Array.from({ length: 4 }, (_, index) => ({ id: `post-${index}`, content: `动态 ${index + 1}` })),
    }))
    renderCatDetail()
    expect(await screen.findByText('动态 4')).toBeInTheDocument()
  })

  it('updates fish currency and cached feed count after feeding', async () => {
    userApiMocks.getMe
      .mockResolvedValueOnce(apiResult({ currency: 5, stats: { feedCount: 2 } }))
      .mockResolvedValue(apiResult({ currency: 4, stats: { feedCount: 3 } }))
    const queryClient = renderCatDetail()

    fireEvent.click(await screen.findByRole('button', { name: /投喂 \(5\)/ }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /投喂 \(4\)/ })).toBeInTheDocument()
    })

    const me = queryClient.getQueryData<ApiResult<Record<string, unknown>>>(['me'])
    expect((me?.data?.stats as Record<string, unknown>).feedCount).toBe(3)
    expect(antdMocks.modalSuccess).toHaveBeenCalledWith(expect.objectContaining({ content: '当前剩余小鱼干：4' }))
  })

  it('toggles moment likes and syncs own received likes', async () => {
    userApiMocks.getMe.mockResolvedValue(apiResult({ id: 'user-1', currency: 5, stats: { feedCount: 2, receivedLikes: 7 } }))
    momentsApiMocks.getMoments.mockResolvedValue(
      apiResult({
        items: [
          {
            id: 'post-1',
            content: '今天状态不错。',
            media: [],
            user: { id: 'user-1', name: 'Me' },
            liked: false,
            likeCount: 0,
          },
        ],
      }),
    )
    momentsApiMocks.likeMoment.mockResolvedValue(apiResult({ likeCount: 1 }))
    momentsApiMocks.unlikeMoment.mockResolvedValue(apiResult({ likeCount: 0 }))
    const queryClient = renderCatDetail()

    fireEvent.click(await screen.findByRole('button', { name: '点赞' }))

    await waitFor(() => {
      expect(momentsApiMocks.likeMoment).toHaveBeenCalledWith('post-1')
    })
    expect(screen.getByRole('button', { name: '取消点赞' })).toBeInTheDocument()
    let me = queryClient.getQueryData<ApiResult<Record<string, unknown>>>(['me'])
    expect((me?.data?.stats as Record<string, unknown>).receivedLikes).toBe(8)

    fireEvent.click(screen.getByRole('button', { name: '取消点赞' }))

    await waitFor(() => {
      expect(momentsApiMocks.unlikeMoment).toHaveBeenCalledWith('post-1')
    })
    expect(screen.getByRole('button', { name: '点赞' })).toBeInTheDocument()
    me = queryClient.getQueryData<ApiResult<Record<string, unknown>>>(['me'])
    expect((me?.data?.stats as Record<string, unknown>).receivedLikes).toBe(7)
  })

  it('deletes own moments with a success modal', async () => {
    userApiMocks.getMe.mockResolvedValue(apiResult({ id: 'user-1', currency: 5, stats: { feedCount: 2, receivedLikes: 7 } }))
    momentsApiMocks.getMoments.mockResolvedValue(
      apiResult({
        items: [
          {
            id: 'post-1',
            content: '我的动态。',
            media: [],
            user: { id: 'user-1', name: 'Me' },
            liked: false,
            likeCount: 0,
          },
          {
            id: 'post-2',
            content: '别人的动态。',
            media: [],
            user: { id: 'user-2', name: 'Other' },
            liked: false,
            likeCount: 0,
          },
        ],
      }),
    )
    renderCatDetail()

    await screen.findByText('我的动态。')
    expect(screen.getAllByRole('button', { name: '删除动态' })).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: '删除动态' }))

    await waitFor(() => {
      expect(momentsApiMocks.deleteMoment).toHaveBeenCalledWith('post-1')
    })
    expect(screen.queryByText('我的动态。')).not.toBeInTheDocument()
    expect(screen.getByText('别人的动态。')).toBeInTheDocument()
    expect(antdMocks.modalSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '删除动态成功',
        content: '该动态已从猫咪详情页移除',
        okText: '知道了',
      }),
    )
  })
})
