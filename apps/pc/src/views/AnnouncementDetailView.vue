<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { announcementApi } from '@/lib/api'
import { AnnouncementTypeMap, type Announcement } from '@/types'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  CalendarDays,
  Eye,
  ImageOff,
  LoaderCircle,
  Megaphone,
  RefreshCw,
  UserRound,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const announcement = ref<Announcement | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const imageFailed = ref(false)

const typeLabel = (type: Announcement['type']) => {
  return AnnouncementTypeMap[String(type)] || '系统公告'
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long', timeStyle: 'short' }).format(date)
}

const loadAnnouncement = async () => {
  loading.value = true
  errorMessage.value = ''
  imageFailed.value = false
  announcement.value = null
  try {
    announcement.value = await announcementApi.getAnnouncement(String(route.params.id))
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '公告加载失败'
  } finally {
    loading.value = false
  }
}

const goBack = async () => {
  if (window.history.state?.back) {
    router.back()
    return
  }
  await router.push('/')
}

watch(() => route.params.id, () => void loadAnnouncement(), { immediate: true })
</script>

<template>
  <div class="min-h-full rounded-xl bg-gray-50 p-4 shadow-sm md:p-6">
    <div class="mx-auto w-full max-w-4xl">
      <Button
        variant="outline"
        size="sm"
        class="group mb-5 h-10 border-gray-200 bg-white px-3 text-gray-700 shadow-sm hover:border-primary hover:bg-primary/15 hover:text-gray-900"
        aria-label="返回上一页"
        @click="goBack"
      >
        <ArrowLeft class="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        返回上一页
      </Button>

      <div v-if="loading" class="rounded-xl bg-white px-6 py-20 text-center shadow-sm">
        <LoaderCircle class="mx-auto h-7 w-7 animate-spin text-amber-500" />
        <p class="mt-3 text-sm text-gray-500">正在加载公告...</p>
      </div>

      <div v-else-if="errorMessage" class="rounded-xl bg-white px-6 py-20 text-center shadow-sm">
        <Megaphone class="mx-auto h-10 w-10 text-gray-300" />
        <p class="mt-4 font-medium text-gray-700">公告加载失败</p>
        <p class="mt-1 text-sm text-gray-500">{{ errorMessage }}</p>
        <Button variant="outline" class="mt-5" @click="loadAnnouncement">
          <RefreshCw class="h-4 w-4" />
          重新加载
        </Button>
      </div>

      <article v-else-if="announcement" class="overflow-hidden rounded-xl bg-white shadow-sm">
        <div v-if="announcement.coverImage" class="h-48 bg-primary/10 sm:h-64">
          <img
            v-if="!imageFailed"
            :src="announcement.coverImage"
            :alt="announcement.title"
            class="h-full w-full object-cover"
            @error="imageFailed = true"
          />
          <div v-else class="flex h-full flex-col items-center justify-center text-amber-700">
            <div class="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/40">
              <ImageOff class="h-6 w-6" />
            </div>
            <span class="mt-3 text-sm font-medium">封面暂不可用</span>
          </div>
        </div>

        <div class="px-5 py-6 sm:px-8 sm:py-8">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
              {{ typeLabel(announcement.type) }}
            </span>
            <span class="flex items-center gap-1 text-xs text-gray-400">
              <Megaphone class="h-3.5 w-3.5" />
              校园公告
            </span>
          </div>

          <h1 class="mt-4 break-words text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
            {{ announcement.title }}
          </h1>

          <p
            v-if="announcement.summary"
            class="mt-5 border-l-4 border-primary bg-amber-50/70 px-4 py-3 text-sm leading-7 text-gray-600 sm:text-base"
          >
            {{ announcement.summary }}
          </p>

          <div class="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-b border-gray-100 pb-6 text-sm text-gray-400">
            <span class="flex items-center gap-1.5">
              <UserRound class="h-4 w-4" />
              {{ announcement.authorName || '管理员' }}
            </span>
            <span class="flex items-center gap-1.5">
              <CalendarDays class="h-4 w-4" />
              {{ formatDate(announcement.createTime) }}
            </span>
            <span v-if="announcement.viewCount !== undefined" class="flex items-center gap-1.5">
              <Eye class="h-4 w-4" />
              {{ announcement.viewCount }} 次浏览
            </span>
          </div>

          <div class="whitespace-pre-wrap break-words py-7 text-base leading-8 text-gray-700">
            {{ announcement.content || '暂无正文内容。' }}
          </div>
        </div>
      </article>

      <div v-else class="rounded-xl bg-white px-6 py-20 text-center text-gray-500 shadow-sm">
        公告不存在或已被删除。
      </div>
    </div>
  </div>
</template>
