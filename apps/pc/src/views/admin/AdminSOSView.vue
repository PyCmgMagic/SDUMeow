<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, type Component } from 'vue'
import { sosApi, typeApi } from '@/lib/api'
import { CampusMap, SOSStatusMap, type SOSItem, type SOSResolutionStatus, type SOSStatus, type TypeOption } from '@/types'
import { toast } from '@/lib/toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import AdminPanel from '@/components/admin/AdminPanel.vue'
import AdminStatusTabs from '@/components/admin/AdminStatusTabs.vue'
import { AlertTriangle, Ban, CheckCircle2, Clock3, Eye, MapPin, RefreshCw, ShieldAlert, Siren } from 'lucide-vue-next'

const pageSize = 10
const loading = ref(false)
const loadError = ref('')
const sosList = ref<SOSItem[]>([])
const currentPage = ref(1)
const total = ref(0)
const totalPages = ref(1)
const selectedStatus = ref<SOSStatus | ''>('')
const resolveDialogOpen = ref(false)
const resolving = ref(false)
const selectedSOS = ref<SOSItem | null>(null)
const locationOptions = ref<TypeOption[]>([])
const replyForm = reactive<{ status: SOSResolutionStatus; reply: string }>({ status: 'PROCESSING', reply: '' })
let latestRequestId = 0

const statusTabs: Array<{ label: string; value: SOSStatus | '' }> = [
  { label: '全部求助', value: '' },
  { label: '待处理', value: 'PENDING' },
  { label: '处理中', value: 'PROCESSING' },
  { label: '已解决', value: 'RESOLVED' },
  { label: '已取消', value: 'CANCELLED' }
]

const statusConfig: Record<SOSStatus, { label: string; class: string; icon: Component }> = {
  PENDING: { label: SOSStatusMap.PENDING, class: 'border-[#FACC15] bg-[#FFF8DE] text-[#8A5A00]', icon: Clock3 },
  PROCESSING: { label: SOSStatusMap.PROCESSING, class: 'border-[#5CD6C2] bg-[#DDF8F2] text-[#116B5E]', icon: ShieldAlert },
  RESOLVED: { label: SOSStatusMap.RESOLVED, class: 'border-gray-300 bg-gray-100 text-gray-700', icon: CheckCircle2 },
  CANCELLED: { label: SOSStatusMap.CANCELLED, class: 'sos-status-cancelled border-red-200 bg-red-50 text-red-700', icon: Ban }
}

const actionConfig: Record<SOSStatus, { label: string; class: string; icon: Component }> = {
  PENDING: { label: '处理救援', class: 'admin-sos-action-process border-2 border-black bg-[#FACC15] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-[#EAB308]', icon: ShieldAlert },
  PROCESSING: { label: '处理救援', class: 'admin-sos-action-process border-2 border-black bg-[#FACC15] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-[#EAB308]', icon: ShieldAlert },
  RESOLVED: { label: '更新记录', class: 'admin-sos-action-update border-2 border-black bg-[#5CD6C2] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-[#48C4B1]', icon: RefreshCw },
  CANCELLED: { label: '查看信息', class: 'admin-sos-action-view border-2 border-black bg-white text-gray-700 hover:bg-gray-100', icon: Eye }
}

const paginationPages = computed(() => {
  if (totalPages.value <= 5) return Array.from({ length: totalPages.value }, (_, index) => index + 1)
  if (currentPage.value <= 3) return [1, 2, 3, 4, '...', totalPages.value]
  if (currentPage.value >= totalPages.value - 2) return [1, '...', totalPages.value - 3, totalPages.value - 2, totalPages.value - 1, totalPages.value]
  return [1, '...', currentPage.value - 1, currentPage.value, currentPage.value + 1, '...', totalPages.value]
})

const statusInfo = (status: SOSStatus) => statusConfig[status] || statusConfig.PENDING
const actionInfo = (status: SOSStatus) => actionConfig[status] || actionConfig.PENDING
const isCancelledSelection = computed(() => selectedSOS.value?.status === 'CANCELLED')
const formatTime = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).format(date)
}
const formatLocation = (location: string | number | null | undefined) => {
  if (location == null || location === '') return '-'
  if (typeof location === 'string' && !/^\d+$/.test(location)) return location
  const id = Number(location)
  return locationOptions.value.find((item) => item.id === id)?.label || `地点 #${id}`
}

