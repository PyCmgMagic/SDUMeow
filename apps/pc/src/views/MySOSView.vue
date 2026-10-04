<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { sosApi } from '@/lib/api'
import { CampusMap, SOSStatusMap, type SOSItem, type SOSStatus } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/lib/toast'
import { ArrowLeft, Ban, CheckCircle2, Clock3, Image as ImageIcon, LifeBuoy, MapPin, ShieldAlert } from 'lucide-vue-next'

const router = useRouter()
const pageSize = 10
const items = ref<SOSItem[]>([])
const currentPage = ref(1)
const total = ref(0)
const totalPages = ref(1)
const selectedStatus = ref<SOSStatus | ''>('')
const loading = ref(false)
const loadError = ref('')
const cancelTarget = ref<SOSItem | null>(null)
const cancelDialogOpen = ref(false)
const cancelling = ref(false)
let latestRequestId = 0

const statusTabs: Array<{ label: string; value: SOSStatus | '' }> = [
  { label: '全部记录', value: '' }, { label: '待处理', value: 'PENDING' }, { label: '处理中', value: 'PROCESSING' }, { label: '已解决', value: 'RESOLVED' }, { label: '已取消', value: 'CANCELLED' }
]
const statusConfig: Record<SOSStatus, { label: string; class: string; icon: Component }> = {
  PENDING: { label: SOSStatusMap.PENDING, class: 'border-[#FACC15] bg-[#FFF8DE] text-[#8A5A00]', icon: Clock3 },
  PROCESSING: { label: SOSStatusMap.PROCESSING, class: 'border-[#5CD6C2] bg-[#DDF8F2] text-[#116B5E]', icon: ShieldAlert },
  RESOLVED: { label: SOSStatusMap.RESOLVED, class: 'border-gray-300 bg-gray-100 text-gray-700', icon: CheckCircle2 },
  CANCELLED: { label: SOSStatusMap.CANCELLED, class: 'sos-status-cancelled border-red-200 bg-red-50 text-red-700', icon: Ban }
}
const visiblePages = computed(() => {
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(totalPages.value, currentPage.value + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})
const statusInfo = (status: SOSStatus) => statusConfig[status] || statusConfig.PENDING
const formatTime = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)
}
const fetchRecords = async () => {
  const requestId = ++latestRequestId
  loading.value = true
  loadError.value = ''
  try {
    const response = await sosApi.getMySOS({ page: currentPage.value, size: pageSize, ...(selectedStatus.value ? { status: selectedStatus.value } : {}) })
    if (requestId !== latestRequestId) return
    items.value = response.items || []
    total.value = Number(response.total || 0)
    totalPages.value = Math.max(Number(response.pages || 1), 1)
  } catch (error) {
    if (requestId !== latestRequestId) return
    items.value = []
    total.value = 0
    totalPages.value = 1
    loadError.value = error instanceof Error ? error.message : 'SOS 记录暂时无法加载'
  } finally { if (requestId === latestRequestId) loading.value = false }
}
const changePage = (page: number) => { if (page >= 1 && page <= totalPages.value && page !== currentPage.value) currentPage.value = page }
const requestCancel = (item: SOSItem) => {
  cancelTarget.value = item
  cancelDialogOpen.value = true
}
const confirmCancel = async () => {
  if (!cancelTarget.value || cancelling.value) return

  cancelling.value = true
  try {
    await sosApi.cancelSOS(cancelTarget.value.id)
    toast.success('SOS 请求已取消')
    cancelDialogOpen.value = false
    cancelTarget.value = null
    await fetchRecords()
    if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '取消 SOS 失败，请稍后重试')
  } finally {
    cancelling.value = false
  }
}
watch(selectedStatus, () => { if (currentPage.value === 1) void fetchRecords(); else currentPage.value = 1 })
watch(currentPage, () => void fetchRecords())
onMounted(() => void fetchRecords())
</script>

