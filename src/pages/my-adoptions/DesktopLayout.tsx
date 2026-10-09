import { useListFilters } from '@shared/useListFilters'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adoptionApi } from '@pc/lib/api'
import { AdoptionStatusMap, type AdoptionStatus, type MyAdoptionItem, type MyAdoptionQueryParams } from '@pc/types'
import { Badge } from '@pc/components/ui/badge'
import { Button } from '@pc/components/ui/button'
import { cn } from '@pc/lib/utils'
import { ArrowLeft, Ban, CheckCircle2, ClipboardCheck, Clock3, HeartHandshake, MessageSquareText, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export function DesktopLayout() {
  const navigate = useNavigate()
  const pageSize = 10
  const [adoptionList, setAdoptionList] = useState<MyAdoptionItem[]>([])
  const filters = useListFilters(['PENDING', 'INTERVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'])
  const currentPage = filters.page
  const setCurrentPage = filters.setPage
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const selectedStatus = filters.status as AdoptionStatus | ''
  const setSelectedStatus = filters.setStatus
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const latestRequestId = useRef(0)

  // 异步请求与 watch 逻辑中需要读取最新的筛选与分页状态，用 ref 镜像最新值。
  const currentPageRef = useRef(currentPage)
  currentPageRef.current = currentPage
  const selectedStatusRef = useRef(selectedStatus)
  selectedStatusRef.current = selectedStatus

  const adoptionStatusOrder: AdoptionStatus[] = ['PENDING', 'INTERVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED']
  const statusTabs: Array<{ label: string; value: AdoptionStatus | '' }> = [
    { label: '全部申请', value: '' },
    ...adoptionStatusOrder.map((status) => ({ label: AdoptionStatusMap[status], value: status }))
  ]
  const statusConfig: Record<AdoptionStatus, { label: string; class: string; icon: LucideIcon }> = {
    PENDING: { label: AdoptionStatusMap.PENDING, class: 'border-[#FACC15] bg-[#FFF8DE] text-[#8A5A00]', icon: Clock3 }, INTERVIEW: { label: AdoptionStatusMap.INTERVIEW, class: 'border-[#5CD6C2] bg-[#DDF8F2] text-[#116B5E]', icon: MessageSquareText }, APPROVED: { label: AdoptionStatusMap.APPROVED, class: 'border-[#5CD6C2] bg-[#DDF8F2] text-[#116B5E]', icon: CheckCircle2 }, REJECTED: { label: AdoptionStatusMap.REJECTED, class: 'border-red-300 bg-red-50 text-red-700', icon: XCircle }, COMPLETED: { label: AdoptionStatusMap.COMPLETED, class: 'border-gray-300 bg-gray-100 text-gray-700', icon: ClipboardCheck }, CANCELLED: { label: AdoptionStatusMap.CANCELLED, class: 'border-gray-300 bg-gray-100 text-gray-600', icon: Ban }
  }
  const visiblePages = useMemo(() => { const start = Math.max(1, currentPage - 2); const end = Math.min(totalPages, currentPage + 2); return Array.from({ length: end - start + 1 }, (_, index) => start + index) }, [currentPage, totalPages])
  const statusInfo = (status: AdoptionStatus) => statusConfig[status] || statusConfig.PENDING
  const formatTime = (value?: string) => { if (!value) return '-'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date) }
  const fetchAdoptions = useCallback(async () => { const requestId = ++latestRequestId.current; setLoading(true); setLoadError(''); try { const params: MyAdoptionQueryParams = { page: currentPageRef.current, size: pageSize, ...(selectedStatusRef.current ? { status: selectedStatusRef.current } : {}) }; const response = await adoptionApi.getMyAdoptions(params); if (requestId !== latestRequestId.current) return; setAdoptionList(response.items || []); setTotalPages(Math.max(Number(response.pages || 1), 1)); setTotal(Number(response.total || 0)) } catch (error) { if (requestId !== latestRequestId.current) return; setAdoptionList([]); setTotalPages(1); setTotal(0); setLoadError(error instanceof Error ? error.message : '领养申请暂时无法加载') } finally { if (requestId === latestRequestId.current) setLoading(false) } }, [])
  const changePage = (page: number) => { if (page >= 1 && page <= totalPages && page !== currentPage) setCurrentPage(page) }
  useEffect(() => {
    void fetchAdoptions()
    return () => { latestRequestId.current += 1 }
  }, [fetchAdoptions, currentPage, selectedStatus])

  return (
    <div className="min-h-full bg-gray-50 px-4 py-6 sm:px-6">
      <main className="mx-auto flex max-w-5xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b-2 border-black pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <Button variant="outline" size="icon" className="shrink-0 border-2 border-black bg-white hover:bg-[#5CD6C2]" aria-label="返回个人中心" onClick={() => navigate('/me')}>
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <p className="text-sm font-bold text-gray-500">PERSONAL RECORDS</p>
              <h1 className="mt-1 text-2xl font-black text-gray-950">我的领养申请</h1>
              <p className="mt-2 text-sm text-gray-600">查看每一只猫咪的申请状态和审核反馈。</p>
            </div>
          </div>
          <div className="border-2 border-black bg-white px-4 py-3 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <p className="text-xs font-bold text-gray-500">申请总数</p>
            <p className="text-lg font-black text-gray-950">{total}</p>
          </div>
        </header>
        <section className="border-2 border-black bg-white p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          <div className="flex w-full overflow-x-auto border-2 border-black bg-gray-100 p-1 sm:w-fit">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={cn(
                  'min-h-9 shrink-0 px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black',
                  selectedStatus === tab.value
                    ? 'bg-[#5CD6C2] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                    : 'text-gray-600 hover:bg-white',
                )}
                aria-pressed={selectedStatus === tab.value}
                onClick={() => setSelectedStatus(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>
        <section className="overflow-hidden border-2 border-black bg-white shadow-[5px_5px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between border-b-2 border-black bg-[#F3F4F6] px-5 py-3">
            <h2 className="text-sm font-black">申请记录</h2>
            <span className="text-xs font-bold text-gray-500">每页 {pageSize} 条</span>
          </div>
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-500">正在加载领养申请...</div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-3 px-5 py-16 text-center text-sm text-red-700">
              <span>{loadError}</span>
              <Button variant="outline" size="sm" className="border-2 border-black" onClick={() => void fetchAdoptions()}>重新加载</Button>
            </div>
          ) : adoptionList.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-16 text-center text-gray-500">
              <HeartHandshake className="size-10 text-gray-300" />
              <p className="text-sm">当前筛选下没有领养申请</p>
              <Button variant="outline" size="sm" className="border-2 border-black" onClick={() => navigate('/')}>查看可领养猫咪</Button>
            </div>
          ) : (
            <div className="divide-y-2 divide-black">
              {adoptionList.map((item) => {
                const status = statusInfo(item.status)
                const StatusIcon = status.icon
                return (
                  <article key={item.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                    {item.catAvatar ? (
                      <img src={item.catAvatar} alt={item.catName} className="size-16 shrink-0 border-2 border-black object-cover" />
                    ) : (
                      <div className="flex size-16 shrink-0 items-center justify-center border-2 border-black bg-gray-100">
                        <HeartHandshake className="size-6 text-gray-500" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" className="font-black text-gray-950 hover:text-[#116B5E]" onClick={() => navigate(`/cats/${item.catId}`)}>{item.catName}</button>
                        <Badge variant="outline" className={cn('gap-1 font-bold', status.class)}>
                          <StatusIcon className="size-3.5" />
                          {status.label}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">提交于 {formatTime(item.createTime)}</p>
                      {item.reason ? (
                        <p className={cn('mt-3 border-l-4 p-3 text-sm leading-6', item.status === 'REJECTED' ? 'border-red-400 bg-red-50 text-red-700' : 'border-[#5CD6C2] bg-[#DDF8F2] text-[#116B5E]')}>
                          {item.status === 'REJECTED' ? '审核说明：' : '处理说明：'}{item.reason}
                        </p>
                      ) : null}
                    </div>
                    <Button variant="outline" size="sm" className="self-start border-2 border-black font-bold hover:bg-[#DDF8F2] sm:self-auto" onClick={() => navigate(`/cats/${item.catId}`)}>查看猫咪</Button>
                  </article>
                )
              })}
            </div>
          )}
          {totalPages > 1 ? (
            <footer className="flex flex-col gap-3 border-t-2 border-black bg-[#F3F4F6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-gray-600">第 <strong className="text-black">{currentPage}</strong> / {totalPages} 页</span>
              <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => changePage(currentPage - 1)}>上一页</Button>
                {visiblePages.map((page) => (
                  <Button
                    key={page}
                    size="sm"
                    variant={page === currentPage ? 'default' : 'outline'}
                    className={page === currentPage ? 'border-2 border-black bg-[#5CD6C2] text-black hover:bg-[#5CD6C2]' : ''}
                    onClick={() => changePage(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => changePage(currentPage + 1)}>下一页</Button>
              </div>
            </footer>
          ) : null}
        </section>
      </main>
    </div>
  )
}
