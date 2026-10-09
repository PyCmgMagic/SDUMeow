import { invalidateRelatedQueries } from '@shared/mutationSync'
import { readDraft, useRetainedState } from '@shared/drafts'
import { useEffect, useRef, useState, type ComponentType } from 'react'
import { useListFilters } from '@shared/useListFilters'
import { adminAnnouncementApi } from '@pc/lib/api'
import {
  AnnouncementLegacyTypeMap,
  AnnouncementTypeMap,
  type Announcement,
  type AnnouncementInput,
  type AnnouncementStatus,
  type AnnouncementType,
  type FlexiblePageResult
} from '@pc/types'
import { toast } from '@pc/lib/toast'
import { Badge } from '@pc/components/ui/badge'
import { Button } from '@pc/components/ui/button'
import { ConfirmDialog } from '@pc/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@pc/components/ui/dialog'
import { Input } from '@pc/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@pc/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@pc/components/ui/table'
import { Textarea } from '@pc/components/ui/textarea'
import {
  BookOpen,
  CheckCircle2,
  HeartPulse,
  Newspaper,
  Pencil,
  Plus,
  Send,
  Trash2,
  UtensilsCrossed
} from 'lucide-react'

const PAGE_SIZE = 10

const emptyForm = (): AnnouncementInput => ({
  title: '', content: '', summary: '', coverImage: '', type: 'NEWS', status: 'DRAFT'
})

const typeOptions: Array<{ value: AnnouncementType; label: string }> = [
  { value: 'HEALTH', label: '健康知识' },
  { value: 'FEEDING', label: '喂养指南' },
  { value: 'BEHAVIOR', label: '行为解读' },
  { value: 'NEWS', label: '校园资讯' }
]

const statusOptions: Array<{ value: '' | AnnouncementStatus; label: string }> = [
  { value: '', label: '全部公告' },
  { value: 'DRAFT', label: '草稿' },
  { value: 'PUBLISHED', label: '已发布' }
]

const pageItems = <T,>(data: FlexiblePageResult<T>): T[] => data.items || data.records || data.list || []

const normalizeType = (type: Announcement['type']): AnnouncementType => {
  const value = String(type).toUpperCase()
  return AnnouncementLegacyTypeMap[value] || (value as AnnouncementType)
}

const typeLabel = (type: Announcement['type']) => AnnouncementTypeMap[String(type)] || String(type)

const typeIcon = (type: Announcement['type']): ComponentType<{ className?: string }> => {
  const normalized = normalizeType(type)
  if (normalized === 'HEALTH') return HeartPulse
  if (normalized === 'FEEDING') return UtensilsCrossed
  if (normalized === 'BEHAVIOR') return BookOpen
  return Newspaper
}

const statusLabel = (status: Announcement['status']) => {
  const value = String(status).toUpperCase()
  return value === '1' || value === 'PUBLISHED' ? '已发布' : '草稿'
}

const isPublished = (status: Announcement['status']) => {
  const value = String(status).toUpperCase()
  return value === '1' || value === 'PUBLISHED'
}

const formatTime = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).format(date)
}

