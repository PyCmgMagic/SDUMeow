<script setup lang="ts">
import { computed, ref } from 'vue'
import { Award, ChevronDown, ChevronUp, LockKeyhole, Medal } from 'lucide-vue-next'
import type { BadgeDisplayItem } from '@/types'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  items: BadgeDisplayItem[]
  loading: boolean
  error?: string
}>()

const emit = defineEmits<{ retry: [] }>()
const expanded = ref(false)
const earnedCount = computed(() => props.items.filter((item) => item.earned).length)
const visibleItems = computed(() => expanded.value ? props.items : props.items.slice(0, 8))
const progressWidth = (item: BadgeDisplayItem) => {
  if (item.progressPercentage !== undefined) return Math.min(Math.max(item.progressPercentage, 0), 100)
  if (item.earned) return 100
  if (item.progress === undefined || !item.target) return 0
  return Math.min(Math.max((item.progress / item.target) * 100, 0), 100)
}

const progressLabel = (item: BadgeDisplayItem) => {
  if (item.earned) return '已获得'
  if (item.progress !== undefined && item.target !== undefined) return `${item.progress} / ${item.target}`
  return '未完成'
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-black bg-[#FACC15] shadow-[2px_2px_0px_rgba(0,0,0,1)]">
          <Award class="h-6 w-6 text-black" />
        </div>
        <div>
          <h2 class="text-xl font-bold text-gray-900">荣誉勋章</h2>
        <p class="text-sm text-gray-500">我的徽章 {{ earnedCount }} / {{ items.length }}</p>
        </div>
      </div>
      <Button v-if="items.length > 8" variant="ghost" size="sm" class="gap-1" @click="expanded = !expanded">
        {{ expanded ? '收起' : '查看全部' }}
        <ChevronUp v-if="expanded" class="h-4 w-4" />
        <ChevronDown v-else class="h-4 w-4" />
      </Button>
    </div>

    <div v-if="loading" class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div v-for="index in 4" :key="index" class="h-40 animate-pulse rounded-lg border border-gray-200 bg-gray-100" />
    </div>
    <div v-else-if="error" class="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
      <span>{{ error }}</span>
      <Button variant="outline" size="sm" @click="emit('retry')">重新加载</Button>
    </div>
    <div v-else-if="items.length === 0" class="rounded-lg border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">
      暂无徽章数据
    </div>
    <div v-else class="grid grid-cols-2 gap-3 md:grid-cols-4">
      <article
        v-for="item in visibleItems"
        :key="item.id"
        class="relative min-h-40 overflow-hidden rounded-lg border p-4 transition-shadow"
        :class="item.earned ? 'border-yellow-300 bg-white shadow-sm hover:shadow-md' : 'border-gray-200 bg-gray-100 text-gray-400'"
      >
        <div class="mb-3 flex items-start justify-between gap-2">
          <div
            class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border"
            :class="item.earned ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300 bg-gray-200 grayscale'"
          >
            <img v-if="item.iconUrl" :src="item.iconUrl" :alt="item.name" class="h-full w-full object-cover" :class="!item.earned && 'grayscale opacity-60'" />
            <Medal v-else class="h-7 w-7" :class="item.earned ? 'text-yellow-600' : 'text-gray-400'" />
          </div>
          <LockKeyhole v-if="!item.earned" class="h-4 w-4 text-gray-400" />
        </div>
        <h3 class="truncate text-sm font-bold" :class="item.earned ? 'text-gray-900' : 'text-gray-500'">{{ item.name }}</h3>
        <p class="mt-1 line-clamp-2 text-xs leading-5" :class="item.earned ? 'text-gray-500' : 'text-gray-400'">
          {{ item.description || (item.earned ? '已获得' : '尚未解锁') }}
        </p>
        <div class="mt-3">
          <div class="mb-1 flex justify-between text-[11px] text-gray-500">
            <span>解锁进度</span>
            <span>{{ progressLabel(item) }}</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div class="h-full transition-[width]" :class="item.earned ? 'bg-[#FACC15]' : 'bg-[#5CD6C2]'" :style="{ width: `${progressWidth(item)}%` }" />
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
