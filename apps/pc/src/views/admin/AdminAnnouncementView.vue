<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, type Component } from 'vue'
import { adminAnnouncementApi } from '@/lib/api'
import {
  AnnouncementLegacyTypeMap,
  AnnouncementTypeMap,
  type Announcement,
  type AnnouncementInput,
  type AnnouncementStatus,
  type AnnouncementType,
  type FlexiblePageResult
} from '@/types'
import { toast } from '@/lib/toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
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
} from 'lucide-vue-next'

const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const listError = ref('')
const items = ref<Announcement[]>([])
const total = ref(0)
const totalPages = ref(1)
const currentPage = ref(1)
const pageSize = 10
const statusFilter = ref<'' | AnnouncementStatus>('')

const editorOpen = ref(false)
const editingId = ref('')
const deleteOpen = ref(false)
const deletingItem = ref<Announcement | null>(null)

const emptyForm = (): AnnouncementInput => ({
  title: '', content: '', summary: '', coverImage: '', type: 'NEWS', status: 'DRAFT'
})

const form = reactive<AnnouncementInput>(emptyForm())

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

const pageItems = <T>(data: FlexiblePageResult<T>): T[] => data.items || data.records || data.list || []

const typeLabel = (type: Announcement['type']) => AnnouncementTypeMap[String(type)] || String(type)

const typeIcon = (type: Announcement['type']): Component => {
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

const publishedCount = computed(() => items.value.filter((item) => isPublished(item.status)).length)

const formatTime = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).format(date)
}

const fetchList = async () => {
  loading.value = true
  listError.value = ''
  try {
    const data = await adminAnnouncementApi.getAnnouncements({
      page: currentPage.value,
      pageSize,
      status: statusFilter.value || undefined
    })
    items.value = pageItems(data)
    total.value = Number(data.total ?? items.value.length)
    totalPages.value = Math.max(Number(data.totalPage ?? data.pages ?? 1), 1)
  } catch (error) {
    console.error('Failed to load announcements', error)
    items.value = []
    total.value = 0
    totalPages.value = 1
    listError.value = '公告列表暂时无法加载，请稍后重试。'
    toast.error('获取公告列表失败')
  } finally {
    loading.value = false
  }
}

const resetForm = () => Object.assign(form, emptyForm())

const openCreate = () => {
  editingId.value = ''
  resetForm()
  editorOpen.value = true
}

const normalizeType = (type: Announcement['type']): AnnouncementType => {
  const value = String(type).toUpperCase()
  return AnnouncementLegacyTypeMap[value] || (value as AnnouncementType)
}

const openEdit = (item: Announcement) => {
  editingId.value = item.id
  Object.assign(form, {
    title: item.title,
    content: item.content,
    summary: item.summary || '',
    coverImage: item.coverImage || '',
    type: normalizeType(item.type),
    status: isPublished(item.status) ? 'PUBLISHED' : 'DRAFT'
  })
  editorOpen.value = true
}

const saveAnnouncement = async () => {
  if (!form.title.trim()) return toast.warning('请输入公告标题')
  if (!form.content.trim()) return toast.warning('请输入公告正文')

  saving.value = true
  try {
    const payload: AnnouncementInput = {
      ...form,
      title: form.title.trim(),
      content: form.content.trim(),
      summary: form.summary?.trim() || '',
      coverImage: form.coverImage?.trim() || ''
    }

    if (editingId.value) {
      await adminAnnouncementApi.updateAnnouncement(editingId.value, payload)
      toast.success('公告已更新')
    } else {
      await adminAnnouncementApi.createAnnouncement(payload)
      toast.success(payload.status === 'PUBLISHED' ? '公告已发布' : '草稿已保存')
    }

    editorOpen.value = false
    await fetchList()
  } finally {
    saving.value = false
  }
}

const requestDelete = (item: Announcement) => {
  deletingItem.value = item
  deleteOpen.value = true
}

const confirmDelete = async () => {
  if (!deletingItem.value) return
  deleting.value = true
  try {
    await adminAnnouncementApi.deleteAnnouncement(deletingItem.value.id)
    toast.success('公告已删除')
    deleteOpen.value = false
    deletingItem.value = null
    await fetchList()
  } finally {
    deleting.value = false
  }
}

const changePage = (page: number) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  currentPage.value = page
}

watch(statusFilter, () => {
  if (currentPage.value === 1) void fetchList()
  else currentPage.value = 1
})

watch(currentPage, () => void fetchList())
onMounted(() => void fetchList())
</script>

