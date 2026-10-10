import { invalidateRelatedQueries } from '@shared/mutationSync'
import { useRetainedState } from '@shared/drafts'
import { useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle, Ban, CheckCircle2, Clock3, Eye, MapPin, RefreshCw, ShieldAlert, Siren
} from 'lucide-react'
import { sosApi, typeApi } from '@pc/lib/api'
import {
  CampusMap, SOSStatusMap, type SOSItem, type SOSResolutionStatus, type SOSStatus, type TypeOption
} from '@pc/types'
import { toast } from '@pc/lib/toast'
import { cn } from '@pc/lib/utils'
import { Badge } from '@pc/components/ui/badge'
import { Button } from '@pc/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@pc/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@pc/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@pc/components/ui/table'
import { Textarea } from '@pc/components/ui/textarea'
import { AdminPageHeader } from '@pc/components/admin/AdminPageHeader'
import { AdminPanel } from '@pc/components/admin/AdminPanel'
import { AdminStatusTabs } from '@pc/components/admin/AdminStatusTabs'
import { useListFilters } from '@shared/useListFilters'

const pageSize = 10

const statusTabs: Array<{ label: string; value: SOSStatus | '' }> = [
  { label: '全部求助', value: '' },
  { label: '待处理', value: 'PENDING' },
  { label: '处理中', value: 'PROCESSING' },
  { label: '已解决', value: 'RESOLVED' },
  { label: '已取消', value: 'CANCELLED' }
]

const statusConfig: Record<SOSStatus, { label: string; class: string; icon: LucideIcon }> = {
  PENDING: { label: SOSStatusMap.PENDING, class: 'border-[#FACC15] bg-[#FFF8DE] text-[#8A5A00]', icon: Clock3 },
  PROCESSING: { label: SOSStatusMap.PROCESSING, class: 'border-[#5CD6C2] bg-[#DDF8F2] text-[#116B5E]', icon: ShieldAlert },
  RESOLVED: { label: SOSStatusMap.RESOLVED, class: 'border-gray-300 bg-gray-100 text-gray-700', icon: CheckCircle2 },
  CANCELLED: { label: SOSStatusMap.CANCELLED, class: 'sos-status-cancelled border-red-200 bg-red-50 text-red-700', icon: Ban }
}

const actionConfig: Record<SOSStatus, { label: string; class: string; icon: LucideIcon }> = {
  PENDING: { label: '处理救援', class: 'admin-sos-action-process border-2 border-black bg-[#FACC15] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-[#EAB308]', icon: ShieldAlert },
  PROCESSING: { label: '处理救援', class: 'admin-sos-action-process border-2 border-black bg-[#FACC15] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-[#EAB308]', icon: ShieldAlert },
  RESOLVED: { label: '更新记录', class: 'admin-sos-action-update border-2 border-black bg-[#5CD6C2] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-[#48C4B1]', icon: RefreshCw },
  CANCELLED: { label: '查看信息', class: 'admin-sos-action-view border-2 border-black bg-white text-gray-700 hover:bg-gray-100', icon: Eye }
}

const statusInfo = (status: SOSStatus) => statusConfig[status] || statusConfig.PENDING
const actionInfo = (status: SOSStatus) => actionConfig[status] || actionConfig.PENDING
const formatTime = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).format(date)
}

