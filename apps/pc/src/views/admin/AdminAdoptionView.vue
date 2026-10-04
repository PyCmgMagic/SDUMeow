<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, type Component } from 'vue'
import { adoptionApi } from '@/lib/api'
import {
  AdoptionExperienceMap,
  AdoptionHousingMap,
  AdminAdoptionStatusMap,
  isAdminAdoptionAuditableStatus,
  normalizeAdminAdoptionStatus,
  type AdoptionAuditStatus,
  type AdoptionItem,
  type AdminAdoptionStatus
} from '@/types'
import { toast } from '@/lib/toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
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
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import AdminPanel from '@/components/admin/AdminPanel.vue'
import AdminStatusTabs from '@/components/admin/AdminStatusTabs.vue'
import {
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Eye,
  HeartHandshake,
  Ban,
  XCircle
} from 'lucide-vue-next'

const pageSize = 10
const loading = ref(false)
const loadError = ref('')
const adoptionList = ref<AdoptionItem[]>([])
const currentPage = ref(1)
const total = ref(0)
const totalPages = ref(1)
const selectedStatus = ref<AdminAdoptionStatus | ''>('')
const detailDialogOpen = ref(false)
const auditDialogOpen = ref(false)
const selectedDetail = ref<AdoptionItem | null>(null)
const selectedAdoption = ref<AdoptionItem | null>(null)
const auditing = ref(false)
const auditForm = reactive<{ status: AdoptionAuditStatus; reason: string }>({
  status: 'INTERVIEW',
  reason: ''
})
let latestRequestId = 0

const statusTabs: Array<{ label: string; value: AdminAdoptionStatus | '' }> = [
  { label: '全部申请', value: '' },
  { label: '待审核', value: 0 },
  { label: '面试中', value: 1 },
  { label: '已通过', value: 2 },
  { label: '已拒绝', value: 3 },
  { label: '已完成', value: 4 },
  { label: '已取消', value: 5 }
]

const hasExistingSuccessfulAdoption = (adoption: AdoptionItem | null) => Boolean(
  adoption && adoptionList.value.some((item) => (
    item.id !== adoption.id &&
    item.catId === adoption.catId &&
    [2, 4].includes(normalizeAdminAdoptionStatus(item.status) ?? -1)
  ))
)

const auditStatusOptions = computed<Array<{ label: string; value: AdoptionAuditStatus }>>(() => {
  const currentStatus = normalizeAdminAdoptionStatus(selectedAdoption.value?.status)
  if (currentStatus === 0) {
    return [
      { label: '进入面试', value: 'INTERVIEW' },
      { label: '拒绝申请', value: 'REJECTED' }
    ]
  }
  if (currentStatus === 2) {
    return [{ label: '完成领养', value: 'COMPLETED' }]
  }
  if (hasExistingSuccessfulAdoption(selectedAdoption.value)) {
    return [{ label: '拒绝申请', value: 'REJECTED' }]
  }
  return [
    { label: '审核通过', value: 'APPROVED' },
    { label: '拒绝申请', value: 'REJECTED' }
  ]
})

const statusConfig: Record<AdminAdoptionStatus, { label: string; class: string; icon: Component }> = {
  0: {
    label: AdminAdoptionStatusMap[0],
    class: 'border-[#FACC15] bg-[#FFF8DE] text-[#8A5A00]',
    icon: Clock3
  },
  1: {
    label: AdminAdoptionStatusMap[1],
    class: 'border-blue-300 bg-blue-50 text-blue-700',
    icon: Clock3
  },
  2: {
    label: AdminAdoptionStatusMap[2],
    class: 'border-[#5CD6C2] bg-[#DDF8F2] text-[#116B5E]',
    icon: CheckCircle2
  },
  3: {
    label: AdminAdoptionStatusMap[3],
    class: 'border-red-300 bg-red-50 text-red-700',
    icon: XCircle
  },
  4: {
    label: AdminAdoptionStatusMap[4],
    class: 'border-gray-300 bg-gray-100 text-gray-700',
    icon: ClipboardCheck
  },
  5: {
    label: AdminAdoptionStatusMap[5],
    class: 'border-gray-300 bg-gray-100 text-gray-600',
    icon: Ban
  }
}

const statusInfo = (status: unknown) => {
  const key = normalizeAdminAdoptionStatus(status) ?? 0
  return statusConfig[key]
}

