import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@pc/components/ui/button';
import { catApi, typeApi } from '@pc/lib/api';
import { useUserStore } from '@pc/stores/user';
import type { Campus, CatListItem, TypeOption } from '@pc/types';
import { toast } from '@pc/lib/toast'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from '@pc/components/ui/pagination';
import { ChevronLeft, ChevronRight, Gift, Calendar, Zap } from 'lucide-react';
import { withoutAppBasePath } from '@pc/lib/appPath'
import { cn } from '@pc/lib/utils'
import { campusOptions } from '@shared/campus.store'
import { useHomeFilters } from '@shared/useHomeFilters'
import { checkinOnce, useCheckinStore } from '@shared/checkin.store'

import { StatsBanner } from '@pc/components/StatsBanner';
import { ShortcutGrid } from '@pc/components/ShortcutGrid';
import { CatCard } from '@pc/components/CatCard';


export function DesktopLayout() {
const [catList, setCatList] = useState<CatListItem[]>([]);
const [colorOptions, setColorOptions] = useState<TypeOption[]>([])
const pageSize = 20
const [total, setTotal] = useState(0)
const [totalPages, setTotalPages] = useState(1)
const [loading, setLoading] = useState(false)
const [loadError, setLoadError] = useState('')
const latestRequestId = useRef(0)

const location = useLocation()
const navigate = useNavigate()
const filters = useHomeFilters()

// 签到相关
const checkinLoading = useCheckinStore((state) => state.loading)
const checkinResult = useCheckinStore((state) => state.result)
const checkedToday = useCheckinStore((state) => state.completedOn === new Date().toLocaleDateString('en-CA'))

// 执行签到
const handleCheckin = async () => {
  if (!useUserStore.getState().token) {
    toast.warning('请先登录后再签到')
    navigate('/login')
    return
  }
  try {
    const res = await checkinOnce()
    if (res?.todayChecked) {
      toast.info('今天已经签过到啦~')
    } else {
      toast.success(`签到成功！获得 ${res?.rewards?.currency || 0} 小鱼干，${res?.rewards?.experience || 0} 经验值`)
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '签到失败，请稍后重试')
  }
}

const positiveInteger = (value: unknown, fallback = 1) => {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const searchParams = new URLSearchParams(location.search)
const pageParam = searchParams.get('page')
const searchParam = searchParams.get('search')
const colorParam = searchParams.get('color')

// currentPage：可写计算属性（读自路由 query.page，写回路由）
const currentPage = positiveInteger(pageParam)
const setCurrentPage = (val: number) => {
  const next = new URLSearchParams(location.search)
  next.set('page', String(val))
  navigate(`${withoutAppBasePath(location.pathname)}?${next.toString()}`)
}

const colorValue = Number(colorParam)
const selectedColor = colorParam !== null && colorParam !== '' && Number.isInteger(colorValue) && colorValue >= 0 ? colorValue : null

const colorLabels = new Map(colorOptions.map((item) => [item.id, item.label]))
const colorLabel = (colorId: number) => colorLabels.get(colorId) || `花色 #${colorId}`

const selectColor = (color: number | null) => {
  const next = new URLSearchParams(location.search)
  if (color === null) next.delete('color')
  else next.set('color', String(color))
  next.set('page', '1')
  navigate(`${withoutAppBasePath(location.pathname)}?${next.toString()}`)
}

// 分页页码列表
const paginationPages = (() => {
  const pages: (number | string)[] = []
  const totalPageCount = totalPages
  const current = currentPage
  const maxPagesToShow = 5

  if (totalPageCount <= maxPagesToShow + 2) {
    for (let i = 1; i <= totalPageCount; i++) pages.push(i)
  } else {
    if (current <= 3) {
      for (let i = 1; i <= Math.min(maxPagesToShow, totalPageCount); i++) pages.push(i)
      if (totalPageCount > maxPagesToShow) pages.push('...', totalPageCount)
    } else if (current >= totalPageCount - 2) {
      pages.push(1, '...')
      for (let i = totalPageCount - maxPagesToShow + 1; i <= totalPageCount; i++) pages.push(i)
    } else {
      pages.push(1, '...')
      for (let i = current - 1; i <= current + 1; i++) pages.push(i)
      pages.push('...', totalPageCount)
    }
  }
  return pages
})()

const fetchCats = async () => {
  const requestId = latestRequestId.current + 1
  latestRequestId.current = requestId
  setLoading(true)
  setLoadError('')
  try {
    const search = String(searchParam || '').trim()
    const data = await catApi.getCatList({
      page: currentPage,
      pageSize,
      campus: Number(filters.campus) as Campus,
      ...(selectedColor !== null && { color: selectedColor }),
      ...(search && { search })
    })
    if (requestId !== latestRequestId.current) return

    const resolvedTotalPages = Math.max(data.totalPage, 1)
    setCatList(data.items)
    setTotal(data.total)
    setTotalPages(resolvedTotalPages)

    if (data.total > 0 && currentPage > resolvedTotalPages) {
      const next = new URLSearchParams(location.search)
      next.set('page', String(resolvedTotalPages))
      await navigate(`${withoutAppBasePath(location.pathname)}?${next.toString()}`, { replace: true })
    }
  } catch (error) {
    if (requestId !== latestRequestId.current) return
    setCatList([])
    setTotal(0)
    setTotalPages(1)
    setLoadError(error instanceof Error ? error.message : '猫咪列表加载失败')
  } finally {
    if (requestId === latestRequestId.current) setLoading(false)
  }
}

const loadColorOptions = async () => {
  try {
    setColorOptions(await typeApi.getColors())
  } catch (error) {
    console.warn('猫咪花色选项加载失败', error)
  }
}

// watch(() => [route.query.page, route.query.search, route.query.color], fetchCats, { immediate: true })
useEffect(() => {
  void fetchCats()
// eslint-disable-next-line react-hooks/exhaustive-deps -- 意图为仅挂载执行 / 模拟 Vue watch
}, [pageParam, searchParam, colorParam, filters.campus])

useEffect(() => {
  void loadColorOptions()
  return () => {
    latestRequestId.current += 1
  }
}, [])


return (
  <div className="public-page flex min-h-full w-full flex-col gap-6">
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[3.7fr_1fr]">
      <section className="flex min-w-0 flex-col gap-6 rounded-xl">
        <StatsBanner />
        <ShortcutGrid />
      </section>

      <aside className="flex flex-col gap-6">
        {/* 每日签到卡片 */}
        <div className="w-full rounded-2xl bg-gradient-to-br from-[#FFB347] to-[#FFCC33] p-5 shadow-lg">
          <h3 className="text-white text-lg font-bold mb-2 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            每日签到
          </h3>
          <p className="text-white/80 text-sm mb-4">签到可获得小鱼干和经验值~</p>

          {/* 签到结果展示 */}
          {checkinResult ? (
            <div className="bg-white/20 rounded-xl p-3 mb-4 backdrop-blur-sm">
              <div className="grid grid-cols-2 gap-3 text-white text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>累计签到 <strong>{checkinResult.totalDays}</strong> 天</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span>连续签到 <strong>{checkinResult.continuousDays}</strong> 天</span>
                </div>
              </div>
              {!checkinResult.todayChecked ? (
                <div className="mt-2 pt-2 border-t border-white/20 text-white/90 text-xs">
                  本次获得: 🐟 {checkinResult.rewards?.currency} 小鱼干 | ⚡ {checkinResult.rewards?.experience} 经验
                </div>
              ) : null}
            </div>
          ) : null}

          {/* 签到按钮 */}
          <Button
            onClick={() => void handleCheckin()}
            disabled={checkinLoading || checkedToday}
            className="w-full bg-white text-[#FF9F1C] hover:bg-white/90 font-bold rounded-xl py-3 shadow-sm flex items-center justify-center gap-2"
          >
            <Gift className="w-5 h-5" />
            {checkinLoading ? '签到中...' : (checkedToday ? '今日已签到' : '立即签到')}
          </Button>

          {/* 查看签到记录按钮 */}
          <Link to="/checkin-history" className="block mt-3">
            <Button
              variant="outline"
              className="w-full bg-white text-[#FF9F1C]  hover:bg-white/90 hover:text-[#FF9F1C] font-bold rounded-xl py-2 text-sm flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              查看签到记录
            </Button>
          </Link>
        </div>
      </aside>
    </div>

    <section className="flex min-w-0 flex-col gap-6">
      <label className="flex items-center gap-3 text-sm">
        校区
        <select className="rounded-lg border border-gray-200 bg-white px-3 py-2" value={filters.campus} onChange={(event) => filters.setCampus(event.target.value)}>
          {campusOptions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => selectColor(null)}
          className={cn('px-3 py-1 border-2 rounded-full text-sm', selectedColor === null ? 'bg-primary text-black border-primary' : 'bg-white text-black border-gray-200 hover:bg-primary')}>
          全部
        </Button>
        {colorOptions.map((color) => (
          <Button key={color.id} onClick={() => selectColor(color.id)}
            className={cn('px-3 py-1 border-2 rounded-full text-sm', selectedColor === color.id ? 'bg-primary text-black border-primary' : 'bg-white text-black border-gray-200 hover:bg-primary')}>
            {color.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-500">正在加载猫咪...</div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center text-red-600">
          <span>{loadError}</span>
          <Button variant="outline" size="sm" onClick={() => void fetchCats()}>重新加载</Button>
        </div>
      ) : catList.length === 0 ? (
        <div className="py-10 text-center text-gray-500">暂无符合条件的猫咪</div>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {catList.map((cat) => (
            <CatCard key={cat.id} cat={cat} colorLabel={colorLabel(cat.color)} />
          ))}
        </div>
      )}

      {!loading && !loadError && totalPages > 1 ? (
        <div className="mt-6 flex justify-center">
          <Pagination total={total} itemsPerPage={pageSize} siblingCount={1} showEdges page={currentPage}>
            <PaginationContent className="flex items-center gap-1">
              <PaginationPrevious
                disabled={currentPage <= 1}
                onClick={() => { if (currentPage > 1) setCurrentPage(currentPage - 1) }}
                className="flex h-9 items-center gap-1 rounded-md border border-gray-200 px-3 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">上一页</span>
              </PaginationPrevious>

              {paginationPages.map((page, index) => (
                page === '...' ? (
                  <PaginationEllipsis key={index} className="px-3 text-gray-400" />
                ) : (
                  <PaginationItem key={index} value={page as number}
                    className={cn(
                        'h-9 w-9 rounded-md',
                        currentPage === page ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-gray-50'
                    )}
                    onClick={() => setCurrentPage(page as number)}>
                    {page}
                  </PaginationItem>
                )
              ))}

              <PaginationNext
                disabled={currentPage >= totalPages}
                onClick={() => { if (currentPage < totalPages) setCurrentPage(currentPage + 1) }}
                className="flex h-9 items-center gap-1 rounded-md border border-gray-200 px-3 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="hidden sm:inline">下一页</span>
                <ChevronRight className="h-4 w-4" />
              </PaginationNext>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}

      {!loading && !loadError && total > 0 ? (
        <div className="mt-2 text-center text-sm text-gray-500">
          共 {total} 只猫咪，当前第 {currentPage}/{totalPages} 页
        </div>
      ) : null}
    </section>
  </div>
  )
}
