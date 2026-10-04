<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router';
import { X } from 'lucide-vue-next'
import type { MenuItem } from '@/types';
import {cn} from '@/lib/utils'
import logo from '@/assets/brand/catmap-logo.png'
import iconHome from '@/assets/icons/home.svg'
import iconPost from '@/assets/icons/post.svg'
import iconFound from '@/assets/icons/found.svg'
import iconAdopt from '@/assets/icons/adopt.svg'
import iconIndividual from '@/assets/icons/individual.svg'
import { useUserStore } from '@/stores/user'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import ThemeModeSwitch from './ThemeModeSwitch.vue'

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const props = defineProps<{ mobileOpen: boolean }>()
const emit = defineEmits<{ close: [] }>()
const isDesktop = ref(false)
const navigationPanel = ref<HTMLElement | null>(null)
let desktopMediaQuery: MediaQueryList | null = null

const isVisible = computed(() => isDesktop.value || props.mobileOpen)

const closeNavigation = () => emit('close')

const updateDesktopLayout = () => {
  isDesktop.value = desktopMediaQuery?.matches ?? false
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.mobileOpen) {
    closeNavigation()
  }
}

const menuItems: MenuItem[] = [
  { name: '首页', path: '/', icon: iconHome },
  { name: '发布动态', path: '/post', icon: iconPost },
  { name: '发现新猫', path: '/new-cat', icon: iconFound },
  { name: '领养申请', path: '/adopt', icon: iconAdopt },
  { name: '个人中心', path: '/userCenter', icon: iconIndividual },
];

const goToUserCenter = () => {
  router.push('/userCenter')
}

onMounted(() => {
  desktopMediaQuery = window.matchMedia('(min-width: 1024px)')
  updateDesktopLayout()
  desktopMediaQuery.addEventListener('change', updateDesktopLayout)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  desktopMediaQuery?.removeEventListener('change', updateDesktopLayout)
  window.removeEventListener('keydown', onKeydown)
})

watch(() => route.fullPath, () => closeNavigation())

watch(() => props.mobileOpen, async (open) => {
  if (open && !isDesktop.value) {
    await nextTick()
    navigationPanel.value?.focus()
  }
})
</script>

<template>
    <button
      v-if="mobileOpen && !isDesktop"
      type="button"
      class="fixed inset-0 z-[110] bg-black/50 backdrop-blur-[1px] lg:hidden"
      aria-label="关闭导航菜单"
      @click="closeNavigation"
    />

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="-translate-x-full opacity-0"
      enter-to-class="translate-x-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-x-0 opacity-100"
      leave-to-class="-translate-x-full opacity-0"
    >
    <aside
        v-if="isVisible"
        id="mobile-navigation"
        ref="navigationPanel"
        :role="isDesktop ? undefined : 'dialog'"
        :aria-modal="isDesktop ? undefined : true"
        :aria-label="isDesktop ? undefined : '主导航'"
        tabindex="-1"
        class="public-sidebar fixed inset-y-0 left-0 z-[120] flex h-dvh w-[min(20rem,calc(100vw-3rem))] flex-col overflow-hidden outline-none lg:static lg:z-20 lg:h-screen lg:w-[220px]"
    >
        <!--LOGO-->
        <div class="public-sidebar-brand h-20 flex items-center px-4 shrink-0">
            <img :src="logo" alt="山大猫猫图鉴 logo" class="w-10 h-10 ml-2.5 mt-2.2 rounded-[10px] object-contain">
           <div class="flex flex-col justify-center items-start">
             <h1 class="text-[18px] font-bold tracking-wider ml-3 leading-1">SDU Meow</h1>
            <span class="text-[13px] text-gray-400 ml-3 font-medium leading-1 tracking-wider">山大猫猫图鉴</span> 
            
           </div>
            <button
              v-if="!isDesktop"
              type="button"
              class="ml-auto flex h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="关闭导航菜单"
              @click="closeNavigation"
            >
              <X class="h-5 w-5" />
            </button>
        </div>
        
        <!--菜单-->
        <nav class="flex-1 w-full pt-6 space-y-3">
            <router-link
                v-for="item in menuItems"
                :key="item.path"
                :to="item.path"
                @click="closeNavigation"
                :class="cn(
                    'public-nav-item flex items-center w-[200px] h-[46px] rounded-lg ml-[10px] px-3 mb-2 group ',
                    // 默认状态：灰色文字，鼠标悬停变淡白背景
                    'text-gray-600 hover:bg-gray-100 hover:text-black',
                    // 选中状态 (Active)：背景变成 primary (黄色)，文字变黑，加粗
                    route.path===item.path&&'public-nav-item-active bg-primary text-black font-bold shadow-md'
                )"
                >
                <img :src="item.icon" alt="icon" class="w-5 h-5 mr-3 shrink-0" 
                :class="cn(route.path===item.path?'brightness-0':'brightness-0 opacity-50 group-hover:opacity-100')"/>
                <span>{{ item.name }}</span>
            </router-link>
        </nav>

        <ThemeModeSwitch />
        
        <!--底部用户信息-->
        <button
          v-if="userStore.userInfo" 
          @click="goToUserCenter"
          type="button"
          class="public-sidebar-account flex w-full items-center gap-3 px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary shrink-0"
        >
          <Avatar class="w-10 h-10 border-2 border-primary">
            <AvatarImage :src="userStore.userInfo.avatar" :alt="userStore.userInfo.nickname" />
            <AvatarFallback class="bg-primary text-black font-bold">
              {{ userStore.userInfo.nickname?.slice(0, 1) || 'U' }}
            </AvatarFallback>
          </Avatar>
          <div class="flex flex-col overflow-hidden">
            <span class="text-sm font-semibold text-gray-950 truncate">{{ userStore.userInfo.nickname }}</span>
            <span class="text-xs text-gray-400 truncate">Lv.{{ userStore.userInfo.level }} {{ userStore.userInfo.title }}</span>
          </div>
        </button>
        
        <!-- 未登录状态 -->
        <button
          v-else
          @click="router.push('/login')"
          type="button"
          class="public-sidebar-account flex w-full items-center justify-center gap-2 px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary shrink-0"
        >
          <span class="text-sm text-gray-600">点击登录</span>
        </button>
        
    </aside>
    </Transition>

</template>
