<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button';
import { catApi, typeApi, userApi } from '@/lib/api';
import { useUserStore } from '@/stores/user';
import type { CatListItem, CheckinResult, TypeOption } from '@/types';
import { toast } from '@/lib/toast'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import { ChevronLeft, ChevronRight, Gift, Calendar, Zap } from 'lucide-vue-next';

import StatsBanner from '@/components/StatsBanner.vue';
import ShortcutGrid from '@/components/ShortcutGrid.vue';
import CatCard from '@/components/CatCard.vue';


const catList = ref<CatListItem[]>([]);
const colorOptions = ref<TypeOption[]>([])
const pageSize = 20
const total = ref(0)
const totalPages = ref(1)
const loading = ref(false)
const loadError = ref('')
let latestRequestId = 0

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 签到相关
const checkinLoading = ref(false)
const checkinResult = ref<CheckinResult | null>(null)

// 执行签到
const handleCheckin = async () => {
  if (!userStore.token) {
    toast.warning('请先登录后再签到')
    router.push('/login')
    return
  }
  checkinLoading.value = true
  try {
    const res = await userApi.checkin()
    checkinResult.value = res
    if (res?.todayChecked) {
      toast.info('今天已经签过到啦~')
    } else {
      toast.success(`签到成功！获得 ${res?.rewards?.currency || 0} 小鱼干，${res?.rewards?.experience || 0} 经验值`)
      // 刷新用户信息以更新小鱼干余额
      userStore.fetchUserInfo()
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '签到失败，请稍后重试')
  } finally {
    checkinLoading.value = false
  }
}

