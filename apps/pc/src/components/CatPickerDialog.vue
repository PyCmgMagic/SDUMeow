<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Search, MapPin } from 'lucide-vue-next'
import { catApi, typeApi } from '@/lib/api'
import { CampusMap, type CatListItem, type TypeOption } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'

const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  allowUnknown?: boolean
  isSelectable?: (cat: CatListItem) => boolean
  getDisabledReason?: (cat: CatListItem) => string
}>(), {
  title: '选择猫咪',
  allowUnknown: false
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [cat: CatListItem]
  unknown: []
}>()

const pageSize = 9
const cats = ref<CatListItem[]>([])
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)
const searchQuery = ref('')
const loading = ref(false)
const loadError = ref('')
const colorOptions = ref<TypeOption[]>([])
const locationOptions = ref<TypeOption[]>([])
let debounceTimer: number | null = null
let latestRequestId = 0

const colorLabels = computed(() => new Map(colorOptions.value.map((item) => [item.id, item.label])))
const locationLabels = computed(() => new Map(locationOptions.value.map((item) => [item.id, item.label])))
const colorLabel = (id: number) => colorLabels.value.get(id) || `花色 #${id}`
const placeLabel = (cat: CatListItem) => {
  if (cat.location !== null) return locationLabels.value.get(cat.location) || `地点 #${cat.location}`
  return CampusMap[cat.campus] || `校区 #${cat.campus}`
}
const isCatSelectable = (cat: CatListItem) => props.isSelectable?.(cat) ?? true
const disabledReason = (cat: CatListItem) => props.getDisabledReason?.(cat) || '当前不可选择'

const fetchCats = async () => {
  const requestId = ++latestRequestId
  loading.value = true
  loadError.value = ''
  try {
    const search = searchQuery.value.trim()
    const result = await catApi.getCatList({
      page: page.value,
      pageSize,
      ...(search && { search })
    })
    if (requestId !== latestRequestId) return
    cats.value = result.items
    total.value = result.total
    totalPages.value = Math.max(result.totalPage, 1)
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

const loadTypeOptions = async () => {
  if (colorOptions.value.length && locationOptions.value.length) return
  const results = await Promise.allSettled([typeApi.getColors(), typeApi.getLocations()])
  if (results[0].status === 'fulfilled') colorOptions.value = results[0].value
  if (results[1].status === 'fulfilled') locationOptions.value = results[1].value
}

const selectCat = (cat: CatListItem) => {
  if (!isCatSelectable(cat)) return
  emit('select', cat)
  emit('update:open', false)
}

const selectUnknown = () => {
  emit('unknown')
  emit('update:open', false)
}

watch(() => props.open, (open) => {
  if (!open) {
    latestRequestId += 1
    return
  }
  page.value = 1
  searchQuery.value = ''
  void loadTypeOptions()
  void fetchCats()
})

watch(page, () => {
  if (props.open) void fetchCats()
})

watch(searchQuery, () => {
  if (debounceTimer) window.clearTimeout(debounceTimer)
  page.value = 1
  debounceTimer = window.setTimeout(() => {
    if (props.open) void fetchCats()
  }, 300)
})

onBeforeUnmount(() => {
  if (debounceTimer) window.clearTimeout(debounceTimer)
  latestRequestId += 1
})
</script>

<template>
  <Dialog :open="open" @update:open="(value) => emit('update:open', value)">
    <DialogTrigger as-child>
      <slot name="trigger" />
    </DialogTrigger>
    <DialogContent class="flex max-h-[82vh] flex-col sm:max-w-[680px]">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>搜索并选择本次操作关联的校园猫咪。</DialogDescription>
      </DialogHeader>

      <div class="relative mt-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input v-model="searchQuery" class="pl-10" placeholder="搜索猫咪名称..." />
      </div>

      <button
        v-if="allowUnknown"
        type="button"
        class="rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-primary hover:bg-primary/10"
        @click="selectUnknown"
      >
        不认识这只猫 / 未收录猫咪
      </button>

      <div v-if="loading" class="py-12 text-center text-sm text-gray-500">正在加载猫咪...</div>
      <div v-else-if="loadError" class="flex flex-col items-center gap-3 py-10 text-center text-sm text-red-600">
        <span>{{ loadError }}</span>
        <Button variant="outline" size="sm" @click="fetchCats">重新加载</Button>
      </div>
      <div v-else-if="cats.length === 0" class="py-12 text-center text-sm text-gray-500">未找到匹配的猫咪</div>
      <div v-else class="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3">
        <button
          v-for="cat in cats"
          :key="cat.id"
          type="button"
          :disabled="!isCatSelectable(cat)"
          class="overflow-hidden rounded-lg border border-gray-200 bg-white text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary enabled:hover:border-primary enabled:hover:shadow-sm disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100"
          @click="selectCat(cat)"
        >
          <div class="aspect-[4/3] bg-gray-100">
            <img :src="cat.avatar" :alt="cat.name" class="h-full w-full object-cover" :class="!isCatSelectable(cat) && 'grayscale opacity-60'" />
          </div>
          <div class="space-y-1 p-3">
            <div class="truncate text-sm font-bold" :class="isCatSelectable(cat) ? 'text-gray-900' : 'text-gray-500'">{{ cat.name }}</div>
            <div class="truncate text-xs text-gray-500">{{ colorLabel(cat.color) }}</div>
            <div class="flex items-center gap-1 truncate text-xs text-gray-500">
              <MapPin class="h-3 w-3 shrink-0" />
              <span class="truncate">{{ placeLabel(cat) }}</span>
            </div>
            <div v-if="!isCatSelectable(cat)" class="line-clamp-2 min-h-8 text-xs font-bold leading-4 text-gray-600">{{ disabledReason(cat) }}</div>
          </div>
        </button>
      </div>

      <div v-if="!loading && !loadError && total > 0" class="flex items-center justify-between border-t pt-3 text-sm text-gray-500">
        <span>共 {{ total }} 只</span>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" :disabled="page <= 1" @click="page -= 1">上一页</Button>
          <span>第 {{ page }} / {{ totalPages }} 页</span>
          <Button variant="outline" size="sm" :disabled="page >= totalPages" @click="page += 1">下一页</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