const adoptionActionLabel = (status: unknown) =>
  normalizeAdminAdoptionStatus(status) === 2 ? '完成领养' : '审核'

const paginationPages = computed<Array<number | '...'>>(() => {
  if (totalPages.value <= 5) {
    return Array.from({ length: totalPages.value }, (_, index) => index + 1)
  }
  if (currentPage.value <= 3) return [1, 2, 3, 4, '...', totalPages.value]
  if (currentPage.value >= totalPages.value - 2) {
    return [
      1,
      '...',
      totalPages.value - 3,
      totalPages.value - 2,
      totalPages.value - 1,
      totalPages.value
    ]
  }
  return [
    1,
    '...',
    currentPage.value - 1,
    currentPage.value,
    currentPage.value + 1,
    '...',
    totalPages.value
  ]
})

const failedApplicantAvatarIds = ref(new Set<string>())

const hasApplicantAvatar = (item: AdoptionItem): item is AdoptionItem & { avatar: string } => (
  Boolean(item.avatar && !failedApplicantAvatarIds.value.has(item.id))
)

const markApplicantAvatarFailed = (item: AdoptionItem) => {
  failedApplicantAvatarIds.value = new Set([...failedApplicantAvatarIds.value, item.id])
}

const formatTime = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const fetchList = async () => {
  const requestId = ++latestRequestId
  loading.value = true
  loadError.value = ''

  try {
    const response = await adoptionApi.getAdoptionList({
      page: currentPage.value,
      size: pageSize,
      ...(selectedStatus.value !== '' ? { status: selectedStatus.value } : {})
    })
    if (requestId !== latestRequestId) return

    adoptionList.value = response.items || []
    total.value = Number(response.total || 0)
    totalPages.value = Math.max(Number(response.pages || 1), 1)
  } catch (error) {
    if (requestId !== latestRequestId) return
    adoptionList.value = []
    total.value = 0
    totalPages.value = 1
    loadError.value = error instanceof Error ? error.message : '领养申请暂时无法加载'
  } finally {
    if (requestId === latestRequestId) loading.value = false
  }
}

const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value && page !== currentPage.value) {
    currentPage.value = page
  }
}

const openDetails = (item: AdoptionItem) => {
  selectedDetail.value = item
  detailDialogOpen.value = true
}

const closeDetails = () => {
  detailDialogOpen.value = false
  selectedDetail.value = null
}

const openAudit = (item: AdoptionItem) => {
  selectedAdoption.value = item
  const currentStatus = normalizeAdminAdoptionStatus(item.status)
  auditForm.status = currentStatus === 0
    ? 'INTERVIEW'
    : currentStatus === 2
      ? 'COMPLETED'
      : hasExistingSuccessfulAdoption(item)
        ? 'REJECTED'
        : 'APPROVED'
  auditForm.reason = ''
  auditDialogOpen.value = true
}

const closeAudit = () => {
  auditDialogOpen.value = false
  selectedAdoption.value = null
  auditForm.status = 'INTERVIEW'
  auditForm.reason = ''
}

const auditFromDetails = () => {
  if (!selectedDetail.value) return
  const item = selectedDetail.value
  closeDetails()
  openAudit(item)
}

const submitAudit = async () => {
  if (!selectedAdoption.value || !auditForm.reason.trim()) {
    toast.warning('请填写审核说明')
    return
  }

  if (
    auditForm.status === 'APPROVED' &&
    hasExistingSuccessfulAdoption(selectedAdoption.value)
  ) {
    toast.warning('该猫咪已有通过或完成的领养申请，不能再次通过')
    return
  }

  auditing.value = true
  try {
    await adoptionApi.auditAdoption(selectedAdoption.value.id, {
      status: auditForm.status,
      reason: auditForm.reason.trim()
    })
    toast.success('领养申请已更新')
    closeAudit()
    await fetchList()
  } finally {
    auditing.value = false
  }
}

