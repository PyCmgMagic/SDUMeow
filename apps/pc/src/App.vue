<script setup lang="ts">
import { useRoute } from 'vue-router';
import { Toaster } from './components/ui/sonner';
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useUserStore } from './stores/user';
import { useThemeStore } from './stores/theme'

const SlideBar = defineAsyncComponent(() => import('./components/layout/SlideBar.vue'))
const TopHeader = defineAsyncComponent(() => import('./components/layout/TopHeader.vue'))

const route=useRoute();
const userStore = useUserStore();
const themeStore = useThemeStore()
const mobileNavigationOpen = ref(false)

const isFullScreen = computed(()=>{
  // 登录页、无权限页和管理后台使用全屏布局，不加载前台侧边栏和顶栏。
  return route.name === 'login'
    || route.name === 'admin-login'
    || route.name === 'admin-auth-forbidden'
    || route.path.startsWith('/admin')
})
const isAdminRoute = computed(() => route.path.startsWith('/admin'))
const isAuthCallback = computed(() => typeof route.query.meow_token === 'string')
const isPublicWorkbenchRoute = computed(() => [
  '/post',
  '/new-cat',
  '/adopt',
  '/sos',
  '/notifications',
  '/my-adoptions',
  '/my-sos',
].includes(route.path))

watch(
  [isAdminRoute, () => themeStore.publicTheme],
  ([adminRoute, publicTheme]) => {
    if (adminRoute) {
      delete document.documentElement.dataset.publicTheme
      return
    }

    document.documentElement.dataset.publicTheme = publicTheme
  },
  { immediate: true },
)

const restorePublicSession = () => {
  if (isAdminRoute.value || isAuthCallback.value) return
  void userStore.restoreSession().catch((error) => {
    console.error('恢复用户信息失败', error)
  })
}

onMounted(restorePublicSession)
watch([isAdminRoute, isAuthCallback], restorePublicSession)

onBeforeUnmount(() => {
  delete document.documentElement.dataset.publicTheme
})
</script>

<template>
  <div v-if="isFullScreen" class="flex min-h-dvh w-full" :data-public-theme="isAdminRoute ? undefined : themeStore.publicTheme">
    <router-view />
  </div>
  <div v-else :data-public-theme="themeStore.publicTheme" class="public-shell flex h-dvh min-h-0 w-full overflow-hidden font-sans">
    <SlideBar
      :mobile-open="mobileNavigationOpen"
      @close="mobileNavigationOpen = false"
    />
    <div class="relative flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <TopHeader
        :navigation-open="mobileNavigationOpen"
        @toggle-navigation="mobileNavigationOpen = !mobileNavigationOpen"
      />
      <main :class="['relative z-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8', isPublicWorkbenchRoute && 'public-workbench']">
        <router-view />
      </main>
    </div>
  </div>
  <Toaster
    position="top-right"
    offset="16px"
    rich-colors
    close-button
    :visible-toasts="2"
    :duration="4000"
    :expand="false"
  />

</template>
