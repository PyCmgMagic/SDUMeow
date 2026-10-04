
<script setup lang="ts">
import { computed, ref, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
// 引入图标
import { 
  LayoutDashboard, 
  Cat, 
  Heart, 
  LifeBuoy, 
  PawPrint, 
  Users,
  Megaphone,
  Menu,
  Search,
  X
} from 'lucide-vue-next'
import { searchApi } from '@/lib/api'
import { normalizeSearchItems } from '@/lib/search'
import { type UnifiedSearchItem } from '@/types'
import { useThemeStore } from '@/stores/theme'
import AdminThemeModeSwitch from './AdminThemeModeSwitch.vue'

const route = useRoute()
const router = useRouter()
const themeStore = useThemeStore()

// 计算当前路由，用于高亮侧边栏
const currentRoute = computed(() => route.path)

// 检查是否在业务管理页面（猫咪档案、领养申请、SOS救援）
const isBusinessPage = computed(() => {
  return (
    route.path.includes('/admin/cats') ||
    route.path.includes('/admin/adoptions') ||
    route.path.includes('/admin/sos')
  )
})

// 搜索相关状态
const searchQuery = ref('')
const catSuggestions = ref<UnifiedSearchItem[]>([])
const userSuggestions = ref<UnifiedSearchItem[]>([])
const searching = ref(false)
const mobileNavOpen = ref(false)
let debounceTimer: number | null = null
let latestSearchId = 0

const searchLabel = (item: UnifiedSearchItem) => (
  item.title || item.name || `搜索结果 #${item.id}`
)

// 侧边栏菜单配置数据 
const menuGroups =[
  {
    title: '主页',
    items:[
      { name: '控制台', path: '/admin/dashboard', icon: LayoutDashboard }
    ]
  },
  {
    title: '业务管理',
    items:[
      { name: '猫咪档案', path: '/admin/cats', icon: Cat },
      { name: '领养申请', path: '/admin/adoptions', icon: Heart },
      { name: 'SOS 救援', path: '/admin/sos', icon: LifeBuoy }
    ]
  },
  {
    title: '内容中心',
    items:[
      { name: '新喵线索', path: '/admin/new-cats', icon: PawPrint },
      { name: '公告管理', path: '/admin/announcements', icon: Megaphone }
    ]
  },
  {
    title: '系统管理',
    items:[
      { name: '用户管理', path: '/admin/users', icon: Users }
    ]
  }
]

const applyAdminTheme = () => {
  document.documentElement.dataset.adminTheme = themeStore.adminTheme
}

onMounted(applyAdminTheme)

watch(() => themeStore.adminTheme, applyAdminTheme)

onBeforeUnmount(() => {
  if (debounceTimer) window.clearTimeout(debounceTimer)
  latestSearchId += 1
  delete document.documentElement.dataset.adminTheme
})

const doSearch = async (keyword: string) => {
  if (!keyword || keyword.trim().length === 0) {
    latestSearchId += 1
    catSuggestions.value = []
    userSuggestions.value = []
    searching.value = false
    return
  }

  const trimmedKeyword = keyword.trim()
  const requestId = ++latestSearchId
  searching.value = true
  try {
    const result = await searchApi.search({ keyword: trimmedKeyword, page: 1, pageSize: 5 })
    if (requestId === latestSearchId) {
      const items = normalizeSearchItems(result)
      catSuggestions.value = items.filter((item) => item.type === 0)
      userSuggestions.value = items.filter((item) => item.type === 1)
    }
  } catch {
    if (requestId !== latestSearchId) return
    catSuggestions.value = []
    userSuggestions.value = []
  } finally {
    if (requestId === latestSearchId) searching.value = false
  }
}

const onSearchInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => void doSearch(searchQuery.value), 300)
}

const chooseCat = (cat: UnifiedSearchItem) => {
  // 根据当前页面的类型决定跳转方式
  if (isBusinessPage.value) {
    // 业务管理页面（猫咪档案、领养申请、SOS救援）：保留筛选条件
    router.push({
      path: route.path,
      query: { ...route.query, search: searchLabel(cat), page: '1' }
    })
  } else {
    // 其他页面：跳转到猫咪档案页并搜索
    router.push({
      path: '/admin/cats',
      query: { search: searchLabel(cat), page: '1' }
    })
  }
  catSuggestions.value = []
  userSuggestions.value = []
  searchQuery.value = ''
}