const positiveInteger = (value: unknown, fallback = 1) => {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const currentPage = computed({
  get: () => positiveInteger(route.query.page),
  set: (val) => {
    router.push({
      query: { ...route.query, page: String(val) }
    })
  }
})

const selectedColor = computed(() => {
  const value = Number(route.query.color)
  return Number.isInteger(value) && value > 0 ? value : null
})

const colorLabels = computed(() => new Map(colorOptions.value.map((item) => [item.id, item.label])))
const colorLabel = (colorId: number) => colorLabels.value.get(colorId) || `花色 #${colorId}`

const selectColor = (color: number | null) => {
  router.push({
    query: {
      ...route.query,
      color: color === null ? undefined : String(color),
      page: '1'
    }
  })
}

// 分页页码列表
const paginationPages = computed(() => {
  const pages: (number | string)[] = []
  const totalPageCount = totalPages.value
  const current = currentPage.value
  const maxPagesToShow = 5

  if (totalPageCount <= maxPagesToShow + 2) {
    for (let i = 1; i <= totalPageCount; i++) pages.push(i)
  } else {
    if (current <= 3) {
      for (let i = 1; i <= Math.min(maxPagesToShow, totalPageCount); i++) pages.push(i)
      if (totalPageCount > maxPagesToShow) pages.push('...', totalPageCount)
    } else if (current >= totalPageCount - 2) {
      pages.push(1, '...')
      for (let i = totalPageCount - maxPagesToShow + 1; i <= totalPageCount; i++) pages.push(i)
    } else {
      pages.push(1, '...')
      for (let i = current - 1; i <= current + 1; i++) pages.push(i)
      pages.push('...', totalPageCount)
    }
  }
  return pages
})

const fetchCats = async () => {
  const requestId = ++latestRequestId
  loading.value = true
  loadError.value = ''
  try {
    const search = String(route.query.search || '').trim()
    const data = await catApi.getCatList({
      page: currentPage.value,
      pageSize,
      ...(selectedColor.value !== null && { color: selectedColor.value }),
      ...(search && { search })
    })
    if (requestId !== latestRequestId) return

    catList.value = data.items
    total.value = data.total
    totalPages.value = Math.max(data.totalPage, 1)

    if (data.total > 0 && currentPage.value > totalPages.value) {
      await router.replace({ query: { ...route.query, page: String(totalPages.value) } })
    }
  } catch (error) {
    if (requestId !== latestRequestId) return
    catList.value = []
    total.value = 0
    totalPages.value = 1
    loadError.value = error instanceof Error ? error.message : '猫咪列表加载失败'
  } finally {
    if (requestId === latestRequestId) loading.value = false
  }
}

const loadColorOptions = async () => {
  try {
    colorOptions.value = await typeApi.getColors()
  } catch (error) {
    console.warn('猫咪花色选项加载失败', error)
  }
}

watch(
  () => [route.query.page, route.query.search, route.query.color],
  () => void fetchCats(),
  { immediate: true }
)

onMounted(() => {
  void loadColorOptions()
})

onBeforeUnmount(() => {
  latestRequestId += 1
})

</script>



<template>
  <div class="public-page flex min-h-full w-full flex-col gap-6">
    <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-[3.7fr_1fr]">
      <section class="flex min-w-0 flex-col gap-6 rounded-xl">
        <StatsBanner />
        <ShortcutGrid />
      </section>
    
      <aside class="flex flex-col gap-6">
        <!-- 每日签到卡片 -->
        <div class="w-full rounded-2xl bg-gradient-to-br from-[#FFB347] to-[#FFCC33] p-5 shadow-lg">
          <h3 class="text-white text-lg font-bold mb-2 flex items-center gap-2">
            <Calendar class="w-5 h-5" />
            每日签到
          </h3>
          <p class="text-white/80 text-sm mb-4">签到可获得小鱼干和经验值~</p>
          
          <!-- 签到结果展示 -->
          <div v-if="checkinResult" class="bg-white/20 rounded-xl p-3 mb-4 backdrop-blur-sm">
            <div class="grid grid-cols-2 gap-3 text-white text-sm">
              <div class="flex items-center gap-2">
                <Calendar class="w-4 h-4" />
                <span>累计签到 <strong>{{ checkinResult.totalDays }}</strong> 天</span>
              </div>
              <div class="flex items-center gap-2">
                <Zap class="w-4 h-4" />
                <span>连续签到 <strong>{{ checkinResult.continuousDays }}</strong> 天</span>
              </div>
            </div>
            <div v-if="!checkinResult.todayChecked" class="mt-2 pt-2 border-t border-white/20 text-white/90 text-xs">
              本次获得: 🐟 {{ checkinResult.rewards?.currency }} 小鱼干 | ⚡ {{ checkinResult.rewards?.experience }} 经验
            </div>
          </div>

          <!-- 签到按钮 -->
          <Button 
            @click="handleCheckin"
            :disabled="checkinLoading || checkinResult?.todayChecked"
            class="w-full bg-white text-[#FF9F1C] hover:bg-white/90 font-bold rounded-xl py-3 shadow-sm flex items-center justify-center gap-2"
          >
            <Gift class="w-5 h-5" />
            {{ checkinLoading ? '签到中...' : (checkinResult?.todayChecked ? '今日已签到' : '立即签到') }}
          </Button>

          <!-- 查看签到记录按钮 -->
          <router-link to="/checkin-history" class="block mt-3">
            <Button 
              variant="outline"
              class="w-full bg-white text-[#FF9F1C]  hover:bg-white/90 hover:text-[#FF9F1C] font-bold rounded-xl py-2 text-sm flex items-center justify-center gap-2"
            >
              <Calendar class="w-4 h-4" />
              查看签到记录
            </Button>
          </router-link>
        </div>
      </aside>
    </div>

    <section class="flex min-w-0 flex-col gap-6">
      <div class="flex flex-wrap gap-3">
        <Button @click="selectColor(null)"
          :class="['px-3 py-1 border-2 rounded-full text-sm', selectedColor === null ? 'bg-primary text-black border-primary' : 'bg-white text-black border-gray-200 hover:bg-primary']">
          全部
        </Button>
        <Button v-for="color in colorOptions" :key="color.id" @click="selectColor(color.id)"
          :class="['px-3 py-1 border-2 rounded-full text-sm', selectedColor === color.id ? 'bg-primary text-black border-primary' : 'bg-white text-black border-gray-200 hover:bg-primary']">
          {{ color.label }}
        </Button>
      </div>

      <div v-if="loading" class="py-10 text-center text-gray-500">正在加载猫咪...</div>
      <div v-else-if="loadError" class="flex flex-col items-center gap-3 py-10 text-center text-red-600">
        <span>{{ loadError }}</span>
        <Button variant="outline" size="sm" @click="fetchCats">重新加载</Button>
      </div>
      <div v-else-if="catList.length === 0" class="py-10 text-center text-gray-500">暂无符合条件的猫咪</div>
      <div v-else class="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        <CatCard v-for="cat in catList" :key="cat.id" :cat="cat" :color-label="colorLabel(cat.color)" />
      </div>

      <div v-if="!loading && !loadError && totalPages > 1" class="mt-6 flex justify-center">
        <Pagination :total="total" :items-per-page="pageSize" :sibling-count="1" show-edges :page="currentPage">
          <PaginationContent class="flex items-center gap-1">
            <PaginationPrevious
              :disabled="currentPage <= 1"
              @click="currentPage > 1 && (currentPage = currentPage - 1)"
              class="flex h-9 items-center gap-1 rounded-md border border-gray-200 px-3 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft class="h-4 w-4" />
              <span class="hidden sm:inline">上一页</span>
            </PaginationPrevious>

            <template v-for="(page, index) in paginationPages" :key="index">
              <PaginationEllipsis v-if="page === '...'" class="px-3 text-gray-400" />
              <PaginationItem v-else :value="page as number">
                <Button
                  variant="outline"
                  size="sm"
                  :class="[
                    'h-9 w-9 rounded-md',
                    currentPage === page ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-gray-50'
                  ]"
                  @click="currentPage = page as number"
                >
                  {{ page }}
                </Button>
              </PaginationItem>
            </template>

            <PaginationNext
              :disabled="currentPage >= totalPages"
              @click="currentPage < totalPages && (currentPage = currentPage + 1)"
              class="flex h-9 items-center gap-1 rounded-md border border-gray-200 px-3 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span class="hidden sm:inline">下一页</span>
              <ChevronRight class="h-4 w-4" />
            </PaginationNext>
          </PaginationContent>
        </Pagination>
      </div>

      <div v-if="!loading && !loadError && total > 0" class="mt-2 text-center text-sm text-gray-500">
        共 {{ total }} 只猫咪，当前第 {{ currentPage }}/{{ totalPages }} 页
      </div>
    </section>
  </div>
</template>
