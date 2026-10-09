import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sosApi } from '@pc/lib/api'
import { CampusMap, SOSStatusMap, type SOSItem, type SOSStatus } from '@pc/types'
import { Badge } from '@pc/components/ui/badge'
import { Button } from '@pc/components/ui/button'
import { ConfirmDialog } from '@pc/components/ui/confirm-dialog'
import { toast } from '@pc/lib/toast'
import { cn } from '@pc/lib/utils'
import { ArrowLeft, Ban, CheckCircle2, Clock3, Image as ImageIcon, LifeBuoy, MapPin, ShieldAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export function DesktopLayout() {
  const navigate = useNavigate()
  const pageSize = 10
  const [items, setItems] = useState<SOSItem[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedStatus, setSelectedStatus] = useState<SOSStatus | ''>('')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [cancelTarget, setCancelTarget] = useState<SOSItem | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const latestRequestId = useRef(0)

  // 异步请求与 watch 逻辑中需要读取最新的筛选与分页状态，用 ref 镜像最新值。
  const currentPageRef = useRef(currentPage)
  currentPageRef.current = currentPage
  const totalPagesRef = useRef(totalPages)
  totalPagesRef.current = totalPages
  const selectedStatusRef = useRef(selectedStatus)
  selectedStatusRef.current = selectedStatus

  const statusTabs: Array<{ label: string; value: SOSStatus | '' }> = [
    { label: '全部记录', value: '' }, { label: '待处理', value: 'PENDING' }, { label: '处理中', value: 'PROCESSING' }, { label: '已解决', value: 'RESOLVED' }, { label: '已取消', value: 'CANCELLED' }
  ]
  const statusConfig: Record<SOSStatus, { label: string; class: string; icon: LucideIcon }> = {
    PENDING: { label: SOSStatusMap.PENDING, class: 'border-[#FACC15] bg-[#FFF8DE] text-[#8A5A00]', icon: Clock3 },
    PROCESSING: { label: SOSStatusMap.PROCESSING, class: 'border-[#5CD6C2] bg-[#DDF8F2] text-[#116B5E]', icon: ShieldAlert },
    RESOLVED: { label: SOSStatusMap.RESOLVED, class: 'border-gray-300 bg-gray-100 text-gray-700', icon: CheckCircle2 },
    CANCELLED: { label: SOSStatusMap.CANCELLED, class: 'sos-status-cancelled border-red-200 bg-red-50 text-red-700', icon: Ban }
  }
  const visiblePages = useMemo(() => {
    const start = Math.max(1, currentPage - 2)
    const end = Math.min(totalPages, currentPage + 2)
    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [currentPage, totalPages])
  const statusInfo = (status: SOSStatus) => statusConfig[status] || statusConfig.PENDING
  const formatTime = (value?: string) => {
    if (!value) return '-'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)
  }
  const fetchRecords = useCallback(async () => {
    const requestId = ++latestRequestId.current
    setLoading(true)
    setLoadError('')
    try {
      const response = await sosApi.getMySOS({ page: currentPageRef.current, size: pageSize, ...(selectedStatusRef.current ? { status: selectedStatusRef.current } : {}) })
      if (requestId !== latestRequestId.current) return
      setItems(response.items || [])
      setTotal(Number(response.total || 0))
      totalPagesRef.current = Math.max(Number(response.pages || 1), 1)
      setTotalPages(totalPagesRef.current)
    } catch (error) {
      if (requestId !== latestRequestId.current) return
      setItems([])
      setTotal(0)
      totalPagesRef.current = 1
      setTotalPages(1)
      setLoadError(error instanceof Error ? error.message : 'SOS 记录暂时无法加载')
    } finally { if (requestId === latestRequestId.current) setLoading(false) }
  }, [])
  const changePage = (page: number) => { if (page >= 1 && page <= totalPages && page !== currentPage) setCurrentPage(page) }
  const requestCancel = (item: SOSItem) => {
    setCancelTarget(item)
    setCancelDialogOpen(true)
  }
  const confirmCancel = async () => {
    if (!cancelTarget || cancelling) return

    setCancelling(true)
    try {
      await sosApi.cancelSOS(cancelTarget.id)
      toast.success('SOS 请求已取消')
      setCancelDialogOpen(false)
      setCancelTarget(null)
      await fetchRecords()
      if (currentPageRef.current > totalPagesRef.current) setCurrentPage(totalPagesRef.current)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '取消 SOS 失败，请稍后重试')
    } finally {
      setCancelling(false)
    }
  }
  const statusWatchInitialized = useRef(false)
  useEffect(() => {
    if (!statusWatchInitialized.current) {
      statusWatchInitialized.current = true
      return
    }
    if (currentPageRef.current === 1) void fetchRecords()
    else setCurrentPage(1)
  }, [fetchRecords, selectedStatus])
  const pageWatchInitialized = useRef(false)
  useEffect(() => {
    if (!pageWatchInitialized.current) {
      pageWatchInitialized.current = true
      return
    }
    void fetchRecords()
  }, [fetchRecords, currentPage])
  useEffect(() => { void fetchRecords() }, [fetchRecords])

  return (
    <div className="min-h-full bg-gray-50 px-4 py-6 sm:px-6">
      <main className="mx-auto flex max-w-5xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b-2 border-black pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <Button variant="outline" size="icon" className="shrink-0 border-2 border-black bg-white hover:bg-[#FACC15]" aria-label="返回个人中心" onClick={() => navigate('/me')}>
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <p className="text-sm font-bold text-gray-500">PERSONAL RECORDS</p>
              <h1 className="mt-1 text-2xl font-black text-gray-950">我的 SOS</h1>
              <p className="mt-2 text-sm text-gray-600">跟进已提交的救援请求和管理员处理结果。</p>
            </div>
          </div>
          <div className="border-2 border-black bg-white px-4 py-3 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <p className="text-xs font-bold text-gray-500">记录总数</p>
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
                    ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'
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
            <h2 className="text-sm font-black">救援记录</h2>
            <span className="text-xs font-bold text-gray-500">每页 {pageSize} 条</span>
          </div>
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-500">正在加载 SOS 记录...</div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-3 px-5 py-16 text-center text-sm text-red-700">
              <span>{loadError}</span>
              <Button variant="outline" size="sm" className="border-2 border-black" onClick={() => void fetchRecords()}>重新加载</Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-16 text-center text-gray-500">
              <LifeBuoy className="size-10 text-gray-300" />
              <p className="text-sm">当前筛选下没有 SOS 记录</p>
              <Button variant="outline" size="sm" className="border-2 border-black" onClick={() => navigate('/sos')}>发起救援请求</Button>
            </div>
          ) : (
            <div className="divide-y-2 divide-black">
              {items.map((item) => {
                const status = statusInfo(item.status)
                const StatusIcon = status.icon
                return (
                  <article key={item.id} className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-gray-950">{item.catName || '未收录猫咪'}</h3>
                        <Badge variant="outline" className={cn('gap-1 font-bold', status.class)}>
                          <StatusIcon className="size-3.5" />
                          {status.label}
                        </Badge>
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
                        <MapPin className="size-4 shrink-0 text-[#8A5A00]" />
                        <span className="min-w-0 break-words">{CampusMap[item.campus] || `校区 #${item.campus}`} · {item.location}</span>
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.symptoms.map((symptom) => (
                          <Badge key={symptom} variant="outline" className="border-red-200 bg-red-50 text-red-700">{symptom}</Badge>
                        ))}
                      </div>
                      <p className="mt-3 break-words text-sm leading-6 text-gray-700">{item.description}</p>
                      {item.imageURLs?.length ? (
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                          <ImageIcon className="size-4" />已提交 {item.imageURLs.length} 张现场图片
                        </div>
                      ) : null}
                      {item.adminReply ? (
                        <div className="mt-4 border-l-4 border-[#5CD6C2] bg-[#DDF8F2] p-3 text-sm leading-6 text-[#116B5E]">
                          <strong>处理说明：</strong>{item.adminReply}
                        </div>
                      ) : null}
                      {item.status === 'CANCELLED' ? (
                        <div className="sos-cancelled-note mt-4 flex items-start gap-2 border-2 border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">
                          <Ban className="mt-1 size-4 shrink-0" />
                          <p>该 SOS 请求已取消，不再进入救援处理流程。</p>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <time className="whitespace-nowrap text-xs font-bold text-gray-500">{formatTime(item.create_time)}</time>
                      {item.status === 'PENDING' ? (
                        <Button variant="outline" size="sm" className="shrink-0 border-2 border-red-300 text-red-700 hover:border-red-500 hover:bg-red-50" onClick={() => requestCancel(item)}>
                          <Ban data-icon="inline-start" />取消请求
                        </Button>
                      ) : null}
                    </div>
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
                    className={page === currentPage ? 'border-2 border-black bg-[#FACC15] text-black hover:bg-[#FACC15]' : ''}
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
      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="取消 SOS 请求"
        description={`确定取消“${cancelTarget?.catName || '未收录猫咪'}”的 SOS 请求吗？取消后无法恢复。`}
        confirmText="确认取消"
        cancelText="暂不取消"
        variant="danger"
        loading={cancelling}
        onConfirm={() => void confirmCancel()}
      />
    </div>
  )
}