<template>
  <div class="flex flex-col gap-6">
    <header class="admin-page-header flex flex-col gap-4 border-b-2 border-black pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div class="flex items-start gap-4">
        <div class="admin-page-header-icon admin-page-header-icon-mint flex size-12 shrink-0 items-center justify-center border-2 border-black bg-[#5CD6C2] shadow-[3px_3px_0px_rgba(0,0,0,1)]">
          <Newspaper class="size-6" aria-hidden="true" />
        </div>
        <div>
          <p class="admin-page-eyebrow text-sm font-bold text-gray-500">CONTENT CENTER</p>
          <h1 class="admin-page-title mt-1 text-2xl font-black text-gray-950">公告管理</h1>
          <p class="admin-page-description mt-2 text-sm text-gray-600">维护面向全站用户的校园资讯、健康知识和喂养指南。</p>
        </div>
      </div>
      <Button class="admin-primary-action self-start border-2 border-black bg-[#5CD6C2] font-black text-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-[#48C4B1] lg:self-auto" @click="openCreate">
        <Plus class="size-4" aria-hidden="true" />
        新建公告
      </Button>
    </header>

    <section class="admin-filter-panel flex flex-col gap-4 border-2 border-black bg-white p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] sm:flex-row sm:items-center sm:justify-between">
      <div class="admin-status-tabs flex w-full overflow-x-auto border-2 border-black bg-gray-100 p-1 sm:w-auto" aria-label="公告状态筛选">
        <button
          v-for="option in statusOptions"
          :key="option.value"
          type="button"
          class="admin-status-tab min-h-9 shrink-0 px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          :class="statusFilter === option.value ? 'is-active admin-status-tab-yellow bg-[#FACC15] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'text-gray-600 hover:bg-white'"
          :aria-pressed="statusFilter === option.value"
          @click="statusFilter = option.value"
        >
          {{ option.label }}
        </button>
      </div>
      <div class="flex items-center gap-3 text-sm text-gray-600">
        <span>共 <strong class="text-black">{{ total }}</strong> 条</span>
        <span class="h-4 border-l border-gray-300" aria-hidden="true" />
        <span>本页已发布 <strong class="text-[#116B5E]">{{ publishedCount }}</strong> 条</span>
      </div>
    </section>

    <section class="admin-panel overflow-hidden border-2 border-black bg-white shadow-[5px_5px_0px_rgba(0,0,0,1)]">
      <div class="admin-panel-header flex items-center justify-between border-b-2 border-black bg-[#F3F4F6] px-5 py-3">
        <h2 class="text-sm font-black text-gray-900">公告列表</h2>
        <span class="text-xs font-bold text-gray-500">每页 {{ pageSize }} 条</span>
      </div>

      <div v-if="listError" class="flex flex-wrap items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">
        <span>{{ listError }}</span>
        <Button variant="outline" size="sm" class="border-red-300 bg-white text-red-800 hover:bg-red-100" @click="fetchList">重试</Button>
      </div>

      <div class="overflow-x-auto">
        <Table class="min-w-[900px] text-left text-sm">
          <TableHeader class="admin-data-table-header bg-[#FFF8DE] [&_tr]:border-black">
            <TableRow class="hover:bg-transparent">
              <TableHead class="px-5 font-bold text-gray-700">公告内容</TableHead>
              <TableHead class="px-5 font-bold text-gray-700">类型</TableHead>
              <TableHead class="px-5 font-bold text-gray-700">状态</TableHead>
              <TableHead class="px-5 font-bold text-gray-700">作者</TableHead>
              <TableHead class="px-5 font-bold text-gray-700">更新时间</TableHead>
              <TableHead class="px-5 text-right font-bold text-gray-700">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="loading" class="hover:bg-transparent"><TableCell colspan="6" class="px-5 py-14 text-center text-gray-500">正在加载公告...</TableCell></TableRow>
            <TableRow v-else-if="items.length === 0" class="hover:bg-transparent"><TableCell colspan="6" class="px-5 py-14 text-center text-gray-500">当前筛选下没有公告</TableCell></TableRow>
            <TableRow v-for="item in items" v-else :key="item.id" class="admin-data-table-row border-gray-200 hover:bg-[#FFFDF5]">
              <TableCell class="max-w-[420px] px-5 py-4">
                <div class="flex items-start gap-3">
                  <span class="mt-0.5 flex size-10 shrink-0 items-center justify-center border-2 border-black bg-[#FACC15]">
                    <component :is="typeIcon(item.type)" class="size-5" aria-hidden="true" />
                  </span>
                  <div class="min-w-0"><p class="truncate font-black text-gray-950">{{ item.title }}</p><p class="mt-1 line-clamp-1 text-xs text-gray-500">{{ item.summary || item.content }}</p></div>
                </div>
              </TableCell>
              <TableCell class="px-5 py-4"><Badge variant="outline" class="border-gray-300 bg-white font-bold text-gray-700">{{ typeLabel(item.type) }}</Badge></TableCell>
              <TableCell class="px-5 py-4"><Badge variant="outline" class="gap-1 border font-bold" :class="isPublished(item.status) ? 'border-[#5CD6C2] bg-[#DDF8F2] text-[#116B5E]' : 'border-gray-300 bg-gray-100 text-gray-700'"><CheckCircle2 v-if="isPublished(item.status)" class="size-3.5" aria-hidden="true" />{{ statusLabel(item.status) }}</Badge></TableCell>
              <TableCell class="px-5 py-4 text-gray-600">{{ item.authorName || '系统管理员' }}</TableCell>
              <TableCell class="px-5 py-4 text-gray-600">{{ formatTime(item.updateTime || item.createTime) }}</TableCell>
              <TableCell class="px-5 py-4"><div class="flex justify-end gap-2"><Button variant="outline" size="sm" class="border-2 border-black font-bold hover:bg-[#FACC15]" @click="openEdit(item)"><Pencil class="size-4" aria-hidden="true" />编辑</Button><Button variant="outline" size="sm" class="border-2 border-black text-red-700 hover:bg-red-50 hover:text-red-800" @click="requestDelete(item)"><Trash2 class="size-4" aria-hidden="true" /><span class="sr-only">删除</span></Button></div></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div v-if="totalPages > 1" class="admin-panel-footer flex flex-col gap-3 border-t-2 border-black bg-[#F3F4F6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-gray-600">第 <span class="font-black text-black">{{ currentPage }}</span> / {{ totalPages }} 页</p>
        <div class="flex items-center gap-2 self-end sm:self-auto"><Button variant="outline" size="sm" class="border border-gray-300 bg-white" :disabled="currentPage <= 1" @click="changePage(currentPage - 1)">上一页</Button><span class="min-w-14 text-center text-sm font-bold text-gray-700">{{ currentPage }} / {{ totalPages }}</span><Button variant="outline" size="sm" class="border border-gray-300 bg-white" :disabled="currentPage >= totalPages" @click="changePage(currentPage + 1)">下一页</Button></div>
      </div>
    </section>

    <Dialog v-model:open="editorOpen">
      <DialogContent class="admin-dialog max-h-[90vh] overflow-y-auto border-2 border-black p-0 sm:max-w-3xl">
        <DialogHeader class="admin-dialog-header border-b-2 border-black bg-[#FFF8DE] px-6 py-5 pr-14"><DialogTitle class="text-xl font-black">{{ editingId ? '编辑公告' : '新建公告' }}</DialogTitle><DialogDescription>保存为草稿，或在确认后直接发布给所有用户。</DialogDescription></DialogHeader>
        <div class="grid gap-5 px-6 py-5 sm:grid-cols-2">
          <label class="flex flex-col gap-2 sm:col-span-2" for="announcement-title"><span class="text-sm font-black text-gray-900">标题</span><Input id="announcement-title" v-model="form.title" maxlength="100" placeholder="输入公告标题" class="border-2 border-black focus-visible:ring-[#FACC15]" /></label>
          <div class="flex flex-col gap-2"><label class="text-sm font-black text-gray-900">类型</label><Select v-model="form.type"><SelectTrigger aria-label="公告类型" class="border-2 border-black bg-white focus:ring-[#FACC15]"><SelectValue placeholder="选择类型" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="option in typeOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectGroup></SelectContent></Select></div>
          <div class="flex flex-col gap-2"><label class="text-sm font-black text-gray-900">发布状态</label><Select v-model="form.status"><SelectTrigger aria-label="公告发布状态" class="border-2 border-black bg-white focus:ring-[#FACC15]"><SelectValue placeholder="选择状态" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="DRAFT">保存草稿</SelectItem><SelectItem value="PUBLISHED">立即发布</SelectItem></SelectGroup></SelectContent></Select></div>
          <label class="flex flex-col gap-2 sm:col-span-2" for="announcement-summary"><span class="text-sm font-black text-gray-900">摘要</span><Input id="announcement-summary" v-model="form.summary" maxlength="200" placeholder="在公告列表中展示的简短说明" class="border-2 border-black focus-visible:ring-[#FACC15]" /></label>
          <label class="flex flex-col gap-2 sm:col-span-2" for="announcement-cover"><span class="text-sm font-black text-gray-900">封面 URL 或 COS Key <span class="font-medium text-gray-500">（可选）</span></span><Input id="announcement-cover" v-model="form.coverImage" placeholder="https://... 或 meow/..." class="border-2 border-black focus-visible:ring-[#FACC15]" /></label>
          <label class="flex flex-col gap-2 sm:col-span-2" for="announcement-content"><span class="text-sm font-black text-gray-900">正文</span><Textarea id="announcement-content" v-model="form.content" class="min-h-56 border-2 border-black focus-visible:ring-[#FACC15]" placeholder="输入公告正文" /></label>
        </div>
        <DialogFooter class="admin-dialog-footer border-t-2 border-black bg-[#F3F4F6] px-6 py-4"><Button variant="outline" class="admin-secondary-action border-2 border-black font-bold" :disabled="saving" @click="editorOpen = false">取消</Button><Button class="admin-primary-action border-2 border-black bg-[#5CD6C2] font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-[#48C4B1]" :disabled="saving" @click="saveAnnouncement"><Send class="size-4" aria-hidden="true" />{{ saving ? '保存中...' : form.status === 'PUBLISHED' ? '发布公告' : '保存草稿' }}</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog v-model:open="deleteOpen" title="删除公告" :description="`确定删除“${deletingItem?.title || ''}”吗？此操作无法撤销。`" confirm-text="删除" variant="danger" :loading="deleting" @confirm="confirmDelete" />
  </div>
</template>