watch(selectedStatus, () => {
  if (currentPage.value === 1) void fetchList()
  else currentPage.value = 1
})
watch(currentPage, () => void fetchList())
onMounted(() => void fetchList())
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader
      eyebrow="ADOPTION REVIEW"
      title="领养申请"
      description="集中查看申请条件、联系方式和喂养计划，维护每一步审核结论。"
      :icon="HeartHandshake"
      tone="mint"
    >
      <template #summary>
        <div class="admin-summary-card flex items-center gap-3 border-2 border-black bg-white px-4 py-3 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
          <ClipboardCheck class="size-5 text-[#116B5E]" />
          <div>
            <p class="text-xs font-bold text-gray-500">申请总数</p>
            <p class="text-lg font-black text-gray-950">{{ total }}</p>
          </div>
        </div>
      </template>
    </AdminPageHeader>

    <AdminPanel>
      <div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <AdminStatusTabs
          v-model="selectedStatus"
          ariaLabel="领养申请状态"
          :options="statusTabs"
          tone="mint"
        />
        <p class="text-sm text-gray-600">
          当前第 <strong class="text-black">{{ currentPage }}</strong> / {{ totalPages }} 页
        </p>
      </div>
    </AdminPanel>

    <AdminPanel title="申请队列" :meta="`每页 ${pageSize} 条`">
      <div
        v-if="loadError"
        class="flex flex-wrap items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800"
      >
        <span>{{ loadError }}</span>
        <Button
          variant="outline"
          size="sm"
          class="border-red-300 bg-white text-red-800 hover:bg-red-100"
          @click="fetchList"
        >
          重试
        </Button>
      </div>

      <div class="overflow-x-auto">
        <Table class="min-w-[1080px] text-left text-sm">
          <TableHeader class="admin-data-table-header bg-[#DDF8F2] [&_tr]:border-black">
            <TableRow class="hover:bg-transparent">
              <TableHead class="px-5 font-bold text-gray-700">申请人</TableHead>
              <TableHead class="px-5 font-bold text-gray-700">目标猫咪</TableHead>
              <TableHead class="px-5 font-bold text-gray-700">联系方式</TableHead>
              <TableHead class="px-5 font-bold text-gray-700">居住与经验</TableHead>
              <TableHead class="px-5 font-bold text-gray-700">提交时间</TableHead>
              <TableHead class="px-5 font-bold text-gray-700">状态</TableHead>
              <TableHead class="px-5 text-right font-bold text-gray-700">操作</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            <TableRow v-if="loading" class="hover:bg-transparent">
              <TableCell colspan="7" class="px-5 py-14 text-center text-gray-500">
                正在加载领养申请...
              </TableCell>
            </TableRow>
            <TableRow v-else-if="adoptionList.length === 0" class="hover:bg-transparent">
              <TableCell colspan="7" class="px-5 py-14 text-center text-gray-500">
                当前筛选下没有领养申请
              </TableCell>
            </TableRow>
            <TableRow
              v-for="item in adoptionList"
              v-else
              :key="item.id"
              class="admin-data-table-row border-gray-200 hover:bg-[#F6FFFC]"
            >
              <TableCell class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <Avatar class="admin-data-avatar size-9 rounded-none border-2 border-black">
                    <AvatarImage
                      v-if="hasApplicantAvatar(item)"
                      :src="item.avatar"
                      :alt="item.userName"
                      @error="markApplicantAvatarFailed(item)"
                    />
                    <AvatarFallback class="rounded-none bg-[#FACC15] font-black text-black">
                      {{ item.userName?.slice(0, 1) || '用' }}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p class="font-black text-gray-950">{{ item.userName || '-' }}</p>
                    <p class="mt-1 text-xs text-gray-500">ID {{ item.userId }}</p>
                  </div>
                </div>
              </TableCell>

              <TableCell class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <img
                    v-if="item.catAvatar"
                    :src="item.catAvatar"
                    :alt="item.catName"
                    class="size-9 rounded-none border-2 border-black object-cover"
                  >
                  <span v-else class="size-9 border-2 border-black bg-gray-100" />
                  <p class="font-black text-gray-950">{{ item.catName || '-' }}</p>
                </div>
              </TableCell>

              <TableCell class="px-5 py-4">
                <p class="font-bold text-gray-800">电话：{{ item.contact?.phone || '-' }}</p>
                <p class="mt-1 text-xs text-gray-500">微信：{{ item.contact?.wechat || '-' }}</p>
              </TableCell>

              <TableCell class="px-5 py-4">
                <p class="font-bold text-gray-800">
                  {{ AdoptionHousingMap[item.info?.housing] || item.info?.housing || '-' }}
                </p>
                <p class="mt-1 text-xs text-gray-500">
                  {{ AdoptionExperienceMap[item.info?.experience] || item.info?.experience || '-' }}
                </p>
              </TableCell>

              <TableCell class="px-5 py-4 text-gray-600">
                {{ formatTime(item.createTime) }}
              </TableCell>

              <TableCell class="px-5 py-4">
                <Badge
                  variant="outline"
                  class="gap-1 font-bold"
                  :class="statusInfo(item.status).class"
                >
                  <component :is="statusInfo(item.status).icon" class="size-3.5" />
                  {{ statusInfo(item.status).label }}
                </Badge>
              </TableCell>

              <TableCell class="px-5 py-4">
                <div class="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    class="admin-secondary-action border-2 border-black font-bold hover:bg-[#DDF8F2]"
                    @click="openDetails(item)"
                  >
                    <Eye class="size-4" />
                    详情
                  </Button>
                  <Button
                    v-if="isAdminAdoptionAuditableStatus(item.status)"
                    size="sm"
                    class="admin-primary-action border-2 border-black bg-[#5CD6C2] font-black text-black hover:bg-[#48C4B1]"
                    @click="openAudit(item)"
                  >
                    {{ adoptionActionLabel(item.status) }}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <template #footer>
        <div
          v-if="totalPages > 1"
          class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-sm text-gray-600">
            共 <strong class="text-black">{{ total }}</strong> 条领养申请
          </p>
          <div class="flex flex-wrap items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              :disabled="currentPage <= 1"
              @click="changePage(currentPage - 1)"
            >
              上一页
            </Button>
            <template v-for="(page, index) in paginationPages" :key="`${page}-${index}`">
              <span v-if="page === '...'" class="px-1 text-gray-500">...</span>
              <Button
                v-else
                size="sm"
                :variant="page === currentPage ? 'default' : 'outline'"
                :class="page === currentPage ? 'border-2 border-black bg-[#5CD6C2] text-black hover:bg-[#5CD6C2]' : ''"
                @click="changePage(page)"
              >
                {{ page }}
              </Button>
            </template>
            <Button
              variant="outline"
              size="sm"
              :disabled="currentPage >= totalPages"
              @click="changePage(currentPage + 1)"
            >
              下一页
            </Button>
          </div>
        </div>
      </template>
    </AdminPanel>

    <Dialog v-model:open="auditDialogOpen" @update:open="(open) => !open && closeAudit()">
      <DialogContent class="admin-dialog border-2 border-black p-0 sm:max-w-xl">
        <DialogHeader class="admin-dialog-header border-b-2 border-black bg-[#DDF8F2] px-6 py-5 pr-14">
          <DialogTitle class="text-xl font-black">处理领养申请</DialogTitle>
          <DialogDescription>选择下一步状态，并填写将向申请人展示的处理说明。</DialogDescription>
        </DialogHeader>

        <div v-if="selectedAdoption" class="grid gap-5 px-6 py-5">
          <div class="relative grid gap-3 border-2 border-black bg-gray-50 p-4 pl-16 sm:grid-cols-2">
            <Avatar class="absolute left-4 top-4 size-10 rounded-none border-2 border-black">
              <AvatarImage
                v-if="hasApplicantAvatar(selectedAdoption)"
                :src="selectedAdoption.avatar"
                :alt="selectedAdoption.userName"
                @error="markApplicantAvatarFailed(selectedAdoption)"
              />
              <AvatarFallback class="rounded-none bg-[#FACC15] font-black text-black">
                {{ selectedAdoption.userName?.slice(0, 1) || '用' }}
              </AvatarFallback>
            </Avatar>
            <div>
              <p class="text-xs font-bold text-gray-500">申请人</p>
              <p class="mt-1 font-black">{{ selectedAdoption.userName }}</p>
            </div>
            <div>
              <p class="text-xs font-bold text-gray-500">目标猫咪</p>
              <p class="mt-1 font-black">{{ selectedAdoption.catName }}</p>
            </div>
          </div>

          <label class="flex flex-col gap-2">
            <span class="text-sm font-black">处理结果</span>
            <Select v-model="auditForm.status">
              <SelectTrigger class="border-2 border-black">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in auditStatusOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </label>

          <label class="flex flex-col gap-2" for="audit-reason">
            <span class="text-sm font-black">审核说明</span>
            <Textarea
              id="audit-reason"
              v-model="auditForm.reason"
              rows="5"
              maxlength="500"
              placeholder="说明处理条件或拒绝原因"
              class="border-2 border-black focus-visible:ring-[#5CD6C2]"
            />
          </label>
        </div>

        <DialogFooter class="admin-dialog-footer border-t-2 border-black bg-gray-50 px-6 py-4">
          <Button
            variant="outline"
            class="border-2 border-black"
            :disabled="auditing"
            @click="closeAudit"
          >
            取消
          </Button>
          <Button
            class="admin-primary-action border-2 border-black bg-[#5CD6C2] font-black text-black hover:bg-[#48C4B1]"
            :disabled="auditing"
            @click="submitAudit"
          >
            {{ auditing ? '正在保存...' : '保存审核结果' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="detailDialogOpen" @update:open="(open) => !open && closeDetails()">
      <DialogContent class="admin-dialog max-h-[90vh] overflow-y-auto border-2 border-black p-0 sm:max-w-2xl">
        <DialogHeader class="admin-dialog-header border-b-2 border-black bg-[#F3F4F6] px-6 py-5 pr-14">
          <DialogTitle class="text-xl font-black">领养申请详情</DialogTitle>
          <DialogDescription>申请编号 {{ selectedDetail?.id }}</DialogDescription>
        </DialogHeader>

        <div v-if="selectedDetail" class="grid gap-6 px-6 py-5">
          <div class="flex flex-wrap items-center justify-between gap-3 border-2 border-black bg-[#F6FFFC] p-4">
            <Badge
              variant="outline"
              class="gap-1 font-bold"
              :class="statusInfo(selectedDetail.status).class"
            >
              <component :is="statusInfo(selectedDetail.status).icon" class="size-3.5" />
              {{ statusInfo(selectedDetail.status).label }}
            </Badge>
            <p class="text-sm text-gray-600">{{ formatTime(selectedDetail.createTime) }}</p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <section class="relative border-2 border-black p-4 pl-20">
              <Avatar class="absolute left-4 top-4 size-12 rounded-none border-2 border-black">
                <AvatarImage
                  v-if="hasApplicantAvatar(selectedDetail)"
                  :src="selectedDetail.avatar"
                  :alt="selectedDetail.userName"
                  @error="markApplicantAvatarFailed(selectedDetail)"
                />
                <AvatarFallback class="rounded-none bg-[#FACC15] font-black text-black">
                  {{ selectedDetail.userName?.slice(0, 1) || '用' }}
                </AvatarFallback>
              </Avatar>
              <h3 class="text-sm font-black">申请人与联系</h3>
              <p class="mt-3 font-bold">{{ selectedDetail.userName }}</p>
              <p class="mt-1 text-sm text-gray-600">电话：{{ selectedDetail.contact?.phone || '-' }}</p>
              <p class="mt-1 text-sm text-gray-600">微信：{{ selectedDetail.contact?.wechat || '-' }}</p>
            </section>

            <section class="border-2 border-black p-4">
              <h3 class="text-sm font-black">目标猫咪</h3>
              <p class="mt-3 font-bold">{{ selectedDetail.catName }}</p>
              <p class="mt-1 text-sm text-gray-600">
                居住：{{ AdoptionHousingMap[selectedDetail.info?.housing] || selectedDetail.info?.housing || '-' }}
              </p>
              <p class="mt-1 text-sm text-gray-600">
                经验：{{ AdoptionExperienceMap[selectedDetail.info?.experience] || selectedDetail.info?.experience || '-' }}
              </p>
            </section>
          </div>

          <section class="border-2 border-black p-4">
            <h3 class="text-sm font-black">喂养计划</h3>
            <p class="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
              {{ selectedDetail.info?.plan || '未填写' }}
            </p>
          </section>
        </div>

        <DialogFooter class="admin-dialog-footer border-t-2 border-black bg-gray-50 px-6 py-4">
          <Button variant="outline" class="admin-secondary-action border-2 border-black bg-white font-bold text-black hover:bg-[#FACC15]" @click="closeDetails">
            关闭
          </Button>
          <Button
            v-if="selectedDetail && isAdminAdoptionAuditableStatus(selectedDetail.status)"
            class="admin-primary-action border-2 border-black bg-[#5CD6C2] font-black text-black hover:bg-[#48C4B1]"
            @click="auditFromDetails"
          >
            {{ adoptionActionLabel(selectedDetail?.status) }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