export function DesktopLayout() {
  const filters = useListFilters(['DRAFT', 'PUBLISHED'])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [listError, setListError] = useState('')
  const [items, setItems] = useState<Announcement[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const currentPage = filters.page
  const setCurrentPage = filters.setPage
  const statusFilter = filters.status as '' | AnnouncementStatus
  const latestRequestId = useRef(0)

  const [editorOpen, setEditorOpen] = useRetainedState('admin-announcements-dialog', 'editorOpen', false)
  const [editingId, setEditingId] = useRetainedState('admin-announcements-dialog', 'editingId', '')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<Announcement | null>(null)

  const [form, setForm] = useRetainedState<AnnouncementInput>('admin-announcements-dialog', 'form', emptyForm)
  const closeEditor = () => {
    setEditorOpen(false)
    setEditingId('')
    setForm(emptyForm())
  }

  const publishedCount = items.filter((item) => isPublished(item.status)).length

  const fetchList = async (statusOverride?: '' | AnnouncementStatus) => {
    const requestId = ++latestRequestId.current
    setLoading(true)
    setListError('')
    try {
      const data = await adminAnnouncementApi.getAnnouncements({
        page: currentPage,
        pageSize: PAGE_SIZE,
        status: (statusOverride ?? statusFilter) || undefined
      })
      const resolvedItems = pageItems(data)
      if (requestId !== latestRequestId.current) return
      setItems(resolvedItems)
      setTotal(Number(data.total ?? resolvedItems.length))
      setTotalPages(Math.max(Number(data.totalPage ?? data.pages ?? 1), 1))
      if (currentPage > Math.max(Number(data.totalPage ?? data.pages ?? 1), 1)) setCurrentPage(Math.max(Number(data.totalPage ?? data.pages ?? 1), 1))
    } catch (error) {
      if (requestId !== latestRequestId.current) return
      console.error('Failed to load announcements', error)
      setItems([])
      setTotal(0)
      setTotalPages(1)
      setListError('公告列表暂时无法加载，请稍后重试。')
      toast.error('获取公告列表失败')
    } finally {
      if (requestId === latestRequestId.current) setLoading(false)
    }
  }

  const openCreate = () => {
    const saved = readDraft('admin-announcements-dialog').values
    setEditingId('')
    setForm(saved.editingId === '' && saved.form ? saved.form as AnnouncementInput : emptyForm())
    setEditorOpen(true)
  }

  const openEdit = (item: Announcement) => {
    const saved = readDraft('admin-announcements-dialog').values
    setEditingId(item.id)
    setForm(saved.editingId === item.id && saved.form ? saved.form as AnnouncementInput : {
      title: item.title,
      content: item.content,
      summary: item.summary || '',
      coverImage: item.coverImage || '',
      type: normalizeType(item.type),
      status: isPublished(item.status) ? 'PUBLISHED' : 'DRAFT'
    })
    setEditorOpen(true)
  }

  const saveAnnouncement = async () => {
    if (!form.title.trim()) return toast.warning('请输入公告标题')
    if (!form.content.trim()) return toast.warning('请输入公告正文')

    setSaving(true)
    try {
      const payload: AnnouncementInput = {
        ...form,
        title: form.title.trim(),
        content: form.content.trim(),
        summary: form.summary?.trim() || '',
        coverImage: form.coverImage?.trim() || ''
      }

      if (editingId) {
        await adminAnnouncementApi.updateAnnouncement(editingId, payload)
        toast.success('公告已更新')
      } else {
        await adminAnnouncementApi.createAnnouncement(payload)
        toast.success(payload.status === 'PUBLISHED' ? '公告已发布' : '草稿已保存')
      }

      setEditorOpen(false)
      setForm(emptyForm())
      setEditingId('')
      await fetchList()
      invalidateRelatedQueries('announcement')
    } finally {
      setSaving(false)
    }
  }

  const requestDelete = (item: Announcement) => {
    setDeletingItem(item)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingItem) return
    setDeleting(true)
    try {
      await adminAnnouncementApi.deleteAnnouncement(deletingItem.id)
      invalidateRelatedQueries('announcement')
      toast.success('公告已删除')
      setDeleteOpen(false)
      setDeletingItem(null)
      await fetchList()
    } finally {
      setDeleting(false)
    }
  }

  const changePage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return
    setCurrentPage(page)
  }

  const onStatusFilterChange = (value: '' | AnnouncementStatus) => {
    filters.setStatus(value)
  }

  // 对应 Vue 的 watch(currentPage) + onMounted：挂载与翻页时拉取列表。
  useEffect(() => {
    void fetchList()
    return () => { latestRequestId.current += 1 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter])

  return (
    <div className="flex flex-col gap-6">
      <header className="admin-page-header flex flex-col gap-4 border-b-2 border-black pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="admin-page-header-icon admin-page-header-icon-mint flex size-12 shrink-0 items-center justify-center border-2 border-black bg-[#5CD6C2] shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            <Newspaper className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="admin-page-eyebrow text-sm font-bold text-gray-500">CONTENT CENTER</p>
            <h1 className="admin-page-title mt-1 text-2xl font-black text-gray-950">公告管理</h1>
            <p className="admin-page-description mt-2 text-sm text-gray-600">维护面向全站用户的校园资讯、健康知识和喂养指南。</p>
          </div>
        </div>
        <Button className="admin-primary-action self-start border-2 border-black bg-[#5CD6C2] font-black text-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-[#48C4B1] lg:self-auto" onClick={openCreate}>
          <Plus className="size-4" aria-hidden="true" />
          新建公告
        </Button>
      </header>

      <section className="admin-filter-panel flex flex-col gap-4 border-2 border-black bg-white p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] sm:flex-row sm:items-center sm:justify-between">
        <div className="admin-status-tabs flex w-full overflow-x-auto border-2 border-black bg-gray-100 p-1 sm:w-auto" aria-label="公告状态筛选">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`admin-status-tab min-h-9 shrink-0 px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
                statusFilter === option.value
                  ? 'is-active admin-status-tab-yellow bg-[#FACC15] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                  : 'text-gray-600 hover:bg-white'
              }`}
              aria-pressed={statusFilter === option.value}
              onClick={() => onStatusFilterChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>共 <strong className="text-black">{total}</strong> 条</span>
          <span className="h-4 border-l border-gray-300" aria-hidden="true" />
          <span>本页已发布 <strong className="text-[#116B5E]">{publishedCount}</strong> 条</span>
        </div>
      </section>

      <section className="admin-panel overflow-hidden border-2 border-black bg-white shadow-[5px_5px_0px_rgba(0,0,0,1)]">
        <div className="admin-panel-header flex items-center justify-between border-b-2 border-black bg-[#F3F4F6] px-5 py-3">
          <h2 className="text-sm font-black text-gray-900">公告列表</h2>
          <span className="text-xs font-bold text-gray-500">每页 {PAGE_SIZE} 条</span>
        </div>

        {listError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">
            <span>{listError}</span>
            <Button variant="outline" size="sm" className="border-red-300 bg-white text-red-800 hover:bg-red-100" onClick={() => void fetchList()}>重试</Button>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <Table className="min-w-[900px] text-left text-sm">
            <TableHeader className="admin-data-table-header bg-[#FFF8DE] [&_tr]:border-black">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-5 font-bold text-gray-700">公告内容</TableHead>
                <TableHead className="px-5 font-bold text-gray-700">类型</TableHead>
                <TableHead className="px-5 font-bold text-gray-700">状态</TableHead>
                <TableHead className="px-5 font-bold text-gray-700">作者</TableHead>
                <TableHead className="px-5 font-bold text-gray-700">更新时间</TableHead>
                <TableHead className="px-5 text-right font-bold text-gray-700">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="hover:bg-transparent"><TableCell colSpan={6} className="px-5 py-14 text-center text-gray-500">正在加载公告...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow className="hover:bg-transparent"><TableCell colSpan={6} className="px-5 py-14 text-center text-gray-500">当前筛选下没有公告</TableCell></TableRow>
              ) : (
                items.map((item) => {
                  const TypeIcon = typeIcon(item.type)
                  return (
                    <TableRow key={item.id} className="admin-data-table-row border-gray-200 hover:bg-[#FFFDF5]">
                      <TableCell className="max-w-[420px] px-5 py-4">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center border-2 border-black bg-[#FACC15]">
                            <TypeIcon className="size-5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0"><p className="truncate font-black text-gray-950">{item.title}</p><p className="mt-1 line-clamp-1 text-xs text-gray-500">{item.summary || item.content}</p></div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4"><Badge variant="outline" className="border-gray-300 bg-white font-bold text-gray-700">{typeLabel(item.type)}</Badge></TableCell>
                      <TableCell className="px-5 py-4"><Badge variant="outline" className={`gap-1 border font-bold ${isPublished(item.status) ? 'border-[#5CD6C2] bg-[#DDF8F2] text-[#116B5E]' : 'border-gray-300 bg-gray-100 text-gray-700'}`}>{isPublished(item.status) ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : null}{statusLabel(item.status)}</Badge></TableCell>
                      <TableCell className="px-5 py-4 text-gray-600">{item.authorName || '系统管理员'}</TableCell>
                      <TableCell className="px-5 py-4 text-gray-600">{formatTime(item.updateTime || item.createTime)}</TableCell>
                      <TableCell className="px-5 py-4"><div className="flex justify-end gap-2"><Button variant="outline" size="sm" className="border-2 border-black font-bold hover:bg-[#FACC15]" onClick={() => openEdit(item)}><Pencil className="size-4" aria-hidden="true" />编辑</Button><Button variant="outline" size="sm" className="border-2 border-black text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => requestDelete(item)}><Trash2 className="size-4" aria-hidden="true" /><span className="sr-only">删除</span></Button></div></TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 ? (
          <div className="admin-panel-footer flex flex-col gap-3 border-t-2 border-black bg-[#F3F4F6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">第 <span className="font-black text-black">{currentPage}</span> / {totalPages} 页</p>
            <div className="flex items-center gap-2 self-end sm:self-auto"><Button variant="outline" size="sm" className="border border-gray-300 bg-white" disabled={currentPage <= 1} onClick={() => changePage(currentPage - 1)}>上一页</Button><span className="min-w-14 text-center text-sm font-bold text-gray-700">{currentPage} / {totalPages}</span><Button variant="outline" size="sm" className="border border-gray-300 bg-white" disabled={currentPage >= totalPages} onClick={() => changePage(currentPage + 1)}>下一页</Button></div>
          </div>
        ) : null}
      </section>

      <Dialog open={editorOpen} onOpenChange={(open) => open ? setEditorOpen(true) : closeEditor()}>
        <DialogContent className="admin-dialog max-h-[90vh] overflow-y-auto border-2 border-black p-0 sm:max-w-3xl">
          <DialogHeader className="admin-dialog-header border-b-2 border-black bg-[#FFF8DE] px-6 py-5 pr-14"><DialogTitle className="text-xl font-black">{editingId ? '编辑公告' : '新建公告'}</DialogTitle><DialogDescription>保存为草稿，或在确认后直接发布给所有用户。</DialogDescription></DialogHeader>
          <div className="grid gap-5 px-6 py-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2 sm:col-span-2" htmlFor="announcement-title"><span className="text-sm font-black text-gray-900">标题</span><Input id="announcement-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} maxLength={100} placeholder="输入公告标题" className="border-2 border-black focus-visible:ring-[#FACC15]" /></label>
            <div className="flex flex-col gap-2"><label className="text-sm font-black text-gray-900">类型</label><Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value as AnnouncementType }))}><SelectTrigger aria-label="公告类型" className="border-2 border-black bg-white focus:ring-[#FACC15]"><SelectValue placeholder="选择类型" /></SelectTrigger><SelectContent><SelectGroup>{typeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent></Select></div>
            <div className="flex flex-col gap-2"><label className="text-sm font-black text-gray-900">发布状态</label><Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as AnnouncementStatus }))}><SelectTrigger aria-label="公告发布状态" className="border-2 border-black bg-white focus:ring-[#FACC15]"><SelectValue placeholder="选择状态" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="DRAFT">保存草稿</SelectItem><SelectItem value="PUBLISHED">立即发布</SelectItem></SelectGroup></SelectContent></Select></div>
            <label className="flex flex-col gap-2 sm:col-span-2" htmlFor="announcement-summary"><span className="text-sm font-black text-gray-900">摘要</span><Input id="announcement-summary" value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} maxLength={200} placeholder="在公告列表中展示的简短说明" className="border-2 border-black focus-visible:ring-[#FACC15]" /></label>
            <label className="flex flex-col gap-2 sm:col-span-2" htmlFor="announcement-cover"><span className="text-sm font-black text-gray-900">封面 URL 或 COS Key <span className="font-medium text-gray-500">（可选）</span></span><Input id="announcement-cover" value={form.coverImage} onChange={(event) => setForm((current) => ({ ...current, coverImage: event.target.value }))} placeholder="https://... 或 meow/..." className="border-2 border-black focus-visible:ring-[#FACC15]" /></label>
            <label className="flex flex-col gap-2 sm:col-span-2" htmlFor="announcement-content"><span className="text-sm font-black text-gray-900">正文</span><Textarea id="announcement-content" value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} className="min-h-56 border-2 border-black focus-visible:ring-[#FACC15]" placeholder="输入公告正文" /></label>
          </div>
          <DialogFooter className="admin-dialog-footer border-t-2 border-black bg-[#F3F4F6] px-6 py-4"><Button variant="outline" className="admin-secondary-action border-2 border-black font-bold" disabled={saving} onClick={closeEditor}>取消</Button><Button className="admin-primary-action border-2 border-black bg-[#5CD6C2] font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-[#48C4B1]" disabled={saving} onClick={() => void saveAnnouncement()}><Send className="size-4" aria-hidden="true" />{saving ? '保存中...' : form.status === 'PUBLISHED' ? '发布公告' : '保存草稿'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="删除公告" description={`确定删除“${deletingItem?.title || ''}”吗？此操作无法撤销。`} confirmText="删除" variant="danger" loading={deleting} onConfirm={() => void confirmDelete()} />
    </div>
  )
}
