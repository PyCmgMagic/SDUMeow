<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, type Component } from 'vue'
import { adminNewCatApi, typeApi } from '@/lib/api'
import { CampusMap, type NewCatItem, type TagTypeOption, type TypeOption } from '@/types'
import { toast } from '@/lib/toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
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
} from 'lucide-vue-next'

const loading = ref(false)
const newCatList = ref<NewCatItem[]>([])
const pageSize = 10
const currentPage = ref(1)
const total = ref(0)
const totalPages = ref(1)
const selectedStatus = ref('')
const tagOptions = ref<TagTypeOption[]>([])
const locationOptions = ref<TypeOption[]>([])
let latestRequestId = 0

const detailDialogOpen = ref(false)
const selectedItem = ref<NewCatItem | null>(null)
const approveDialogOpen = ref(false)
const approving = ref(false)
const approveItem = ref<NewCatItem | null>(null)
const approveForm = reactive({ officialName: '' })
const rejectDialogOpen = ref(false)
const rejecting = ref(false)
const rejectItem = ref<NewCatItem | null>(null)
const rejectReason = ref('')

const statusTabs = [
  { label: '全部线索', value: '' },
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' }
]

const statusMap: Record<string, { label: string; class: string; icon: Component }> = {
  PENDING: { label: '待审核', class: 'border-[#FACC15] bg-[#FEF3C7] text-[#8A5A00]', icon: Clock3 },
  APPROVED: { label: '已通过', class: 'border-[#5CD6C2] bg-[#DDF8F2] text-[#116B5E]', icon: CheckCircle2 },
  REJECTED: { label: '已驳回', class: 'border-red-300 bg-red-50 text-red-700', icon: XCircle }
}

const tagLabels = computed(() => new Map(tagOptions.value.map((item) => [item.id, item.name])))
const formatTag = (tag: number | string) => {
  const numericTag = typeof tag === 'number' || /^\d+$/.test(tag) ? Number(tag) : null
  return numericTag === null ? tag : tagLabels.value.get(numericTag) || `标签 #${numericTag}`
}

const paginationPages = computed(() => {
  const pages: (number | string)[] = []
  const pageCount = totalPages.value
  const current = currentPage.value

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
})

const fetchList = async () => {
  const requestId = ++latestRequestId
  loading.value = true
  try {
    const response = await adminNewCatApi.getNewCatList({
      page: currentPage.value,
      pageSize,
      ...(selectedStatus.value ? { status: selectedStatus.value } : {})
    })
    if (requestId !== latestRequestId) return

    newCatList.value = response.items || []
    total.value = Number(response.total ?? newCatList.value.length)
    const responsePages = Number(response.totalPage)
    totalPages.value = Number.isFinite(responsePages) && responsePages > 0
      ? responsePages
      : Math.max(Math.ceil(total.value / pageSize), 1)
  } catch (error) {
    if (requestId !== latestRequestId) return
    console.error('Failed to fetch new cat list:', error)
    newCatList.value = []
    total.value = 0
    totalPages.value = 1
    toast.error('获取新喵线索列表失败，请重试')
  } finally {
    if (requestId === latestRequestId) loading.value = false
  }
}

watch(selectedStatus, () => {
  if (currentPage.value === 1) void fetchList()
  else currentPage.value = 1
})

watch(currentPage, () => void fetchList())

const handleViewDetails = (item: NewCatItem) => {
  selectedItem.value = item
  detailDialogOpen.value = true
}

const handleCloseDetail = () => {
  detailDialogOpen.value = false
  selectedItem.value = null
}

const handleProcess = (item: NewCatItem) => {
  detailDialogOpen.value = false
  selectedItem.value = null
  approveItem.value = item
  approveForm.officialName = item.tempName || ''
  approveDialogOpen.value = true
}

const handleCloseApprove = () => {
  approveDialogOpen.value = false
  approveItem.value = null
  approveForm.officialName = ''
}

