<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter, useRoute } from 'vue-router'
import { Input } from '@/components/ui/input'
import { Bell, Menu, Search, X } from 'lucide-vue-next'
import { catApi, typeApi } from '@/lib/api'
import { useUserStore } from '@/stores/user'
import { useNotificationStore } from '@/stores/notifications'
import { CampusMap, type CatListItem, type TypeOption } from '@/types'

const router = useRouter()
const route = useRoute()
defineProps<{ navigationOpen: boolean }>()
const emit = defineEmits<{ 'toggle-navigation': [] }>()
const userStore = useUserStore()
const notificationStore = useNotificationStore()
const { badgeCount } = storeToRefs(notificationStore)
const query = ref('')
const suggestions = ref<CatListItem[]>([])
const colorOptions = ref<TypeOption[]>([])
const locationOptions = ref<TypeOption[]>([])
const searching = ref(false)
const searchedKeyword = ref('')
const isAdminRoute = computed(() => route.path.includes('/admin/cats'))
const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    sos: '紧急 SOS',
    adopt: '申请领养',
    'post-moment': '发布动态',
    notifications: '通知中心',
    'announcement-detail': '公告详情',
    userCenter: '个人中心',
    'my-adoptions': '我的领养',
    'my-sos': '我的 SOS'
  }
  return titles[String(route.name)] || '首页'
})
let debounceTimer: number | null = null
let latestSearchId = 0

const colorLabels = computed(() => new Map(colorOptions.value.map((item) => [item.id, item.label])))
const locationLabels = computed(() => new Map(locationOptions.value.map((item) => [item.id, item.label])))
const colorLabel = (id: number) => colorLabels.value.get(id) || `#${id}`
const locationLabel = (id: number | null | undefined) => id == null ? '' : locationLabels.value.get(id) || `地点 #${id}`
const showSuggestionPanel = computed(() => {
  const keyword = query.value.trim()
  return Boolean(keyword && (searching.value || suggestions.value.length || searchedKeyword.value === keyword))
})

onMounted(async () => {
  notificationStore.startPolling()
  try {
    const [colors, locations] = await Promise.all([typeApi.getColors(), typeApi.getLocations()])
    colorOptions.value = colors
    locationOptions.value = locations
  } catch (e) {
    console.warn('加载猫咪类型选项失败', e)
  }
  
  // 同步路由查询参数到搜索框
  if (isAdminRoute.value && route.query.search) {
    query.value = String(route.query.search || '')
  }
})

onBeforeUnmount(() => {
  notificationStore.stopPolling()
  if (debounceTimer) window.clearTimeout(debounceTimer)
  latestSearchId += 1
})

// 监听路由变化，同步搜索框值
watch(
  () => route.query.search,
  (newVal) => {
    if (isAdminRoute.value) {
      query.value = String(newVal || '')
    }
  }
)

watch(() => userStore.token, () => {
  void notificationStore.fetchPreview()
})

const doSearch = async (keyword: string) => {
    const normalizedKeyword = keyword.trim()
    const requestId = ++latestSearchId
    if (!normalizedKeyword) {
      suggestions.value = []
      searchedKeyword.value = ''
      searching.value = false
      return
    }

    searching.value = true
    try {
      const result = await catApi.getCatList({ page: 1, pageSize: 8, search: normalizedKeyword })
      if (requestId !== latestSearchId) return
      suggestions.value = result.items
      searchedKeyword.value = normalizedKeyword
    } catch {
      if (requestId !== latestSearchId) return
      suggestions.value = []
      searchedKeyword.value = normalizedKeyword
    } finally {
      if (requestId === latestSearchId) searching.value = false
    }
}

const onInput = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(() => void doSearch(query.value), 300)
}

const chooseSuggestion = (item: CatListItem) => {
    if (route.name === 'adopt' || route.name === 'sos' || route.name === 'post-moment') {
        router.replace({ path: route.path, query: { catId: String(item.id) } })
    } else if (isAdminRoute.value) {
        // 在 AdminCatView 中，更新搜索查询参数
        router.push({ path: route.path, query: { ...route.query, search: item.name, page: '1' } })
    } else {
        router.push({ path: '/', query: { search: item.name } })
    }
    suggestions.value = []
    searchedKeyword.value = ''
    query.value = ''
}

const onSearchEnter = () => {
    const q = String(query.value || '').trim()
    if (isAdminRoute.value) {
        // 在 AdminCatView 中，更新搜索查询参数
        router.push({ path: route.path, query: { ...route.query, search: q || undefined, page: '1' } })
    } else {
        router.push({ path: '/', query: q ? { search: q } : {} })
    }
    suggestions.value = []
    searchedKeyword.value = ''
}