const fetchList = async () => {
  const requestId = ++latestRequestId
  loading.value = true
  loadError.value = ''
  try {
    const response = await sosApi.getSOSList({
      page: currentPage.value,
      size: pageSize,
      ...(selectedStatus.value ? { status: selectedStatus.value } : {})
    })
    if (requestId !== latestRequestId) return
    sosList.value = response.items || []
    total.value = Number(response.total || 0)
    totalPages.value = Math.max(Number(response.pages || 1), 1)
  } catch (error) {
    if (requestId !== latestRequestId) return
    sosList.value = []
    total.value = 0
    totalPages.value = 1
    loadError.value = error instanceof Error ? error.message : 'SOS 列表暂时无法加载'
  } finally {
    if (requestId === latestRequestId) loading.value = false
  }
}

const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value && page !== currentPage.value) currentPage.value = page
}

const openSOSDialog = (item: SOSItem) => {
  selectedSOS.value = item
  if (item.status !== 'CANCELLED') {
    replyForm.status = item.status === 'PENDING' ? 'PROCESSING' : 'RESOLVED'
  }
  replyForm.reply = item.adminReply || ''
  resolveDialogOpen.value = true
}

const closeResolveDialog = () => {
  resolveDialogOpen.value = false
  selectedSOS.value = null
  replyForm.status = 'PROCESSING'
  replyForm.reply = ''
}

const submitResolution = async () => {
  if (!selectedSOS.value || selectedSOS.value.status === 'CANCELLED') return
  if (!replyForm.reply.trim()) {
    toast.warning('请填写处理说明')
    return
  }
  resolving.value = true
  try {
    await sosApi.resolveSOS(selectedSOS.value.id, { status: replyForm.status, reply: replyForm.reply.trim() })
    toast.success(replyForm.status === 'RESOLVED' ? '救援已标记为解决' : '救援处理状态已更新')
    closeResolveDialog()
    await fetchList()
  } finally {
    resolving.value = false
  }
}