const handleSubmitApprove = async () => {
  if (!approveItem.value) return
  const officialName = approveForm.officialName.trim()
  if (!officialName) {
    toast.error('请输入猫咪正式名称')
    return
  }

  approving.value = true
  try {
    await adminNewCatApi.approveNewCat(approveItem.value.id, { officialName })
    toast.success('审核通过，猫咪已正式入库')
    handleCloseApprove()
    await fetchList()
  } catch (error) {
    console.error('Failed to approve new cat:', error)
    toast.error('审核失败，请重试')
  } finally {
    approving.value = false
  }
}
const handleReject = (item: NewCatItem) => {
  rejectItem.value = item
  rejectReason.value = ''
  rejectDialogOpen.value = true
}
const handleSubmitReject = async () => {
  if (!rejectItem.value) return
  rejecting.value = true
  try {
    await adminNewCatApi.rejectNewCat(rejectItem.value.id, { reason: rejectReason.value.trim() || undefined })
    toast.success('线索已驳回')
    rejectDialogOpen.value = false
    rejectItem.value = null
    await fetchList()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '驳回失败，请重试')
  } finally {
    rejecting.value = false
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
  return locationOptions.value.find((item) => item.id === id)?.label || `地点 #${id}`
}

const formatTime = (value: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).format(date)
}

