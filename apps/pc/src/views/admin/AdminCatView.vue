<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Cat, FileText, PenSquare, Plus, Trash2 } from 'lucide-vue-next'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import AdminPanel from '@/components/admin/AdminPanel.vue'
import AdminStatusTabs from '@/components/admin/AdminStatusTabs.vue'
import { catApi, typeApi } from '@/lib/api'
import EditCatDialog from '@/components/EditCatDialog.vue'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CatStatusMap, type AdminCatItem, type CatListItem, type Status, type TypeOption } from '@/types'
import { toast } from '@/lib/toast'

const router = useRouter()
const route = useRoute()

// 编辑对话框状态
const editDialogOpen = ref(false)
const selectedCatForEdit = ref<AdminCatItem | null>(null)

// 删除确认弹窗
const deleteDialogOpen = ref(false)
const deleteCatId = ref<string>('')
const deleteCatName = ref<string>('')

const statusOptions: Array<{ label: string; value: Status | null }> = [
  { label: '全部', value: null },
  { label: '在校', value: 0 },
  { label: '已领养', value: 1 },
  { label: '喵星', value: 2 },
  { label: '住院', value: 3 },
  { label: '领养处理中', value: 4 }
]

const loading = ref(false)
const loadError = ref('')
const cats = ref<CatListItem[]>([])
const colorOptions = ref<TypeOption[]>([])
const locationOptions = ref<TypeOption[]>([])
const pageSize = 10
const total = ref(0)
const totalPages = ref(1)
let latestRequestId = 0