export function DesktopLayout() {
  const filters = useListFilters(['PENDING', 'PROCESSING', 'RESOLVED', 'CANCELLED'])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [sosList, setSosList] = useState<SOSItem[]>([])
  const currentPage = filters.page
  const setCurrentPage = filters.setPage
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const selectedStatus = filters.status as SOSStatus | ''
  const setSelectedStatus = filters.setStatus
  const [resolveDialogOpen, setResolveDialogOpen] = useRetainedState('admin-sos-dialog', 'resolveDialogOpen', false)
  const [resolving, setResolving] = useState(false)
  const [selectedSOS, setSelectedSOS] = useRetainedState<SOSItem | null>('admin-sos-dialog', 'selectedSOS', null)
  const [locationOptions, setLocationOptions] = useState<TypeOption[]>([])
  const [replyForm, setReplyForm] = useRetainedState<{ status: SOSResolutionStatus; reply: string }>('admin-sos-dialog', 'replyForm', { status: 'PROCESSING', reply: '' })
  const latestRequestId = useRef(0)

  const paginationPages: Array<number | '...'> = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1)
    if (currentPage <= 3) return [1, 2, 3, 4, '...', totalPages]
    if (currentPage >= totalPages - 2) return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
  })()

  const isCancelledSelection = selectedSOS?.status === 'CANCELLED'

  const formatLocation = (location: string | number | null | undefined) => {
    if (location == null || location === '') return '-'
    if (typeof location === 'string' && !/^\d+$/.test(location)) return location
    const id = Number(location)
    return locationOptions.find((item) => item.id === id)?.label || `地点 #${id}`
  }

  const fetchList = async () => {
    const requestId = ++latestRequestId.current
    setLoading(true)
    setLoadError('')
    try {
      const response = await sosApi.getSOSList({
        page: currentPage,
        size: pageSize,
        ...(selectedStatus ? { status: selectedStatus } : {})
      })
      if (requestId !== latestRequestId.current) return
      setSosList(response.items || [])
      setTotal(Number(response.total || 0))
      setTotalPages(Math.max(Number(response.pages || 1), 1))
      if (currentPage > Math.max(Number(response.pages || 1), 1)) setCurrentPage(Math.max(Number(response.pages || 1), 1))
    } catch (error) {
      if (requestId !== latestRequestId.current) return
      setSosList([])
      setTotal(0)
      setTotalPages(1)
      setLoadError(error instanceof Error ? error.message : 'SOS 列表暂时无法加载')
    } finally {
      if (requestId === latestRequestId.current) setLoading(false)
    }
  }

  const changePage = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) setCurrentPage(page)
  }

  const openSOSDialog = (item: SOSItem) => {
    setSelectedSOS(item)
    if (item.status !== 'CANCELLED') {
      setReplyForm((prev) => ({ ...prev, status: item.status === 'PENDING' ? 'PROCESSING' : 'RESOLVED' }))
    }
    setReplyForm((prev) => ({ ...prev, reply: item.adminReply || '' }))
    setResolveDialogOpen(true)
  }

  const closeResolveDialog = () => {
    setResolveDialogOpen(false)
    setSelectedSOS(null)
    setReplyForm({ status: 'PROCESSING', reply: '' })
  }

  const submitResolution = async () => {
    if (!selectedSOS || selectedSOS.status === 'CANCELLED') return
    if (!replyForm.reply.trim()) {
      toast.warning('请填写处理说明')
      return
    }
    setResolving(true)
    try {
      await sosApi.resolveSOS(selectedSOS.id, { status: replyForm.status, reply: replyForm.reply.trim() })
      invalidateRelatedQueries('sos')
      toast.success(replyForm.status === 'RESOLVED' ? '救援已标记为解决' : '救援处理状态已更新')
      closeResolveDialog()
      await fetchList()
    } finally {
      setResolving(false)
    }
  }

  useEffect(() => {
    void fetchList()
    return () => { latestRequestId.current += 1 }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 意图为仅挂载执行 / 模拟 Vue watch
  }, [currentPage, selectedStatus])

  useEffect(() => {
    void typeApi.getLocations().then((items) => { setLocationOptions(items) }).catch(() => undefined)
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader eyebrow="RESCUE DESK" title="SOS 救援" description="按紧急状态跟进校园猫咪求助，记录处置结论并同步给上报人。" icon={Siren} tone="yellow"
        summary={
          <div className="admin-summary-card flex items-center gap-3 border-2 border-black bg-white px-4 py-3 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <AlertTriangle className="size-5 text-[#8A5A00]" aria-hidden="true" />
            <div><p className="text-xs font-bold text-gray-500">救援总数</p><p className="text-lg font-black text-gray-950">{total}</p></div>
          </div>
        }
      />

      <AdminPanel>
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <AdminStatusTabs ariaLabel="SOS 处理状态" value={selectedStatus} onChange={(value) => setSelectedStatus(value as SOSStatus | '')} options={statusTabs} tone="yellow" />
          <p className="text-sm text-gray-600">当前第 <strong className="text-black">{currentPage}</strong> / {totalPages} 页</p>
        </div>
      </AdminPanel>

      <AdminPanel title="救援队列" meta={`每页 ${pageSize} 条`}
        footer={
          <>
            {totalPages > 1 ? (
              <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-600">共 <strong className="text-black">{total}</strong> 条救援记录</p>
                <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                  <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => changePage(currentPage - 1)}>上一页</Button>
                  {paginationPages.map((page, index) =>
                    page === '...' ? (
                      <span key={`${page}-${index}`} className="px-1 text-gray-500">...</span>
                    ) : (
                      <Button key={`${page}-${index}`} size="sm" variant={page === currentPage ? 'default' : 'outline'} className={page === currentPage ? 'border-2 border-black bg-[#FACC15] text-black hover:bg-[#FACC15]' : ''} onClick={() => changePage(Number(page))}>{page}</Button>
                    )
                  )}
                  <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => changePage(currentPage + 1)}>下一页</Button>
                </div>
              </div>
            ) : null}
          </>
        }
      >
        {loadError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">
            <span>{loadError}</span>
            <Button variant="outline" size="sm" className="border-red-300 bg-white text-red-800 hover:bg-red-100" onClick={() => void fetchList()}>重试</Button>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <Table className="min-w-[1030px] text-left text-sm">
            <TableHeader className="admin-data-table-header bg-[#FFF8DE] [&_tr]:border-black">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-5 font-bold text-gray-700">求助对象</TableHead>
                <TableHead className="px-5 font-bold text-gray-700">现场位置</TableHead>
                <TableHead className="px-5 font-bold text-gray-700">症状与描述</TableHead>
                <TableHead className="px-5 font-bold text-gray-700">上报人</TableHead>
                <TableHead className="px-5 font-bold text-gray-700">状态</TableHead>
                <TableHead className="px-5 font-bold text-gray-700">上报时间</TableHead>
                <TableHead className="px-5 text-right font-bold text-gray-700">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="hover:bg-transparent"><TableCell colSpan={7} className="px-5 py-14 text-center text-gray-500">正在加载救援队列...</TableCell></TableRow>
              ) : sosList.length === 0 ? (
                <TableRow className="hover:bg-transparent"><TableCell colSpan={7} className="px-5 py-14 text-center text-gray-500">当前筛选下没有 SOS 求助</TableCell></TableRow>
              ) : (
                sosList.map((item) => {
                  const statusBadge = statusInfo(item.status)
                  const action = actionInfo(item.status)
                  return (
                    <TableRow key={item.id} className="admin-data-table-row border-gray-200 hover:bg-[#FFFDF5]">
                      <TableCell className="px-5 py-4"><div className="flex items-center gap-3">{item.imageURLs?.[0] ? <img src={item.imageURLs[0]} alt={item.catName || '救援现场'} className="size-10 rounded-none border-2 border-black object-cover" /> : <span className="flex size-10 items-center justify-center border-2 border-black bg-gray-100"><Siren className="size-5 text-gray-500" /></span>}<div><p className="font-black text-gray-950">{item.catName || '未收录猫咪'}</p><p className="mt-1 text-xs text-gray-500">{item.catId ? `档案 ${item.catId}` : '未知猫咪'}</p></div></div></TableCell>
                      <TableCell className="px-5 py-4"><div className="flex items-start gap-2 text-gray-700"><MapPin className="mt-0.5 size-4 shrink-0 text-[#8A5A00]" /><div><p className="font-bold">{formatLocation(item.location)}</p><p className="mt-1 text-xs text-gray-500">{CampusMap[item.campus] || `校区 #${item.campus}`}</p></div></div></TableCell>
                      <TableCell className="max-w-[280px] px-5 py-4"><div className="flex flex-wrap gap-1.5">{item.symptoms.map((tag) => <Badge key={tag} variant="outline" className="border-red-200 bg-red-50 text-red-700">{tag}</Badge>)}</div><p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-600">{item.description}</p></TableCell>
                      <TableCell className="px-5 py-4"><p className="font-bold text-gray-900">{item.reporterName || '-'}</p><p className="mt-1 text-xs text-gray-500">{item.reporterId ? `ID ${item.reporterId}` : '-'}</p></TableCell>
                      <TableCell className="px-5 py-4"><Badge variant="outline" className={cn('gap-1 font-bold', statusBadge.class)}><statusBadge.icon className="size-3.5" />{statusBadge.label}</Badge></TableCell>
                      <TableCell className="px-5 py-4 text-gray-600">{formatTime(item.create_time)}</TableCell>
                      <TableCell className="px-5 py-4 text-right"><Button variant="outline" size="sm" className={cn('admin-sos-action font-bold', action.class)} onClick={() => openSOSDialog(item)}><action.icon data-icon="inline-start" />{action.label}</Button></TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </AdminPanel>

      <Dialog open={resolveDialogOpen} onOpenChange={(open) => { if (!open) closeResolveDialog() }}>
        <DialogContent className="admin-dialog border-2 border-black p-0 sm:max-w-2xl">
          <DialogHeader className="admin-dialog-header border-b-2 border-black bg-[#FFF8DE] px-6 py-5 pr-14">
            <DialogTitle className="text-xl font-black">{isCancelledSelection ? '查看已取消 SOS' : '处理 SOS 救援'}</DialogTitle>
            <DialogDescription>{isCancelledSelection ? '该请求已由上报人取消，仅可查看原始信息，不能继续处理。' : '处理说明会反馈给上报人，请清楚说明当前进度或最终结论。'}</DialogDescription>
          </DialogHeader>
          {selectedSOS ? (
            <div className="grid max-h-[70vh] gap-5 overflow-y-auto px-6 py-5">
              <div className="grid gap-3 border-2 border-black bg-gray-50 p-4 sm:grid-cols-3">
                <div><p className="text-xs font-bold text-gray-500">求助对象</p><p className="mt-1 font-black">{selectedSOS.catName || '未收录猫咪'}</p></div>
                <div><p className="text-xs font-bold text-gray-500">现场位置</p><p className="mt-1 font-black">{CampusMap[selectedSOS.campus] || `校区 #${selectedSOS.campus}`} · {formatLocation(selectedSOS.location)}</p></div>
                <div><p className="text-xs font-bold text-gray-500">上报时间</p><p className="mt-1 font-black">{formatTime(selectedSOS.create_time)}</p></div>
              </div>
              <section className="grid gap-3">
                <div className="flex flex-wrap gap-1.5">{selectedSOS.symptoms.map((tag) => <Badge key={tag} variant="outline" className="border-red-200 bg-red-50 text-red-700">{tag}</Badge>)}</div>
                <p className="break-words text-sm leading-6 text-gray-700">{selectedSOS.description || '暂无现场描述'}</p>
              </section>
              {selectedSOS.imageURLs?.length ? (
                <section className="grid gap-2">
                  <p className="text-sm font-black">现场图片</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{selectedSOS.imageURLs.map((image, index) => <img key={image} src={image} alt={`SOS 现场图片 ${index + 1}`} className="aspect-square w-full border-2 border-black object-cover" />)}</div>
                </section>
              ) : null}
              {isCancelledSelection ? (
                <div className="admin-sos-readonly-note flex items-start gap-3 border-2 border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"><Ban className="mt-1 size-4 shrink-0" /><div><p className="font-black">请求已取消</p><p>管理员可保留查看记录，但不能修改状态或提交新的处理说明。</p></div></div>
              ) : (
                <>
                  <label className="flex flex-col gap-2"><span className="text-sm font-black">处理状态</span><Select value={replyForm.status} onValueChange={(value) => setReplyForm((prev) => ({ ...prev, status: value as SOSResolutionStatus }))}><SelectTrigger className="border-2 border-black"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PROCESSING">处理中</SelectItem><SelectItem value="RESOLVED">已解决</SelectItem></SelectContent></Select></label>
                  <label className="flex flex-col gap-2" htmlFor="sos-reply"><span className="text-sm font-black">处理说明</span><Textarea id="sos-reply" value={replyForm.reply} onChange={(event) => setReplyForm((prev) => ({ ...prev, reply: event.target.value }))} rows={5} maxLength={500} placeholder="说明已采取的救援措施、后续安排或处理结果" className="border-2 border-black focus-visible:ring-[#FACC15]" /></label>
                </>
              )}
              {isCancelledSelection && selectedSOS.adminReply ? (
                <div className="border-l-4 border-[#5CD6C2] bg-[#DDF8F2] p-3 text-sm leading-6 text-[#116B5E]"><strong>历史处理说明：</strong>{selectedSOS.adminReply}</div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="admin-dialog-footer border-t-2 border-black bg-gray-50 px-6 py-4"><Button variant="outline" className="admin-secondary-action border-2 border-black" disabled={resolving} onClick={closeResolveDialog}>{isCancelledSelection ? '关闭' : '取消'}</Button>{!isCancelledSelection ? <Button className="admin-primary-action border-2 border-black bg-[#FACC15] font-black text-black hover:bg-[#EAB308]" disabled={resolving} onClick={() => void submitResolution()}>{resolving ? '正在保存...' : '保存处理结果'}</Button> : null}</DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