const clearSearch = () => {
    query.value = ''
    suggestions.value = []
    searchedKeyword.value = ''
    latestSearchId += 1
    if (isAdminRoute.value) {
        router.push({ path: route.path, query: { ...route.query, search: undefined, page: '1' } })
    }
}
</script>

<template>
    <header
        class="public-header sticky top-0 z-[100] grid h-[64px] w-full grid-cols-[minmax(0,1fr)_auto] items-center border-b border-gray-200 bg-meow-bg px-4 sm:grid-cols-3 sm:px-6"
    >
        <div class="flex min-w-0 items-center text-xs text-gray-500 tracking-wider sm:text-sm">
            <button
              type="button"
              class="mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-white hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
              aria-label="打开导航菜单"
              aria-controls="mobile-navigation"
              :aria-expanded="navigationOpen"
              @click="emit('toggle-navigation')"
            >
              <Menu class="h-5 w-5" />
            </button>
            <span class="hover:text-primary cursor-pointer transition-colors">SDU Meow</span>
            <span class="mx-2 text-gray-300">></span>
            <span class="font-bold text-gray-900">
              {{ pageTitle }}
            </span>
        </div>
        <!-- 搜索框 -->
        <div class="hidden justify-center w-full group sm:flex">
            <div class="relative w-full max-w-[500px]">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 group-focus-within:opacity-100 transition-opacity text-gray-500" />
                <Input 
                    v-model="query" 
                    @input="onInput" 
                    @keyup.enter="onSearchEnter" 
                    class="pl-10 pr-10 h-10 w-full rounded-full bg-gray-200 border-transparent focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:border-transparent placeholder:text-gray-400 text-sm transition-all" 
                    :placeholder="isAdminRoute ? '搜索猫咪名字、花色或常驻地...' : '搜索猫咪花名，花色或出没地点...'" 
                />
                <!-- 清除按钮 -->
                <button 
                    v-if="query" 
                    @click="clearSearch" 
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X class="w-4 h-4" />
                </button>

                <!-- 建议框 -->
                <div 
                    v-if="showSuggestionPanel"
                    class="absolute left-0 right-0 top-full z-[101] mt-2 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
                >
                    <div v-if="searching" class="px-4 py-6 text-center text-sm text-gray-500">正在搜索...</div>
                    <ul v-else-if="suggestions.length" class="py-1">
                        <li 
                            v-for="item in suggestions" 
                            :key="item.id" 
                            class="px-4 py-3 hover:bg-primary/10 cursor-pointer flex items-center gap-3 border-b border-gray-100 last:border-b-0 transition-colors group/item"
                            @click="chooseSuggestion(item)"
                        >
                            <img 
                                :src="item.avatar"
                                :alt="item.name"
                                class="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200" 
                            />
                            <div class="flex-1 min-w-0">
                                <div class="text-sm font-bold text-gray-900 truncate group-hover/item:text-primary transition-colors">
                                    {{ item.name }}
                                </div>
                                <div class="flex gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                                    <span class="flex items-center gap-1">
                                        <span class="text-gray-400">花色:</span>
                                        <span class="text-gray-700 font-medium">{{ colorLabel(item.color!) }}</span>
                                    </span>
                                    <span v-if="typeof item.location === 'number'" class="flex items-center gap-1">
                                        <span class="text-gray-400">地点:</span>
                                        <span class="text-gray-700 font-medium">{{ locationLabel(item.location) }}</span>
                                    </span>
                                    <span v-else class="flex items-center gap-1">
                                        <span class="text-gray-400">校区:</span>
                                        <span class="text-gray-700 font-medium">{{ CampusMap[item.campus!] }}</span>
                                    </span>
                                </div>
                            </div>
                            <div class="text-xl opacity-0 group-hover/item:opacity-100 transition-opacity">➔</div>
                        </li>
                    </ul>
                    <div v-else class="px-4 py-6 text-center text-sm text-gray-500">
                        未找到匹配内容
                    </div>
                </div>
            </div>
        </div>

        <div class="flex justify-end">
          <button
            v-if="userStore.token"
            type="button"
            class="relative flex h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:bg-white hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="打开通知"
            title="查看通知"
            @click="router.push('/notifications')"
          >
            <Bell class="w-5 h-5" />
            <span
              v-if="badgeCount > 0"
              class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-meow-bg"
            >
              {{ badgeCount > 99 ? '99+' : badgeCount }}
            </span>
          </button>

        </div>

    </header>

</template>