watch(selectedStatus, () => {
  if (currentPage.value === 1) void fetchList()
  else currentPage.value = 1
})
watch(currentPage, () => void fetchList())
onMounted(() => {
  void fetchList()
  void typeApi.getLocations().then((items) => { locationOptions.value = items }).catch(() => undefined)
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader eyebrow="RESCUE DESK" title="SOS 救援" description="按紧急状态跟进校园猫咪求助，记录处置结论并同步给上报人。" :icon="Siren" tone="yellow">
      <template #summary>
        <div class="admin-summary-card flex items-center gap-3 border-2 border-black bg-white px-4 py-3 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
          <AlertTriangle class="size-5 text-[#8A5A00]" aria-hidden="true" />
          <div><p class="text-xs font-bold text-gray-500">救援总数</p><p class="text-lg font-black text-gray-950">{{ total }}</p></div>
        </div>
      </template>
    </AdminPageHeader>

    <AdminPanel>
      <div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <AdminStatusTabs v-model="selectedStatus" ariaLabel="SOS 处理状态" :options="statusTabs" tone="yellow" />
        <p class="text-sm text-gray-600">当前第 <strong class="text-black">{{ currentPage }}</strong> / {{ totalPages }} 页</p>
      </div>
    </AdminPanel>

    <AdminPanel title="救援队列" :meta="`每页 ${pageSize} 条`">
      <div v-if="loadError" class="flex flex-wrap items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">
        <span>{{ loadError }}</span>
        <Button variant="outline" size="sm" class="border-red-300 bg-white text-red-800 hover:bg-red-100" @click="fetchList">重试</Button>
      </div>
      <div class="overflow-x-auto">
        <Table class="min-w-[1030px] text-left text-sm">
          <TableHeader class="admin-data-table-header bg-[#FFF8DE] [&_tr]:border-black">
            <TableRow class="hover:bg-transparent">
              <TableHead class="px-5 font-bold text-gray-700">求助对象</TableHead>
              <TableHead class="px-5 font-bold text-gray-700">现场位置</TableHead>
              <TableHead class="px-5 font-bold text-gray-700">症状与描述</TableHead>
              <TableHead class="px-5 font-bold text-gray-700">上报人</TableHead>
              <TableHead class="px-5 font-bold text-gray-700">状态</TableHead>
              <TableHead class="px-5 font-bold text-gray-700">上报时间</TableHead>
              <TableHead class="px-5 text-right font-bold text-gray-700">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="loading" class="hover:bg-transparent"><TableCell colspan="7" class="px-5 py-14 text-center text-gray-500">正在加载救援队列...</TableCell></TableRow>
            <TableRow v-else-if="sosList.length === 0" class="hover:bg-transparent"><TableCell colspan="7" class="px-5 py-14 text-center text-gray-500">当前筛选下没有 SOS 求助</TableCell></TableRow>
            <TableRow v-for="item in sosList" v-else :key="item.id" class="admin-data-table-row border-gray-200 hover:bg-[#FFFDF5]">
              <TableCell class="px-5 py-4"><div class="flex items-center gap-3"><img v-if="item.imageURLs?.[0]" :src="item.imageURLs[0]" :alt="item.catName || '救援现场'" class="size-10 rounded-none border-2 border-black object-cover" /><span v-else class="flex size-10 items-center justify-center border-2 border-black bg-gray-100"><Siren class="size-5 text-gray-500" /></span><div><p class="font-black text-gray-950">{{ item.catName || '未收录猫咪' }}</p><p class="mt-1 text-xs text-gray-500">{{ item.catId ? `档案 ${item.catId}` : '未知猫咪' }}</p></div></div></TableCell>
              <TableCell class="px-5 py-4"><div class="flex items-start gap-2 text-gray-700"><MapPin class="mt-0.5 size-4 shrink-0 text-[#8A5A00]" /><div><p class="font-bold">{{ formatLocation(item.location) }}</p><p class="mt-1 text-xs text-gray-500">{{ CampusMap[item.campus] || `校区 #${item.campus}` }}</p></div></div></TableCell>
              <TableCell class="max-w-[280px] px-5 py-4"><div class="flex flex-wrap gap-1.5"><Badge v-for="tag in item.symptoms" :key="tag" variant="outline" class="border-red-200 bg-red-50 text-red-700">{{ tag }}</Badge></div><p class="mt-2 line-clamp-2 text-xs leading-5 text-gray-600">{{ item.description }}</p></TableCell>
              <TableCell class="px-5 py-4"><p class="font-bold text-gray-900">{{ item.reporterName || '-' }}</p><p class="mt-1 text-xs text-gray-500">{{ item.reporterId ? `ID ${item.reporterId}` : '-' }}</p></TableCell>
              <TableCell class="px-5 py-4"><Badge variant="outline" class="gap-1 font-bold" :class="statusInfo(item.status).class"><component :is="statusInfo(item.status).icon" class="size-3.5" />{{ statusInfo(item.status).label }}</Badge></TableCell>
              <TableCell class="px-5 py-4 text-gray-600">{{ formatTime(item.create_time) }}</TableCell>
              <TableCell class="px-5 py-4 text-right"><Button variant="outline" size="sm" class="admin-sos-action font-bold" :class="actionInfo(item.status).class" @click="openSOSDialog(item)"><component :is="actionInfo(item.status).icon" data-icon="inline-start" />{{ actionInfo(item.status).label }}</Button></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <template #footer>
        <div v-if="totalPages > 1" class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p class="text-sm text-gray-600">共 <strong class="text-black">{{ total }}</strong> 条救援记录</p><div class="flex flex-wrap items-center gap-2 self-end sm:self-auto"><Button variant="outline" size="sm" :disabled="currentPage <= 1" @click="changePage(currentPage - 1)">上一页</Button><template v-for="(page, index) in paginationPages" :key="`${page}-${index}`"><span v-if="page === '...'" class="px-1 text-gray-500">...</span><Button v-else size="sm" :variant="page === currentPage ? 'default' : 'outline'" :class="page === currentPage ? 'border-2 border-black bg-[#FACC15] text-black hover:bg-[#FACC15]' : ''" @click="changePage(Number(page))">{{ page }}</Button></template><Button variant="outline" size="sm" :disabled="currentPage >= totalPages" @click="changePage(currentPage + 1)">下一页</Button></div></div>
      </template>
    </AdminPanel>

    <Dialog v-model:open="resolveDialogOpen" @update:open="(open) => !open && closeResolveDialog()">
      <DialogContent class="admin-dialog border-2 border-black p-0 sm:max-w-2xl">
        <DialogHeader class="admin-dialog-header border-b-2 border-black bg-[#FFF8DE] px-6 py-5 pr-14">
          <DialogTitle class="text-xl font-black">{{ isCancelledSelection ? '查看已取消 SOS' : '处理 SOS 救援' }}</DialogTitle>
          <DialogDescription>{{ isCancelledSelection ? '该请求已由上报人取消，仅可查看原始信息，不能继续处理。' : '处理说明会反馈给上报人，请清楚说明当前进度或最终结论。' }}</DialogDescription>
        </DialogHeader>
        <div v-if="selectedSOS" class="grid max-h-[70vh] gap-5 overflow-y-auto px-6 py-5">
          <div class="grid gap-3 border-2 border-black bg-gray-50 p-4 sm:grid-cols-3">
            <div><p class="text-xs font-bold text-gray-500">求助对象</p><p class="mt-1 font-black">{{ selectedSOS.catName || '未收录猫咪' }}</p></div>
            <div><p class="text-xs font-bold text-gray-500">现场位置</p><p class="mt-1 font-black">{{ CampusMap[selectedSOS.campus] || `校区 #${selectedSOS.campus}` }} · {{ formatLocation(selectedSOS.location) }}</p></div>
            <div><p class="text-xs font-bold text-gray-500">上报时间</p><p class="mt-1 font-black">{{ formatTime(selectedSOS.create_time) }}</p></div>
          </div>
          <section class="grid gap-3">
            <div class="flex flex-wrap gap-1.5"><Badge v-for="tag in selectedSOS.symptoms" :key="tag" variant="outline" class="border-red-200 bg-red-50 text-red-700">{{ tag }}</Badge></div>
            <p class="break-words text-sm leading-6 text-gray-700">{{ selectedSOS.description || '暂无现场描述' }}</p>
          </section>
          <section v-if="selectedSOS.imageURLs?.length" class="grid gap-2">
            <p class="text-sm font-black">现场图片</p>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3"><img v-for="(image, index) in selectedSOS.imageURLs" :key="image" :src="image" :alt="`SOS 现场图片 ${index + 1}`" class="aspect-square w-full border-2 border-black object-cover" /></div>
          </section>
          <div v-if="isCancelledSelection" class="admin-sos-readonly-note flex items-start gap-3 border-2 border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"><Ban class="mt-1 size-4 shrink-0" /><div><p class="font-black">请求已取消</p><p>管理员可保留查看记录，但不能修改状态或提交新的处理说明。</p></div></div>
          <template v-else>
            <label class="flex flex-col gap-2"><span class="text-sm font-black">处理状态</span><Select v-model="replyForm.status"><SelectTrigger class="border-2 border-black"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PROCESSING">处理中</SelectItem><SelectItem value="RESOLVED">已解决</SelectItem></SelectContent></Select></label>
            <label class="flex flex-col gap-2" for="sos-reply"><span class="text-sm font-black">处理说明</span><Textarea id="sos-reply" v-model="replyForm.reply" rows="5" maxlength="500" placeholder="说明已采取的救援措施、后续安排或处理结果" class="border-2 border-black focus-visible:ring-[#FACC15]" /></label>
          </template>
          <div v-if="isCancelledSelection && selectedSOS.adminReply" class="border-l-4 border-[#5CD6C2] bg-[#DDF8F2] p-3 text-sm leading-6 text-[#116B5E]"><strong>历史处理说明：</strong>{{ selectedSOS.adminReply }}</div>
        </div>
        <DialogFooter class="admin-dialog-footer border-t-2 border-black bg-gray-50 px-6 py-4"><Button variant="outline" class="admin-secondary-action border-2 border-black" :disabled="resolving" @click="closeResolveDialog">{{ isCancelledSelection ? '关闭' : '取消' }}</Button><Button v-if="!isCancelledSelection" class="admin-primary-action border-2 border-black bg-[#FACC15] font-black text-black hover:bg-[#EAB308]" :disabled="resolving" @click="submitResolution">{{ resolving ? '正在保存...' : '保存处理结果' }}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