const chooseUser = (user: UnifiedSearchItem) => {
  // Keep user results in the management list, matching the cat navigation flow.
  router.push({
    path: '/admin/users',
    query: { search: searchLabel(user), page: '1' }
  })
  catSuggestions.value = []
  userSuggestions.value = []
  searchQuery.value = ''
}

const onSearchEnter = () => {
  const resultCount = catSuggestions.value.length + userSuggestions.value.length
  if (resultCount !== 1) return

  if (catSuggestions.value[0]) {
    chooseCat(catSuggestions.value[0])
  } else if (userSuggestions.value[0]) {
    chooseUser(userSuggestions.value[0])
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  catSuggestions.value = []
  userSuggestions.value = []
  latestSearchId += 1
}
</script>




<template>
  <div class="admin-shell flex h-screen w-full overflow-hidden font-sans" :data-admin-theme="themeStore.adminTheme">
    <button
      v-if="mobileNavOpen"
      type="button"
      class="fixed inset-0 z-40 bg-black/40 lg:hidden"
      aria-label="关闭导航菜单"
      @click="mobileNavOpen = false"
    />
    
    <!-- 侧边栏 (Sidebar)=-->
    <aside
      class="admin-sidebar fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-200 lg:static lg:z-20 lg:translate-x-0"
      :class="mobileNavOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      
      <!-- Logo 区域 -->
      <div class="admin-sidebar-brand flex h-20 items-center justify-between px-6">
        <div class="flex items-center min-w-0">
        <!-- 替换为你的猫猫 Logo 图标 -->
        <svg class="admin-brand-icon mr-3 size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3.1-9-7.56c0-1.25.5-2.4 1.1-3.48 0 0-1.93-6.42-.53-7 1.4-.58 4.5 0 6.28 2 .67-.18 1.34-.27 2-.27z"></path>
          <path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"></path>
          <path d="M9 13h.01"></path>
          <path d="M15 13h.01"></path>
        </svg>
        <span class="text-2xl font-black tracking-tight truncate">SDU Meow</span>
        </div>
        <button
          type="button"
          class="admin-sidebar-close flex size-9 shrink-0 items-center justify-center lg:hidden"
          aria-label="关闭导航菜单"
          @click="mobileNavOpen = false"
        >
          <X class="size-5" />
        </button>
      </div>

      <!-- 导航菜单区域 -->
      <nav class="admin-sidebar-nav flex flex-1 flex-col gap-8 overflow-y-auto px-4 py-6">
        <div v-for="group in menuGroups" :key="group.title">
          <div class="admin-nav-group-label mb-3 px-2 text-xs font-bold uppercase">{{ group.title }}</div>
          <ul class="flex flex-col gap-2">
            <li v-for="item in group.items" :key="item.path">
              <router-link 
                :to="item.path"
                @click="mobileNavOpen = false"
                class="admin-nav-item group flex items-center px-4 py-3 transition-all duration-200"
                :class="currentRoute === item.path && 'admin-nav-item-active'"
              >
                <component 
                  :is="item.icon" 
                class="mr-3 size-5"
                  :stroke-width="currentRoute === item.path ? 2.5 : 2"
                />
                <span class="text-base">{{ item.name }}</span>
              </router-link>
            </li>
          </ul>
        </div>
      </nav>

      <AdminThemeModeSwitch />

      <!-- 底部用户信息 -->
      <div class="admin-profile flex items-center">
        <div class="admin-profile-avatar mr-4 flex size-12 shrink-0 items-center justify-center text-lg font-black">
          AD
        </div>
        <div class="flex flex-col gap-0.5 overflow-hidden">
          <span class="admin-profile-name truncate text-base font-black">管理员</span>
          <span class="admin-profile-meta truncate text-xs font-medium">admin@sdumeow.com</span>
        </div>
      </div>
    </aside>

    <!--  右侧主体区域 -->
    <div class="flex-1 flex flex-col min-w-0">
      
      <!-- 顶部栏 (Header) -->
      <header class="admin-header relative z-30 flex h-20 shrink-0 items-center justify-between px-4 sm:px-8">
        
        <!-- 左侧搜索框 -->
        <div class="flex flex-1 items-center gap-3 max-w-lg">
          <button
            type="button"
            class="admin-mobile-menu-button flex size-10 shrink-0 items-center justify-center lg:hidden"
            aria-label="打开导航菜单"
            @click="mobileNavOpen = true"
          >
            <Menu class="size-5" />
          </button>
          <div class="group relative flex w-full items-center">
            <Search class="admin-search-icon absolute left-4 size-5 transition-colors" stroke-width="2.5" />
            <input 
              v-model="searchQuery"
              @input="onSearchInput"
              @keyup.enter="onSearchEnter"
              type="text" 
              placeholder="搜索猫咪、用户或内容..." 
              class="admin-search-input w-full py-3 pl-12 pr-10 text-sm font-bold focus:outline-none focus:ring-0"
            >
            <!-- 清除按钮 -->
            <button 
              v-if="searchQuery"
              @click="clearSearch"
              class="admin-search-clear absolute right-4 transition-colors"
            >
              <X class="w-5 h-5" stroke-width="2.5" />
            </button>

            <!-- 搜索建议框 -->
            <div
              v-if="searching || catSuggestions.length || userSuggestions.length"
              class="admin-search-results absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto"
            >
              <div v-if="searching" class="px-4 py-6 text-center text-sm text-gray-500">正在搜索...</div>
              <template v-else>
              <!-- 猫咪搜索结果 -->
              <div v-if="catSuggestions.length">
                <div class="admin-search-group-label flex items-center gap-2 px-4 py-2 text-xs font-bold">
                  <Cat class="w-4 h-4" />
                  猫咪
                </div>
                <ul>
                  <li
                    v-for="item in catSuggestions"
                    :key="'cat-' + item.id"
                    class="admin-search-result group/item flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors last:border-b-0"
                    @click="chooseCat(item)"
                  >
                    <img
                      :src="item.image || item.avatar"
                      :alt="searchLabel(item)"
                      class="admin-search-avatar size-10 shrink-0 rounded-full object-cover"
                    />
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-bold text-gray-900 truncate group-hover/item:text-primary transition-colors">
                        {{ searchLabel(item) }}
                      </div>
                      <p class="mt-1 truncate text-xs text-gray-500">{{ item.description || '猫咪搜索结果' }}</p>
                    </div>
                    <div class="text-lg opacity-0 group-hover/item:opacity-100 transition-opacity">→</div>
                  </li>
                </ul>
              </div>
              
              <!-- 用户搜索结果 -->
              <div v-if="userSuggestions.length">
                <div class="admin-search-group-label flex items-center gap-2 px-4 py-2 text-xs font-bold">
                  <Users class="w-4 h-4" />
                  用户
                </div>
                <ul>
                  <li
                    v-for="user in userSuggestions"
                    :key="'user-' + user.id"
                    class="admin-search-result group/item flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors last:border-b-0"
                    @click="chooseUser(user)"
                  >
                    <div 
                      v-if="user.image || user.avatar"
                      class="admin-search-avatar size-10 shrink-0 overflow-hidden rounded-full"
                    >
                      <img :src="user.image || user.avatar" :alt="searchLabel(user)" class="w-full h-full object-cover" />
                    </div>
                    <div 
                      v-else
                      class="admin-search-avatar admin-search-avatar-fallback flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    >
                      {{ searchLabel(user).charAt(0).toUpperCase() }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-bold text-gray-900 truncate group-hover/item:text-blue-600 transition-colors">
                        {{ searchLabel(user) }}
                      </div>
                      <p class="mt-1 truncate text-xs text-gray-500">{{ user.description || `用户 ID: ${user.id}` }}</p>
                    </div>
                    <div class="text-lg opacity-0 group-hover/item:opacity-100 transition-opacity">→</div>
                  </li>
                </ul>
              </div>
              
              <div v-if="searchQuery && catSuggestions.length === 0 && userSuggestions.length === 0" class="px-4 py-6 text-center text-sm text-gray-500">
                未找到匹配的结果
              </div>
              </template>
            </div>
          </div>
        </div>

        <!-- 右侧操作区 -->
        <div class="ml-8 hidden items-center gap-4 sm:flex">
          <!-- 顶部头像 -->
          <div class="admin-header-avatar flex size-10 cursor-pointer items-center justify-center rounded-full text-sm font-black transition-shadow">
            AD
          </div>
        </div>
      </header>

      <!-- 路由视图 (Main Content) -->
      <main class="admin-main flex-1 overflow-auto p-4 sm:p-8">
        <div class="admin-content mx-auto max-w-7xl pb-10">
          <!-- 你的具体页面内容会被渲染在这里 -->
          <router-view />
        </div>
      </main>
      
    </div>
  </div>
</template>



<style scoped>

/* 隐藏滚动条但保留滚动功能  */
aside nav::-webkit-scrollbar {
  width: 4px;
}
aside nav::-webkit-scrollbar-track {
  background: transparent;
}
aside nav::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 20px;
}
</style>