<template>
  <div class="min-h-full bg-gray-50 px-4 py-6 sm:px-6">
    <main class="mx-auto flex max-w-5xl flex-col gap-5">
      <header class="flex flex-col gap-4 border-b-2 border-black pb-5 sm:flex-row sm:items-end sm:justify-between"><div class="flex items-start gap-3"><Button variant="outline" size="icon" class="shrink-0 border-2 border-black bg-white hover:bg-[#FACC15]" aria-label="返回个人中心" @click="router.push('/userCenter')"><ArrowLeft class="size-4" /></Button><div><p class="text-sm font-bold text-gray-500">PERSONAL RECORDS</p><h1 class="mt-1 text-2xl font-black text-gray-950">我的 SOS</h1><p class="mt-2 text-sm text-gray-600">跟进已提交的救援请求和管理员处理结果。</p></div></div><div class="border-2 border-black bg-white px-4 py-3 shadow-[3px_3px_0px_rgba(0,0,0,1)]"><p class="text-xs font-bold text-gray-500">记录总数</p><p class="text-lg font-black text-gray-950">{{ total }}</p></div></header>
      <section class="border-2 border-black bg-white p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]"><div class="flex w-full overflow-x-auto border-2 border-black bg-gray-100 p-1 sm:w-fit"><button v-for="tab in statusTabs" :key="tab.value" type="button" class="min-h-9 shrink-0 px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black" :class="selectedStatus === tab.value ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]' : 'text-gray-600 hover:bg-white'" :aria-pressed="selectedStatus === tab.value" @click="selectedStatus = tab.value">{{ tab.label }}</button></div></section>
      <section class="overflow-hidden border-2 border-black bg-white shadow-[5px_5px_0px_rgba(0,0,0,1)]"><div class="flex items-center justify-between border-b-2 border-black bg-[#F3F4F6] px-5 py-3"><h2 class="text-sm font-black">救援记录</h2><span class="text-xs font-bold text-gray-500">每页 {{ pageSize }} 条</span></div><div v-if="loading" class="py-16 text-center text-sm text-gray-500">正在加载 SOS 记录...</div><div v-else-if="loadError" class="flex flex-col items-center gap-3 px-5 py-16 text-center text-sm text-red-700"><span>{{ loadError }}</span><Button variant="outline" size="sm" class="border-2 border-black" @click="fetchRecords">重新加载</Button></div><div v-else-if="items.length === 0" class="flex flex-col items-center gap-3 px-5 py-16 text-center text-gray-500"><LifeBuoy class="size-10 text-gray-300" /><p class="text-sm">当前筛选下没有 SOS 记录</p><Button variant="outline" size="sm" class="border-2 border-black" @click="router.push('/sos')">发起救援请求</Button></div><div v-else class="divide-y-2 divide-black"><article v-for="item in items" :key="item.id" class="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto]"><div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><h3 class="font-black text-gray-950">{{ item.catName || '未收录猫咪' }}</h3><Badge variant="outline" class="gap-1 font-bold" :class="statusInfo(item.status).class"><component :is="statusInfo(item.status).icon" class="size-3.5" />{{ statusInfo(item.status).label }}</Badge></div><p class="mt-2 flex items-center gap-1.5 text-sm text-gray-600"><MapPin class="size-4 shrink-0 text-[#8A5A00]" /><span class="min-w-0 break-words">{{ CampusMap[item.campus] || `校区 #${item.campus}` }} · {{ item.location }}</span></p><div class="mt-3 flex flex-wrap gap-1.5"><Badge v-for="symptom in item.symptoms" :key="symptom" variant="outline" class="border-red-200 bg-red-50 text-red-700">{{ symptom }}</Badge></div><p class="mt-3 break-words text-sm leading-6 text-gray-700">{{ item.description }}</p><div v-if="item.imageURLs?.length" class="mt-3 flex items-center gap-1.5 text-xs text-gray-500"><ImageIcon class="size-4" />已提交 {{ item.imageURLs.length }} 张现场图片</div><div v-if="item.adminReply" class="mt-4 border-l-4 border-[#5CD6C2] bg-[#DDF8F2] p-3 text-sm leading-6 text-[#116B5E]"><strong>处理说明：</strong>{{ item.adminReply }}</div><div v-if="item.status === 'CANCELLED'" class="sos-cancelled-note mt-4 flex items-start gap-2 border-2 border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700"><Ban class="mt-1 size-4 shrink-0" /><p>该 SOS 请求已取消，不再进入救援处理流程。</p></div></div><div class="flex items-center justify-between gap-3 sm:flex-col sm:items-end"><time class="whitespace-nowrap text-xs font-bold text-gray-500">{{ formatTime(item.create_time) }}</time><Button v-if="item.status === 'PENDING'" variant="outline" size="sm" class="shrink-0 border-2 border-red-300 text-red-700 hover:border-red-500 hover:bg-red-50" @click="requestCancel(item)"><Ban data-icon="inline-start" />取消请求</Button></div></article></div><footer v-if="totalPages > 1" class="flex flex-col gap-3 border-t-2 border-black bg-[#F3F4F6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><span class="text-sm text-gray-600">第 <strong class="text-black">{{ currentPage }}</strong> / {{ totalPages }} 页</span><div class="flex flex-wrap items-center gap-2 self-end sm:self-auto"><Button variant="outline" size="sm" :disabled="currentPage <= 1" @click="changePage(currentPage - 1)">上一页</Button><Button v-for="page in visiblePages" :key="page" size="sm" :variant="page === currentPage ? 'default' : 'outline'" :class="page === currentPage ? 'border-2 border-black bg-[#FACC15] text-black hover:bg-[#FACC15]' : ''" @click="changePage(page)">{{ page }}</Button><Button variant="outline" size="sm" :disabled="currentPage >= totalPages" @click="changePage(currentPage + 1)">下一页</Button></div></footer></section>
    </main>
    <ConfirmDialog
      v-model:open="cancelDialogOpen"
      title="取消 SOS 请求"
      :description="`确定取消“${cancelTarget?.catName || '未收录猫咪'}”的 SOS 请求吗？取消后无法恢复。`"
      confirm-text="确认取消"
      cancel-text="暂不取消"
      variant="danger"
      :loading="cancelling"
      @confirm="confirmCancel"
    />
  </div>
</template>