onMounted(() => {
  void fetchList()
  void Promise.allSettled([typeApi.getTags(), typeApi.getLocations()]).then(([tags, locations]) => {
    if (tags.status === 'fulfilled') tagOptions.value = tags.value
    if (locations.status === 'fulfilled') locationOptions.value = locations.value
  })
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <header class="admin-page-header flex flex-col gap-4 border-b-2 border-black pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div class="flex items-start gap-4">
        <div class="admin-page-header-icon admin-page-header-icon-yellow flex size-12 shrink-0 items-center justify-center border-2 border-black bg-[#FACC15] shadow-[3px_3px_0px_rgba(0,0,0,1)]">
          <PawPrint class="size-6" aria-hidden="true" />
        </div>
        <div>
          <p class="admin-page-eyebrow text-sm font-bold text-gray-500">CONTENT REVIEW</p>
          <h1 class="admin-page-title mt-1 text-2xl font-black text-gray-950">新喵线索</h1>
          <p class="admin-page-description mt-2 text-sm text-gray-600">审核用户提交的线索，并将确认的猫咪正式入库。</p>
        </div>
      </div>
      <div class="admin-summary-card flex items-center gap-3 self-start border-2 border-black bg-white px-4 py-3 shadow-[3px_3px_0px_rgba(0,0,0,1)] lg:self-auto">
        <Sparkles class="size-5 text-[#116B5E]" aria-hidden="true" />
        <div>
          <p class="text-xs font-bold text-gray-500">线索总数</p>
          <p class="text-lg font-black text-gray-950">{{ total }}</p>
        </div>
      </div>
    </header>

    <section class="admin-filter-panel flex flex-col gap-4 border-2 border-black bg-white p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] sm:flex-row sm:items-center sm:justify-between">
      <div class="admin-status-tabs flex w-full overflow-x-auto border-2 border-black bg-gray-100 p-1 sm:w-auto" aria-label="线索状态筛选">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          type="button"
          class="admin-status-tab min-h-9 shrink-0 px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          :class="selectedStatus === tab.value ? 'is-active admin-status-tab-mint bg-[#5CD6C2] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'text-gray-600 hover:bg-white'"
          :aria-pressed="selectedStatus === tab.value"
          @click="selectedStatus = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>
      <p class="text-sm text-gray-600">当前第 <span class="font-black text-black">{{ currentPage }}</span> / {{ totalPages }} 页</p>
    </section>

    <section class="admin-panel overflow-hidden border-2 border-black bg-white shadow-[5px_5px_0px_rgba(0,0,0,1)]">
      <div class="admin-panel-header flex items-center justify-between border-b-2 border-black bg-[#F3F4F6] px-5 py-3">
        <h2 class="text-sm font-black text-gray-900">线索列表</h2>
        <span class="text-xs font-bold text-gray-500">每页 {{ pageSize }} 条</span>
      </div>

      <div class="overflow-x-auto">
        <Table class="min-w-[960px] text-left text-sm">
          <TableHeader class="admin-data-table-header bg-[#FFF8DE] [&_tr]:border-black">
            <TableRow class="hover:bg-transparent">
              <TableHead class="px-5 font-bold text-gray-700">线索</TableHead>
              <TableHead class="px-5 font-bold text-gray-700">发现位置</TableHead>
              <TableHead class="px-5 font-bold text-gray-700">提交人</TableHead>
              <TableHead class="px-5 font-bold text-gray-700">提交时间</TableHead>
              <TableHead class="px-5 font-bold text-gray-700">状态</TableHead>
              <TableHead class="px-5 text-right font-bold text-gray-700">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="loading" class="hover:bg-transparent">
              <TableCell colspan="6" class="px-5 py-14 text-center text-gray-500">正在加载线索...</TableCell>
            </TableRow>
            <TableRow v-else-if="newCatList.length === 0" class="hover:bg-transparent">
              <TableCell colspan="6" class="px-5 py-14 text-center text-gray-500">当前筛选下没有线索</TableCell>
            </TableRow>
            <TableRow v-for="item in newCatList" v-else :key="item.id" class="admin-data-table-row border-gray-200 hover:bg-[#FFFDF5]">
              <TableCell class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div class="flex size-12 shrink-0 items-center justify-center overflow-hidden border-2 border-black bg-gray-100">
                    <img v-if="item.images?.[0]" :src="item.images[0]" :alt="item.tempName || '新猫线索图片'" class="size-full object-cover">
                    <ImageIcon v-else class="size-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-black text-gray-950">{{ item.tempName || '未命名线索' }}</p>
                    <p class="mt-1 text-xs text-gray-500">#{{ item.id.substring(0, 8).toUpperCase() }} · {{ item.color || '未标记毛色' }}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell class="px-5 py-4">
                <div class="flex min-w-[150px] items-start gap-2">
                  <MapPin class="mt-0.5 size-4 shrink-0 text-[#116B5E]" aria-hidden="true" />
                  <div>
                    <p class="font-bold text-gray-900">{{ formatCampus(item.campus) }}</p>
                    <p class="mt-1 text-xs text-gray-500">{{ formatLocation(item.location) }}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell class="px-5 py-4">
                <div class="flex items-center gap-2">
                  <span class="flex size-7 items-center justify-center rounded-full border border-gray-300 bg-gray-100">
                    <User class="size-3.5 text-gray-600" aria-hidden="true" />
                  </span>
                  <div>
                    <p class="font-bold text-gray-900">{{ item.submitterName || '匿名用户' }}</p>
                    <p class="text-xs text-gray-500">ID: {{ item.submitterId || '-' }}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell class="px-5 py-4 text-sm text-gray-600">{{ formatTime(item.createTime) }}</TableCell>
              <TableCell class="px-5 py-4">
                <Badge variant="outline" class="gap-1.5 border font-bold" :class="statusMap[item.status]?.class || 'border-gray-300 bg-gray-100 text-gray-700'">
                  <component :is="statusMap[item.status]?.icon || Clock3" class="size-3.5" aria-hidden="true" />
                  {{ statusMap[item.status]?.label || item.status }}
                </Badge>
              </TableCell>
              <TableCell class="px-5 py-4">
                <div class="flex justify-end gap-2">
                  <Button v-if="item.status === 'PENDING'" size="sm" class="admin-primary-action border-2 border-black bg-[#5CD6C2] font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-[#48C4B1]" @click="handleProcess(item)">
                    审核
                  </Button>
                  <Button v-if="item.status === 'PENDING'" variant="outline" size="sm" class="border-2 border-red-300 font-bold text-red-700 hover:bg-red-50" @click="handleReject(item)">驳回</Button>
                  <Button variant="outline" size="sm" class="admin-secondary-action border-2 border-black font-bold hover:bg-[#FACC15]" @click="handleViewDetails(item)">
                    <Eye class="size-4" aria-hidden="true" />
                    详情
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div v-if="total > pageSize" class="admin-panel-footer flex flex-col gap-3 border-t-2 border-black bg-[#F3F4F6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-gray-600">共 <span class="font-black text-black">{{ total }}</span> 条记录</p>
        <Pagination :total="total" :items-per-page="pageSize" :page="currentPage" class="self-end sm:self-auto">
          <PaginationContent class="gap-1">
            <PaginationPrevious :disabled="currentPage <= 1" class="border border-gray-300 bg-white" @click="currentPage > 1 && (currentPage -= 1)">
              <ChevronLeft class="size-4" />
              上一页
            </PaginationPrevious>
            <template v-for="(page, index) in paginationPages" :key="`${page}-${index}`">
              <PaginationEllipsis v-if="page === '...'" class="px-1 text-gray-500" />
              <PaginationItem v-else :value="page as number">
                <Button size="sm" variant="outline" class="size-8 rounded-none border-gray-300 p-0 font-bold" :class="currentPage === page ? 'border-black bg-[#FACC15] text-black hover:bg-[#FACC15]' : 'bg-white'" @click="currentPage = page as number">
                  {{ page }}
                </Button>
              </PaginationItem>
            </template>
            <PaginationNext :disabled="currentPage >= totalPages" class="border border-gray-300 bg-white" @click="currentPage < totalPages && (currentPage += 1)">
              下一页
              <ChevronRight class="size-4" />
            </PaginationNext>
          </PaginationContent>
        </Pagination>
      </div>
    </section>

    <Dialog :open="detailDialogOpen" @update:open="(open) => !open && handleCloseDetail()">
      <DialogContent v-if="selectedItem" class="admin-dialog max-h-[90vh] overflow-y-auto border-2 border-black p-0 sm:max-w-3xl">
        <DialogHeader class="admin-dialog-header border-b-2 border-black bg-[#FFF8DE] px-6 py-5 pr-14">
          <DialogTitle class="text-xl font-black">新喵线索详情</DialogTitle>
          <DialogDescription>核对线索信息后，再决定是否将猫咪正式入库。</DialogDescription>
        </DialogHeader>
        <div class="flex flex-col gap-6 px-6 py-5">
          <div v-if="selectedItem.images?.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <img v-for="(image, index) in selectedItem.images" :key="image + index" :src="image" :alt="`${selectedItem.tempName || '新猫'}图片 ${index + 1}`" class="aspect-square w-full border-2 border-black object-cover">
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="border border-gray-300 bg-gray-50 p-4"><p class="text-xs font-bold text-gray-500">临时名称</p><p class="mt-1 font-black text-gray-950">{{ selectedItem.tempName || '未命名' }}</p></div>
            <div class="border border-gray-300 bg-gray-50 p-4"><p class="text-xs font-bold text-gray-500">毛色特征</p><p class="mt-1 font-black text-gray-950">{{ selectedItem.color || '未填写' }}</p></div>
            <div class="border border-gray-300 bg-gray-50 p-4"><p class="text-xs font-bold text-gray-500">所在校区</p><p class="mt-1 font-black text-gray-950">{{ formatCampus(selectedItem.campus) }}</p></div>
            <div class="border border-gray-300 bg-gray-50 p-4"><p class="text-xs font-bold text-gray-500">详细位置</p><p class="mt-1 font-black text-gray-950">{{ formatLocation(selectedItem.location) }}</p></div>
          </div>
          <div class="border-2 border-black bg-[#DDF8F2] p-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div><p class="text-xs font-bold text-[#116B5E]">提交信息</p><p class="mt-1 font-black text-gray-950">{{ selectedItem.submitterName || '匿名用户' }}</p></div>
              <Badge variant="outline" class="border font-bold" :class="statusMap[selectedItem.status]?.class || 'border-gray-300 bg-gray-100 text-gray-700'">{{ statusMap[selectedItem.status]?.label || selectedItem.status }}</Badge>
            </div>
            <p class="mt-3 text-sm text-gray-600">用户 ID：{{ selectedItem.submitterId || '-' }} · 提交于 {{ formatTime(selectedItem.createTime) }}</p>
          </div>
          <div v-if="selectedItem.tags?.length" class="flex flex-col gap-2">
            <h3 class="text-sm font-black text-gray-900">特征标签</h3>
            <div class="flex flex-wrap gap-2"><Badge v-for="tag in selectedItem.tags" :key="tag" variant="outline" class="border-gray-300 bg-white text-gray-700">{{ formatTag(tag) }}</Badge></div>
          </div>
        </div>
        <DialogFooter class="admin-dialog-footer border-t-2 border-black bg-[#F3F4F6] px-6 py-4 sm:justify-between">
          <Button variant="outline" class="admin-secondary-action border-2 border-black font-bold" @click="handleCloseDetail">关闭</Button>
          <Button v-if="selectedItem.status === 'PENDING'" class="admin-primary-action border-2 border-black bg-[#5CD6C2] font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-[#48C4B1]" @click="handleProcess(selectedItem)">审核并入库</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog :open="rejectDialogOpen" @update:open="(open) => { rejectDialogOpen = open; if (!open) rejectItem = null }">
      <DialogContent v-if="rejectItem" class="admin-dialog border-2 border-black p-0 sm:max-w-lg">
        <DialogHeader class="admin-dialog-header border-b-2 border-black bg-red-50 px-6 py-5 pr-14"><DialogTitle class="text-xl font-black">驳回新喵线索</DialogTitle><DialogDescription>驳回后该线索将标记为已驳回，可填写原因帮助用户了解处理结果。</DialogDescription></DialogHeader>
        <div class="px-6 py-5"><label for="reject-reason" class="grid gap-2"><span class="text-sm font-black">驳回原因（可选）</span><textarea id="reject-reason" v-model="rejectReason" rows="4" maxlength="300" class="border-2 border-black p-3 text-sm" placeholder="例如：照片无法确认是同一只猫咪" /></label></div>
        <DialogFooter class="admin-dialog-footer border-t-2 border-black bg-gray-50 px-6 py-4"><Button variant="outline" class="border-2 border-black" :disabled="rejecting" @click="rejectDialogOpen = false">取消</Button><Button class="border-2 border-black bg-red-500 font-bold text-white hover:bg-red-600" :disabled="rejecting" @click="handleSubmitReject">{{ rejecting ? '提交中...' : '确认驳回' }}</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog :open="approveDialogOpen" @update:open="(open) => !open && handleCloseApprove()">
      <DialogContent v-if="approveItem" class="admin-dialog border-2 border-black p-0 sm:max-w-lg">
        <DialogHeader class="admin-dialog-header border-b-2 border-black bg-[#DDF8F2] px-6 py-5 pr-14">
          <DialogTitle class="text-xl font-black">审核并入库</DialogTitle>
          <DialogDescription>确认正式名称后，此线索会转为猫咪档案。</DialogDescription>
        </DialogHeader>
        <div class="flex flex-col gap-5 px-6 py-5">
          <div class="flex items-center gap-4 border border-gray-300 bg-gray-50 p-4">
            <div class="flex size-14 shrink-0 items-center justify-center overflow-hidden border-2 border-black bg-white"><img v-if="approveItem.images?.[0]" :src="approveItem.images[0]" :alt="approveItem.tempName || '新猫'" class="size-full object-cover"><ImageIcon v-else class="size-5 text-gray-400" /></div>
            <div class="min-w-0"><p class="truncate font-black text-gray-950">{{ approveItem.tempName || '未命名线索' }}</p><p class="mt-1 text-sm text-gray-500">{{ formatCampus(approveItem.campus) }} · {{ formatLocation(approveItem.location) }}</p></div>
          </div>
          <label class="flex flex-col gap-2" for="official-name">
            <span class="text-sm font-black text-gray-900">猫咪正式名称</span>
            <Input id="official-name" v-model="approveForm.officialName" maxlength="30" placeholder="请输入正式名称" class="border-2 border-black bg-white focus-visible:ring-[#FACC15]" @keyup.enter="handleSubmitApprove" />
            <span class="text-xs text-gray-500">审核通过后将以此名称建立正式猫咪档案。</span>
          </label>
        </div>
        <DialogFooter class="admin-dialog-footer border-t-2 border-black bg-[#F3F4F6] px-6 py-4">
          <Button variant="outline" class="admin-secondary-action border-2 border-black font-bold" :disabled="approving" @click="handleCloseApprove">取消</Button>
          <Button class="admin-primary-action border-2 border-black bg-[#5CD6C2] font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-[#48C4B1]" :disabled="approving || !approveForm.officialName.trim()" @click="handleSubmitApprove">{{ approving ? '提交中...' : '通过并入库' }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
