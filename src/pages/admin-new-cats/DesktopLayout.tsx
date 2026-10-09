import { useEffect, useRef, useState } from 'react'
import { adminNewCatApi, typeApi } from '@pc/lib/api'
import { CampusMap, type NewCatItem, type TagTypeOption, type TypeOption } from '@pc/types'
import { toast } from '@pc/lib/toast'
import { cn } from '@pc/lib/utils'
import { Badge } from '@pc/components/ui/badge'
import { Button } from '@pc/components/ui/button'
import { Input } from '@pc/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@pc/components/ui/dialog'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from '@pc/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@pc/components/ui/table'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Image as ImageIcon,
  MapPin,
  PawPrint,
  Sparkles,
  User,
  XCircle
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useListFilters } from '@shared/useListFilters'
import { filterPagedList } from '@shared/filterPagedList'

export function DesktopLayout() {
  const filters = useListFilters(['PENDING', 'APPROVED', 'REJECTED'])
  const [loading, setLoading] = useState(false)
  const [newCatList, setNewCatList] = useState<NewCatItem[]>([])
  const pageSize = 10
  const currentPage = filters.page
  const setCurrentPage = filters.setPage
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const selectedStatus = filters.status
  const setSelectedStatus = filters.setStatus
  const [tagOptions, setTagOptions] = useState<TagTypeOption[]>([])
  const [locationOptions, setLocationOptions] = useState<TypeOption[]>([])
  const latestRequestIdRef = useRef(0)

  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<NewCatItem | null>(null)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [approving, setApproving] = useState(false)
  const [approveItem, setApproveItem] = useState<NewCatItem | null>(null)
  const [approveForm, setApproveForm] = useState({ officialName: '' })
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectItem, setRejectItem] = useState<NewCatItem | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const statusTabs = [
    { label: '全部线索', value: '' },
    { label: '待审核', value: 'PENDING' },
    { label: '已通过', value: 'APPROVED' },
    { label: '已驳回', value: 'REJECTED' }
  ]

  const statusMap: Record<string, { label: string; class: string; icon: LucideIcon }> = {
    PENDING: { label: '待审核', class: 'border-[#FACC15] bg-[#FEF3C7] text-[#8A5A00]', icon: Clock3 },
    APPROVED: { label: '已通过', class: 'border-[#5CD6C2] bg-[#DDF8F2] text-[#116B5E]', icon: CheckCircle2 },
    REJECTED: { label: '已驳回', class: 'border-red-300 bg-red-50 text-red-700', icon: XCircle }
  }

  const tagLabels = new Map(tagOptions.map((item) => [item.id, item.name]))
  const formatTag = (tag: number | string) => {
    const numericTag = typeof tag === 'number' || /^\d+$/.test(String(tag)) ? Number(tag) : null
    return numericTag === null ? tag : tagLabels.get(numericTag) || `标签 #${numericTag}`
  }

  const paginationPages = (() => {
    const pages: (number | string)[] = []
    const pageCount = totalPages
    const current = currentPage

    if (pageCount <= 5) {
      for (let page = 1; page <= pageCount; page += 1) pages.push(page)
    } else if (current <= 3) {
      for (let page = 1; page <= 4; page += 1) pages.push(page)
      pages.push('...', pageCount)
    } else if (current >= pageCount - 2) {
      pages.push(1, '...')
      for (let page = pageCount - 3; page <= pageCount; page += 1) pages.push(page)
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', pageCount)
    }

    return pages
  })()

  const fetchList = async () => {
    const requestId = ++latestRequestIdRef.current
    setLoading(true)
    try {
      const load = (page: number, pageSize: number) => adminNewCatApi.getNewCatList({ page, pageSize, ...(selectedStatus ? { status: selectedStatus } : {}) })
      const keyword = filters.search.trim().toLowerCase()
      const response = keyword ? await filterPagedList<NewCatItem>(load, currentPage, (item) =>
        [item.id, item.tempName, item.officialName, item.campus, item.location, item.submitterName].join(' ').toLowerCase().includes(keyword),
      ) : await load(currentPage, pageSize)
      if (requestId !== latestRequestIdRef.current) return

      const items = response.items || []
      setNewCatList(items)
      setTotal(Number(response.total ?? items.length))
      const responsePages = Number('pages' in response ? response.pages : response.totalPage)
      const resolvedPages = Number.isFinite(responsePages) && responsePages > 0
        ? responsePages : Math.max(Math.ceil(Number(response.total ?? items.length) / pageSize), 1)
      if (currentPage > resolvedPages) setCurrentPage(resolvedPages)
      setTotalPages(resolvedPages)
    } catch (error) {
      if (requestId !== latestRequestIdRef.current) return
      console.error('Failed to fetch new cat list:', error)
      setNewCatList([])
      setTotal(0)
      setTotalPages(1)
      toast.error('获取新喵线索列表失败，请重试')
    } finally {
      if (requestId === latestRequestIdRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    void fetchList()
    return () => { latestRequestIdRef.current += 1 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedStatus, filters.search])

  const handleViewDetails = (item: NewCatItem) => {
    setSelectedItem(item)
    setDetailDialogOpen(true)
  }

  const handleCloseDetail = () => {
    setDetailDialogOpen(false)
    setSelectedItem(null)
  }

  const handleProcess = (item: NewCatItem) => {
    setDetailDialogOpen(false)
    setSelectedItem(null)
    setApproveItem(item)
    setApproveForm({ officialName: item.tempName || '' })
    setApproveDialogOpen(true)
  }

  const handleCloseApprove = () => {
    setApproveDialogOpen(false)
    setApproveItem(null)
    setApproveForm({ officialName: '' })
  }

  const handleSubmitApprove = async () => {
    if (!approveItem) return
    const officialName = approveForm.officialName.trim()
    if (!officialName) {
      toast.error('请输入猫咪正式名称')
      return
    }

    setApproving(true)
    try {
      await adminNewCatApi.approveNewCat(approveItem.id, { officialName })
      toast.success('审核通过，猫咪已正式入库')
      handleCloseApprove()
      await fetchList()
    } catch (error) {
      console.error('Failed to approve new cat:', error)
      toast.error('审核失败，请重试')
    } finally {
      setApproving(false)
    }
  }
  const handleReject = (item: NewCatItem) => {
    setRejectItem(item)
    setRejectReason('')
    setRejectDialogOpen(true)
  }
  const handleSubmitReject = async () => {
    if (!rejectItem) return
    setRejecting(true)
    try {
      await adminNewCatApi.rejectNewCat(rejectItem.id, { reason: rejectReason.trim() || undefined })
      toast.success('线索已驳回')
      setRejectDialogOpen(false)
      setRejectItem(null)
      await fetchList()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '驳回失败，请重试')
    } finally {
      setRejecting(false)
    }
  }

  const formatCampus = (campus: string | number) => {
    if (typeof campus === 'number') return CampusMap[campus] || String(campus)
    if (campus && !/^\d+$/.test(campus)) return campus
    const numericCampus = Number.parseInt(campus, 10)
    return CampusMap[numericCampus] || campus
  }
  const formatLocation = (location: string | number | null | undefined) => {
    if (location == null || location === '') return '未填写详细位置'
    if (typeof location === 'string' && !/^\d+$/.test(location)) return location
    const id = Number(location)
    return locationOptions.find((item) => item.id === id)?.label || `地点 #${id}`
  }

  const formatTime = (value: string) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(date)
  }

  useEffect(() => {
    void Promise.allSettled([typeApi.getTags(), typeApi.getLocations()]).then(([tags, locations]) => {
      if (tags.status === 'fulfilled') setTagOptions(tags.value)
      if (locations.status === 'fulfilled') setLocationOptions(locations.value)
    })
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <header className="admin-page-header flex flex-col gap-4 border-b-2 border-black pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="admin-page-header-icon admin-page-header-icon-yellow flex size-12 shrink-0 items-center justify-center border-2 border-black bg-[#FACC15] shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <PawPrint className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="admin-page-eyebrow text-sm font-bold text-gray-500">CONTENT REVIEW</p>
            <h1 className="admin-page-title mt-1 text-2xl font-black text-gray-950">新喵线索</h1>
            <p className="admin-page-description mt-2 text-sm text-gray-600">审核用户提交的线索，并将确认的猫咪正式入库。</p>
          </div>
        </div>
        <div className="admin-summary-card flex items-center gap-3 self-start border-2 border-black bg-white px-4 py-3 shadow-[3px_3px_0px_rgba(0,0,0,1)] lg:self-auto">
          <Sparkles className="size-5 text-[#116B5E]" aria-hidden="true" />
          <div>
            <p className="text-xs font-bold text-gray-500">线索总数</p>
            <p className="text-lg font-black text-gray-950">{total}</p>
          </div>
        </div>
      </header>

      <section className="admin-filter-panel flex flex-col gap-4 border-2 border-black bg-white p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] sm:flex-row sm:items-center sm:justify-between">
        <Input aria-label="搜索新猫线索" placeholder="搜索猫咪名称、校区或提交人..." value={filters.search} onChange={(event) => filters.setSearch(event.target.value)} className="max-w-xs" />
        <div className="admin-status-tabs flex w-full overflow-x-auto border-2 border-black bg-gray-100 p-1 sm:w-auto" aria-label="线索状态筛选">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={cn(
                'admin-status-tab min-h-9 shrink-0 px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2',
                selectedStatus === tab.value
                  ? 'is-active admin-status-tab-mint bg-[#5CD6C2] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                  : 'text-gray-600 hover:bg-white'
              )}
              aria-pressed={selectedStatus === tab.value}
              onClick={() => setSelectedStatus(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-600">当前第 <span className="font-black text-black">{currentPage}</span> / {totalPages} 页</p>
      </section>

      <section className="admin-panel overflow-hidden border-2 border-black bg-white shadow-[5px_5px_0px_rgba(0,0,0,1)]">
        <div className="admin-panel-header flex items-center justify-between border-b-2 border-black bg-[#F3F4F6] px-5 py-3">
          <h2 className="text-sm font-black text-gray-900">线索列表</h2>
          <span className="text-xs font-bold text-gray-500">每页 {pageSize} 条</span>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[960px] text-left text-sm">
            <TableHeader className="admin-data-table-header bg-[#FFF8DE] [&_tr]:border-black">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-5 font-bold text-gray-700">线索</TableHead>
                <TableHead className="px-5 font-bold text-gray-700">发现位置</TableHead>
                <TableHead className="px-5 font-bold text-gray-700">提交人</TableHead>
                <TableHead className="px-5 font-bold text-gray-700">提交时间</TableHead>
                <TableHead className="px-5 font-bold text-gray-700">状态</TableHead>
                <TableHead className="px-5 text-right font-bold text-gray-700">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="px-5 py-14 text-center text-gray-500">正在加载线索...</TableCell>
                </TableRow>
              ) : newCatList.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="px-5 py-14 text-center text-gray-500">当前筛选下没有线索</TableCell>
                </TableRow>
              ) : (
                newCatList.map((item) => {
                  const StatusIcon = statusMap[item.status]?.icon || Clock3
                  return (
                    <TableRow key={item.id} className="admin-data-table-row border-gray-200 hover:bg-[#FFFDF5]">
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden border-2 border-black bg-gray-100">
                            {item.images?.[0]
                              ? <img src={item.images[0]} alt={item.tempName || '新猫线索图片'} className="size-full object-cover" />
                              : <ImageIcon className="size-5 text-gray-400" aria-hidden="true" />}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-black text-gray-950">{item.tempName || '未命名线索'}</p>
                            <p className="mt-1 text-xs text-gray-500">#{item.id.substring(0, 8).toUpperCase()} · {item.color || '未标记毛色'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex min-w-[150px] items-start gap-2">
                          <MapPin className="mt-0.5 size-4 shrink-0 text-[#116B5E]" aria-hidden="true" />
                          <div>
                            <p className="font-bold text-gray-900">{formatCampus(item.campus)}</p>
                            <p className="mt-1 text-xs text-gray-500">{formatLocation(item.location)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 items-center justify-center rounded-full border border-gray-300 bg-gray-100">
                            <User className="size-3.5 text-gray-600" aria-hidden="true" />
                          </span>
                          <div>
                            <p className="font-bold text-gray-900">{item.submitterName || '匿名用户'}</p>
                            <p className="text-xs text-gray-500">ID: {item.submitterId || '-'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-600">{formatTime(item.createTime)}</TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge variant="outline" className={cn('gap-1.5 border font-bold', statusMap[item.status]?.class || 'border-gray-300 bg-gray-100 text-gray-700')}>
                          <StatusIcon className="size-3.5" aria-hidden="true" />
                          {statusMap[item.status]?.label || item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {item.status === 'PENDING' && (
                            <Button size="sm" className="admin-primary-action border-2 border-black bg-[#5CD6C2] font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-[#48C4B1]" onClick={() => handleProcess(item)}>
                              审核
                            </Button>
                          )}
                          {item.status === 'PENDING' && (
                            <Button variant="outline" size="sm" className="border-2 border-red-300 font-bold text-red-700 hover:bg-red-50" onClick={() => handleReject(item)}>驳回</Button>
                          )}
                          <Button variant="outline" size="sm" className="admin-secondary-action border-2 border-black font-bold hover:bg-[#FACC15]" onClick={() => handleViewDetails(item)}>
                            <Eye className="size-4" aria-hidden="true" />
                            详情
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {total > pageSize && (
          <div className="admin-panel-footer flex flex-col gap-3 border-t-2 border-black bg-[#F3F4F6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">共 <span className="font-black text-black">{total}</span> 条记录</p>
            <Pagination total={total} itemsPerPage={pageSize} page={currentPage} className="self-end sm:self-auto">
              <PaginationContent className="gap-1">
                <PaginationPrevious
                  disabled={currentPage <= 1}
                  className="border border-gray-300 bg-white"
                  onClick={() => { if (currentPage > 1) setCurrentPage(currentPage - 1) }}
                >
                  <ChevronLeft className="size-4" />
                  上一页
                </PaginationPrevious>
                {paginationPages.map((page, index) =>
                  page === '...' ? (
                    <PaginationEllipsis key={`${page}-${index}`} className="px-1 text-gray-500" />
                  ) : (
                    <PaginationItem key={`${page}-${index}`} value={page as number}>
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          'size-8 rounded-none border-gray-300 p-0 font-bold',
                          currentPage === page ? 'border-black bg-[#FACC15] text-black hover:bg-[#FACC15]' : 'bg-white'
                        )}
                        onClick={() => setCurrentPage(page as number)}
                      >
                        {page}
                      </Button>
                    </PaginationItem>
                  )
                )}
                <PaginationNext
                  disabled={currentPage >= totalPages}
                  className="border border-gray-300 bg-white"
                  onClick={() => { if (currentPage < totalPages) setCurrentPage(currentPage + 1) }}
                >
                  下一页
                  <ChevronRight className="size-4" />
                </PaginationNext>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </section>

      <Dialog
        open={detailDialogOpen}
        onOpenChange={(open) => { if (!open) handleCloseDetail() }}
      >
        {selectedItem && (
          <DialogContent className="admin-dialog max-h-[90vh] overflow-y-auto border-2 border-black p-0 sm:max-w-3xl">
            <DialogHeader className="admin-dialog-header border-b-2 border-black bg-[#FFF8DE] px-6 py-5 pr-14">
              <DialogTitle className="text-xl font-black">新喵线索详情</DialogTitle>
              <DialogDescription>核对线索信息后，再决定是否将猫咪正式入库。</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-6 px-6 py-5">
              {selectedItem.images?.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {selectedItem.images.map((image, index) => (
                    <img
                      key={image + index}
                      src={image}
                      alt={`${selectedItem.tempName || '新猫'}图片 ${index + 1}`}
                      className="aspect-square w-full border-2 border-black object-cover"
                    />
                  ))}
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="border border-gray-300 bg-gray-50 p-4"><p className="text-xs font-bold text-gray-500">临时名称</p><p className="mt-1 font-black text-gray-950">{selectedItem.tempName || '未命名'}</p></div>
                <div className="border border-gray-300 bg-gray-50 p-4"><p className="text-xs font-bold text-gray-500">毛色特征</p><p className="mt-1 font-black text-gray-950">{selectedItem.color || '未填写'}</p></div>
                <div className="border border-gray-300 bg-gray-50 p-4"><p className="text-xs font-bold text-gray-500">所在校区</p><p className="mt-1 font-black text-gray-950">{formatCampus(selectedItem.campus)}</p></div>
                <div className="border border-gray-300 bg-gray-50 p-4"><p className="text-xs font-bold text-gray-500">详细位置</p><p className="mt-1 font-black text-gray-950">{formatLocation(selectedItem.location)}</p></div>
              </div>
              <div className="border-2 border-black bg-[#DDF8F2] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="text-xs font-bold text-[#116B5E]">提交信息</p><p className="mt-1 font-black text-gray-950">{selectedItem.submitterName || '匿名用户'}</p></div>
                  <Badge variant="outline" className={cn('border font-bold', statusMap[selectedItem.status]?.class || 'border-gray-300 bg-gray-100 text-gray-700')}>{statusMap[selectedItem.status]?.label || selectedItem.status}</Badge>
                </div>
                <p className="mt-3 text-sm text-gray-600">用户 ID：{selectedItem.submitterId || '-'} · 提交于 {formatTime(selectedItem.createTime)}</p>
              </div>
              {selectedItem.tags?.length ? (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-black text-gray-900">特征标签</h3>
                  <div className="flex flex-wrap gap-2">{selectedItem.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="border-gray-300 bg-white text-gray-700">{formatTag(tag)}</Badge>
                  ))}</div>
                </div>
              ) : null}
            </div>
            <DialogFooter className="admin-dialog-footer border-t-2 border-black bg-[#F3F4F6] px-6 py-4 sm:justify-between">
              <Button variant="outline" className="admin-secondary-action border-2 border-black font-bold" onClick={handleCloseDetail}>关闭</Button>
              {selectedItem.status === 'PENDING' && (
                <Button className="admin-primary-action border-2 border-black bg-[#5CD6C2] font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-[#48C4B1]" onClick={() => handleProcess(selectedItem)}>审核并入库</Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
      <Dialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          setRejectDialogOpen(open)
          if (!open) setRejectItem(null)
        }}
      >
        {rejectItem && (
          <DialogContent className="admin-dialog border-2 border-black p-0 sm:max-w-lg">
            <DialogHeader className="admin-dialog-header border-b-2 border-black bg-red-50 px-6 py-5 pr-14"><DialogTitle className="text-xl font-black">驳回新喵线索</DialogTitle><DialogDescription>驳回后该线索将标记为已驳回，可填写原因帮助用户了解处理结果。</DialogDescription></DialogHeader>
            <div className="px-6 py-5"><label htmlFor="reject-reason" className="grid gap-2"><span className="text-sm font-black">驳回原因（可选）</span><textarea id="reject-reason" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} rows={4} maxLength={300} className="border-2 border-black p-3 text-sm" placeholder="例如：照片无法确认是同一只猫咪" /></label></div>
            <DialogFooter className="admin-dialog-footer border-t-2 border-black bg-gray-50 px-6 py-4"><Button variant="outline" className="border-2 border-black" disabled={rejecting} onClick={() => setRejectDialogOpen(false)}>取消</Button><Button className="border-2 border-black bg-red-500 font-bold text-white hover:bg-red-600" disabled={rejecting} onClick={() => void handleSubmitReject()}>{rejecting ? '提交中...' : '确认驳回'}</Button></DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <Dialog
        open={approveDialogOpen}
        onOpenChange={(open) => { if (!open) handleCloseApprove() }}
      >
        {approveItem && (
          <DialogContent className="admin-dialog border-2 border-black p-0 sm:max-w-lg">
            <DialogHeader className="admin-dialog-header border-b-2 border-black bg-[#DDF8F2] px-6 py-5 pr-14">
              <DialogTitle className="text-xl font-black">审核并入库</DialogTitle>
              <DialogDescription>确认正式名称后，此线索会转为猫咪档案。</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-5 px-6 py-5">
              <div className="flex items-center gap-4 border border-gray-300 bg-gray-50 p-4">
                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden border-2 border-black bg-white">
                  {approveItem.images?.[0]
                    ? <img src={approveItem.images[0]} alt={approveItem.tempName || '新猫'} className="size-full object-cover" />
                    : <ImageIcon className="size-5 text-gray-400" />}
                </div>
                <div className="min-w-0"><p className="truncate font-black text-gray-950">{approveItem.tempName || '未命名线索'}</p><p className="mt-1 text-sm text-gray-500">{formatCampus(approveItem.campus)} · {formatLocation(approveItem.location)}</p></div>
              </div>
              <label className="flex flex-col gap-2" htmlFor="official-name">
                <span className="text-sm font-black text-gray-900">猫咪正式名称</span>
                <Input
                  id="official-name"
                  value={approveForm.officialName}
                  onChange={(event) => setApproveForm({ officialName: event.target.value })}
                  maxLength={30}
                  placeholder="请输入正式名称"
                  className="border-2 border-black bg-white focus-visible:ring-[#FACC15]"
                  onKeyUp={(event) => { if (event.key === 'Enter') void handleSubmitApprove() }}
                />
                <span className="text-xs text-gray-500">审核通过后将以此名称建立正式猫咪档案。</span>
              </label>
            </div>
            <DialogFooter className="admin-dialog-footer border-t-2 border-black bg-[#F3F4F6] px-6 py-4">
              <Button variant="outline" className="admin-secondary-action border-2 border-black font-bold" disabled={approving} onClick={handleCloseApprove}>取消</Button>
              <Button className="admin-primary-action border-2 border-black bg-[#5CD6C2] font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-[#48C4B1]" disabled={approving || !approveForm.officialName.trim()} onClick={() => void handleSubmitApprove()}>{approving ? '提交中...' : '通过并入库'}</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