const positiveInteger = (value: unknown, fallback = 1) => {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const enumFilter = <T extends number>(value: unknown, allowed: readonly T[]): T | null => {
  const numeric = Number(value)
  return allowed.includes(numeric as T) ? numeric as T : null
}

const currentPage = computed(() => positiveInteger(route.query.page))
const selectedStatus = computed(() => enumFilter<Status>(route.query.status, [0, 1, 2, 3, 4]))
const selectedColor = computed(() => {
  const value = Number(route.query.color)
  return Number.isInteger(value) && value > 0 ? value : null
})
const searchText = computed(() => String(route.query.search || '').trim())

const updateFilter = (key: 'status' | 'color', value: number | null) => {
  router.push({
    query: {
      ...route.query,
      [key]: value === null ? undefined : String(value),
      page: '1'
    }
  })
}

const updateStatusFilter = (value: string | number | null) => {
  updateFilter('status', typeof value === 'number' ? value : null)
}

const updateColorFilter = (value: string | number | null) => {
  updateFilter('color', typeof value === 'number' ? value : null)
}

const fetchCats = async () => {
  const requestId = ++latestRequestId
  loading.value = true
  loadError.value = ''
  try {
    const res = await catApi.getCatList({
      page: currentPage.value,
      pageSize,
      ...(selectedStatus.value !== null && { status: selectedStatus.value }),
      ...(selectedColor.value !== null && { color: selectedColor.value }),
      ...(searchText.value && { search: searchText.value })
    })
    if (requestId !== latestRequestId) return

    cats.value = res.items
    total.value = res.total
    totalPages.value = Math.max(res.totalPage, 1)

    if (res.total > 0 && currentPage.value > totalPages.value) {
      await router.replace({ query: { ...route.query, page: String(totalPages.value) } })
    }
  } catch (error) {
    if (requestId !== latestRequestId) return
    cats.value = []
    total.value = 0
    totalPages.value = 1
    loadError.value = error instanceof Error ? error.message : '猫咪列表加载失败'
  } finally {
    if (requestId === latestRequestId) loading.value = false
  }
}

const colorLabels = computed(() => new Map(colorOptions.value.map((item) => [item.id, item.label])))
const locationLabels = computed(() => new Map(locationOptions.value.map((item) => [item.id, item.label])))
const colorTabOptions = computed(() => [
  { label: '全部花色', value: null },
  ...colorOptions.value.map((item) => ({ label: item.label, value: item.id }))
])
const colorLabel = (id: number) => colorLabels.value.get(id) || `#${id}`
const locationLabel = (id: number | null) => id === null ? '-' : locationLabels.value.get(id) || `地点 #${id}`

// 事件处理
const handleAddCat = () => {
  selectedCatForEdit.value = null
  editDialogOpen.value = true
}

const handleEdit = async (cat: CatListItem) => {
  const baseCat: AdminCatItem = { ...cat, hauntLocation: cat.location }
  selectedCatForEdit.value = baseCat
  editDialogOpen.value = true

  try {
    const fullCatData = await catApi.getCatDetail(cat.id)
    if (selectedCatForEdit.value?.id === cat.id) {
      const info = fullCatData.basicInfo
      selectedCatForEdit.value = {
        ...baseCat,
        color: info.color,
        campus: info.campus,
        location: info.hauntLocation ?? cat.location,
        status: info.status,
        role: info.role,
        isNeutered: info.neutered.isNeutered,
        gender: info.gender,
        healthStatus: info.healthStatus,
        hauntLocation: info.hauntLocation,
        birthYear: info.birthYear,
        admissionDate: info.admissionDate,
        description: fullCatData.description || '',
        attributes: fullCatData.attributes,
        aliases: fullCatData.aliases,
        avatar: fullCatData.avatar,
        images: fullCatData.images,
        neuteredDate: fullCatData.basicInfo.neutered.date,
        neuteredType: fullCatData.basicInfo.neutered.type,
        tags: fullCatData.tags,
      }
    }
  } catch (error) {
    console.warn('获取猫咪详情失败，使用列表数据', error)
  }
}

const handleEditSuccess = async () => {
  // 编辑成功后，关闭对话框并刷新列表
  editDialogOpen.value = false
  selectedCatForEdit.value = null
  await fetchCats()
}

const handleDelete = (id: string, name: string) => {
  deleteCatId.value = id
  deleteCatName.value = name
  deleteDialogOpen.value = true
}

const confirmDelete = async () => {
  deleteDialogOpen.value = false
  try {
    await catApi.deleteCat(deleteCatId.value)
    toast.success('删除成功')
    await fetchCats()
  } catch (error) {
    toast.error('删除失败')
  } finally {
    deleteCatId.value = ''
    deleteCatName.value = ''
  }
}

const handlePageChange = (page: number) => {
  router.push({
    query: { ...route.query, page: String(page) }
  })
}

const loadTypeOptions = async () => {
  try {
    const [colors, locations] = await Promise.all([typeApi.getColors(), typeApi.getLocations()])
    colorOptions.value = colors
    locationOptions.value = locations
  } catch (error) {
    console.warn('猫咪类型选项加载失败', error)
  }
}

watch(
  () => [route.query.page, route.query.status, route.query.color, route.query.search],
  () => void fetchCats(),
  { immediate: true }
)

onMounted(() => {
  void loadTypeOptions()
})

onBeforeUnmount(() => {
  latestRequestId += 1
})

// 辅助函数：状态颜色映射
const getStatusColorClass = (status: Status) => {
  if (status === 0) return 'border-[#5CD6C2] bg-[#DDF8F2] text-[#116B5E]'
  if (status === 1) return 'border-[#FACC15] bg-[#FFF8DE] text-[#8A5A00]'
  if (status === 2) return 'border-gray-300 bg-gray-100 text-gray-700'
  if (status === 3) return 'border-red-300 bg-red-50 text-red-700'
  return 'border-amber-300 bg-amber-50 text-amber-800'
}

const getNeuteredColorClass = (isNeutered: boolean) => {
  return isNeutered
    ? 'border-[#5CD6C2] bg-[#DDF8F2] text-[#116B5E]'
    : 'border-[#FACC15] bg-[#FFF8DE] text-[#8A5A00]'
}



</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader eyebrow="CAT DIRECTORY" title="猫咪档案" description="维护校园猫咪档案、状态与常驻地信息。" :icon="Cat">
      <template #summary>
        <div class="admin-summary-card flex items-center gap-3 border-2 border-black bg-white px-4 py-3 shadow-[3px_3px_0px_rgba(0,0,0,1)]">
          <Cat class="size-5 text-[#116B5E]" aria-hidden="true" />
          <div><p class="text-xs font-bold text-gray-500">档案总数</p><p class="text-lg font-black text-gray-950">{{ total }}</p></div>
        </div>
      </template>
      <template #action>
        <Button class="admin-primary-action border-2 border-black bg-[#5CD6C2] font-black text-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-[#48C4B1]" @click="handleAddCat">
          <Plus class="size-4" aria-hidden="true" />
          新建档案
        </Button>
      </template>
    </AdminPageHeader>

    <section class="admin-filter-panel flex flex-col gap-4 border-2 border-black bg-white p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <p class="shrink-0 text-sm font-black text-gray-900">状态</p>
        <AdminStatusTabs ariaLabel="猫咪状态筛选" :model-value="selectedStatus" :options="statusOptions" @update:model-value="updateStatusFilter" />
      </div>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <p class="shrink-0 text-sm font-black text-gray-900">花色</p>
        <AdminStatusTabs ariaLabel="猫咪花色筛选" :model-value="selectedColor" :options="colorTabOptions" @update:model-value="updateColorFilter" />
      </div>
    </section>

    <!-- 表格区域 -->
    <AdminPanel title="猫咪档案" :meta="`共 ${total} 条`">
      <div class="overflow-x-auto">
      <Table class="admin-data-table min-w-[860px] text-left text-sm">
        <TableHeader class="admin-data-table-header bg-[#FFF8DE] [&_tr]:border-black">
          <TableRow>
            <TableHead class="w-[80px] font-bold">头像</TableHead>
            <TableHead class="font-bold">姓名</TableHead>
            <TableHead class="font-bold">花色</TableHead>
            <TableHead class="font-bold">状态</TableHead>
            <TableHead class="font-bold">常驻地</TableHead>
            <TableHead class="font-bold">绝育</TableHead>
            <TableHead class="text-right font-bold">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="loading">
            <TableRow>
              <TableCell colspan="8" class="h-24 text-center">
                加载中...
              </TableCell>
            </TableRow>
          </template>
          <template v-else-if="loadError">
            <TableRow>
              <TableCell colspan="8" class="h-28 text-center text-red-600">
                <div class="flex flex-col items-center gap-3">
                  <span>{{ loadError }}</span>
                  <Button variant="outline" size="sm" @click="fetchCats">重新加载</Button>
                </div>
              </TableCell>
            </TableRow>
          </template>
          <template v-else-if="cats.length === 0">
            <TableRow>
              <TableCell colspan="8" class="h-24 text-center text-muted-foreground">
                暂无数据
              </TableCell>
            </TableRow>
          </template>
          <TableRow v-for="cat in cats" :key="cat.id" class="admin-data-table-row border-gray-200 hover:bg-[#FFFDF5]">
            <TableCell>
              <Avatar class="admin-data-avatar size-10 border-2 border-black">
                <AvatarImage :src="cat.avatar" :alt="cat.name" class="object-cover" />
                <AvatarFallback class="font-bold">{{ cat.name.charAt(0) }}</AvatarFallback>
              </Avatar>
            </TableCell>
            <TableCell class="font-bold">{{ cat.name }}</TableCell>
            <TableCell class="font-bold">{{ colorLabel(cat.color) }}</TableCell>
            <TableCell>
              <Badge variant="outline" class="border px-2 py-0.5 font-bold"
                :class="getStatusColorClass(cat.status)">
                {{ CatStatusMap[cat.status] }}
              </Badge>
            </TableCell>
            <TableCell class="font-bold">{{ locationLabel(cat.location) }}</TableCell>
            <TableCell>
              <Badge variant="outline" class="border px-2 py-0.5 font-bold"
                :class="getNeuteredColorClass(cat.isNeutered)">
                {{ cat.isNeutered ? '已绝育' : '未绝育' }}
              </Badge>
            </TableCell>

            <TableCell class="text-right">
              <div class="flex justify-end gap-2">
                <Button variant="outline" size="icon" class="admin-icon-action size-8 border-2 border-black hover:bg-[#FACC15]" @click="handleEdit(cat)" title="编辑">
                  <PenSquare class="size-4" />
                </Button>
                <Button variant="outline" size="icon" class="admin-icon-action size-8 border-2 border-black hover:bg-[#FACC15]" @click="router.push(`/admin/cats/${cat.id}`)"
                  title="查看详情">
                  <FileText class="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon"
                  class="size-8 border-2 border-black hover:border-red-300 hover:bg-red-50 hover:text-red-700" @click="handleDelete(cat.id, cat.name)"
                  title="删除">
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      </div>
    </AdminPanel>

    <!-- 分页 -->
    <div class="admin-pagination flex flex-col gap-3 border-2 border-black bg-white px-5 py-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] sm:flex-row sm:items-center sm:justify-between">
      <div v-if="!loadError && total > 0" class="flex items-center gap-4">
        <Button variant="outline" size="sm" :disabled="loading || currentPage <= 1"
          @click="handlePageChange(currentPage - 1)"
          class="border-2 border-black bg-white font-bold hover:bg-[#FACC15]">
            上一页
          </Button>

        <div class="text-sm text-gray-600">
          第 {{ currentPage }} 页 / 共 {{ totalPages }} 页 (共 {{ total }} 条)
        </div>

        <Button variant="outline" size="sm" :disabled="loading || currentPage >= totalPages"
          @click="handlePageChange(currentPage + 1)"
          class="border-2 border-black bg-white font-bold hover:bg-[#FACC15]">
            下一页
          </Button>
      </div>

      <div v-else class="text-xs text-gray-400">
        暂无数据
      </div>
    </div>
  </div>

  <!-- 编辑猫咪对话框 -->
  <EditCatDialog
    :open="editDialogOpen"
    :cat-data="selectedCatForEdit"
    @update:open="editDialogOpen = $event"
    @success="handleEditSuccess"
  />

  <!-- 删除确认弹窗 -->
  <ConfirmDialog
    v-model:open="deleteDialogOpen"
    title="删除猫咪"
    :description="`确定要删除猫咪「${deleteCatName}」吗？此操作不可恢复。`"
    confirm-text="删除"
    variant="danger"
    @confirm="confirmDelete"
  />
</template>
