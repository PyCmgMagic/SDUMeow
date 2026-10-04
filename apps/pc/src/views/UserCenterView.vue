<script setup lang="ts">
import { onBeforeUnmount, onMounted, computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { adoptionApi, badgeApi, sosApi, userApi } from '@/lib/api';
import { hasBadgeEntries, normalizeBadges } from '@/lib/badges';
import {
  AdoptionStatusMap,
  AdminAdoptionStatusMap,
  normalizeAdminAdoptionStatus,
  SOSStatusMap,
  type AdoptionStatus,
  type AdminAdoptionStatus,
  type BadgeDisplayItem,
  type MyAdoptionItem,
  type SOSItem,
} from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CampusMap } from '@/types';
import BadgeShowcase from '@/components/BadgeShowcase.vue';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/lib/toast'

import forkIcon from '@/assets/icons/fork.svg';
import foundIcon from '@/assets/icons/found.svg';
import likeIcon from '@/assets/icons/like.svg';
import paperIcon from '@/assets/icons/paper.svg';
import cameraIcon from '@/assets/icons/camera.svg';
import fishIcon from '@/assets/icons/fish.svg';
import { Crown, LogOut, Pencil, Lock, Mail, Eye, EyeOff, Siren } from 'lucide-vue-next';
const router=useRouter()
const userStore=useUserStore()

// 领养申请列表
const adoptionList = ref<MyAdoptionItem[]>([])
const adoptionLoading = ref(false)
const sosList = ref<SOSItem[]>([])
const sosLoading = ref(false)
const sosError = ref('')
const badges = ref<BadgeDisplayItem[]>([])
const badgeLoading = ref(false)
const badgeError = ref('')

// 获取领养申请列表
const fetchMyAdoptions = async () => {
  adoptionLoading.value = true
  try {
    const res = await adoptionApi.getMyAdoptions({ page: 1, size: 20 })
    adoptionList.value = res?.items || []
  } catch (error) {
    console.error('获取领养申请失败:', error)
  } finally {
    adoptionLoading.value = false
  }
}

const fetchMySOS = async () => {
  sosLoading.value = true
  sosError.value = ''
  try {
    const response = await sosApi.getMySOS({ page: 1, size: 20 })
    sosList.value = response?.items || []
  } catch (error) {
    sosList.value = []
    sosError.value = error instanceof Error ? error.message : 'SOS 记录加载失败'
  } finally {
    sosLoading.value = false
  }
}

const adoptionStatusInfo = (status: unknown) => {
  if (typeof status === 'string' && status in AdoptionStatusMap) {
    const value = status as AdoptionStatus
    return {
      label: AdoptionStatusMap[value],
      class: value === 'PENDING'
        ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
        : value === 'INTERVIEW' || value === 'APPROVED'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : value === 'REJECTED'
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-gray-200 bg-gray-50 text-gray-600',
    }
  }

  const numericStatus = normalizeAdminAdoptionStatus(status)
  if (numericStatus !== undefined) {
    const value = numericStatus as AdminAdoptionStatus
    return {
      label: AdminAdoptionStatusMap[value],
      class: value === 0
        ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
        : value === 1 || value === 2
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : value === 3
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-gray-200 bg-gray-50 text-gray-600',
    }
  }

  return { label: '状态更新中', class: 'border-gray-200 bg-gray-50 text-gray-600' }
}

const sosStatusInfo = (status: unknown) => {
  const normalizedStatus = typeof status === 'number' || /^\d+$/.test(String(status))
    ? ({ 0: 'PENDING', 1: 'PROCESSING', 2: 'RESOLVED', 3: 'CANCELLED' } as const)[Number(status) as 0 | 1 | 2 | 3]
    : status as SOSItem['status']

  return {
    label: normalizedStatus ? SOSStatusMap[normalizedStatus] : '状态更新中',
    class: normalizedStatus === 'PENDING'
      ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
      : normalizedStatus === 'PROCESSING'
        ? 'border-blue-200 bg-blue-50 text-blue-700'
        : normalizedStatus === 'RESOLVED'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : normalizedStatus === 'CANCELLED'
            ? 'sos-status-cancelled border-red-200 bg-red-50 text-red-700'
            : 'border-gray-200 bg-gray-50 text-gray-600',
  }
}

const fetchBadges = async () => {
  badgeLoading.value = true
  badgeError.value = ''
  try {
    const [allBadges, myBadges, badgeProgress] = await Promise.all([
      badgeApi.getAllBadges(),
      badgeApi.getMyBadges(),
      badgeApi.getBadgeProgress()
    ])
    const normalized = normalizeBadges(allBadges, myBadges, badgeProgress)
    if ((hasBadgeEntries(allBadges) || hasBadgeEntries(myBadges) || hasBadgeEntries(badgeProgress)) && normalized.length === 0) {
      throw new Error('徽章数据格式暂不受支持')
    }
    badges.value = normalized
  } catch (error) {
    badgeError.value = error instanceof Error ? error.message : '徽章加载失败'
  } finally {
    badgeLoading.value = false
  }
}

//初始化数据
onMounted(() => {
  if(userStore.token){
    void userStore.fetchUserInfo()
    void fetchMyAdoptions()
    void fetchMySOS()
    void fetchBadges()
  }
})

//登出确认弹窗
const isLogoutDialogOpen = ref(false)

const handleLogout=()=>{
    isLogoutDialogOpen.value = true
}

const confirmLogout = () => {
    isLogoutDialogOpen.value = false
    userStore.logout()
    router.push('/login')
}

// 修改密码弹窗相关
const isPasswordDialogOpen = ref(false)
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const passwordLoading = ref(false)
const showOldPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// 邮箱绑定弹窗：验证码发送到当前登录账号对应的邮箱，绑定接口只提交密码和验证码。
const isBindEmailDialogOpen = ref(false)
const bindEmailForm = ref({ password: '', code: '' })
const bindEmailLoading = ref(false)
const bindEmailCodeLoading = ref(false)
const bindEmailCountdown = ref(0)
let bindEmailTimer: ReturnType<typeof setInterval> | undefined

const clearBindEmailTimer = () => {
  if (bindEmailTimer) {
    clearInterval(bindEmailTimer)
    bindEmailTimer = undefined
  }
}

const resetBindEmailForm = () => {
  clearBindEmailTimer()
  bindEmailForm.value = { password: '', code: '' }
  bindEmailCountdown.value = 0
}

const handleSendBindEmailCode = async () => {
  if (bindEmailCodeLoading.value || bindEmailCountdown.value > 0) return

  bindEmailCodeLoading.value = true
  try {
    await userApi.sendVerificationCodeForCurrentUser()
    toast.success('验证码已发送，请查收当前账号邮箱')
    bindEmailCountdown.value = 60
    clearBindEmailTimer()
    bindEmailTimer = setInterval(() => {
      if (bindEmailCountdown.value <= 1) {
        bindEmailCountdown.value = 0
        clearBindEmailTimer()
      } else {
        bindEmailCountdown.value -= 1
      }
    }, 1000)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '验证码发送失败，请稍后再试')
  } finally {
    bindEmailCodeLoading.value = false
  }
}

const handleBindEmail = async () => {
  const password = bindEmailForm.value.password.trim()
  const code = bindEmailForm.value.code.trim()
  if (!password) return toast.warning('请输入当前登录密码')
  if (!code) return toast.warning('请输入邮箱验证码')

  bindEmailLoading.value = true
  try {
    await userApi.bindEmail({ password, code })
    await userStore.fetchUserInfo()
    isBindEmailDialogOpen.value = false
    resetBindEmailForm()
    toast.success('邮箱绑定成功')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '邮箱绑定失败，请检查密码和验证码')
  } finally {
    bindEmailLoading.value = false
  }
}

const resetPasswordForm = () => {
  passwordForm.value = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
  showOldPassword.value = false
  showNewPassword.value = false
  showConfirmPassword.value = false
}

const handleChangePassword = async () => {
  const { oldPassword, newPassword, confirmPassword } = passwordForm.value
  
  if (!oldPassword) return toast.warning('请输入原密码')
  if (!newPassword) return toast.warning('请输入新密码')
  if (newPassword.length < 6) return toast.warning('新密码至少6位')
  if (newPassword !== confirmPassword) return toast.warning('两次密码输入不一致')
  if (oldPassword === newPassword) return toast.warning('新密码不能与原密码相同')
  
  passwordLoading.value = true
  try {
    await userApi.changePassword({
      oldPassword,
      newPassword,
      confirmPassword
    })
    isPasswordDialogOpen.value = false
    resetPasswordForm()
    // 登出并跳转到登录页
    userStore.logout()
    toast.success('修改密码成功，请重新登录')
    router.push('/login')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '密码修改失败')
  } finally {
    passwordLoading.value = false
  }
}

onBeforeUnmount(clearBindEmailTimer)

//校区计算属性
const campusName = computed(() => {
  const info = userStore.userInfo
  // 如果没登录/没数据，或者是 undefined，返回默认值
  if (!info || info.campus === undefined) {
    return '未知校区'
  }
  //  查表，如果查不到，也显示未知
  const idx = typeof info.campus === 'number' ? info.campus : Number(info.campus)
  if (Number.isNaN(idx)) return '未知校区'
  return CampusMap[idx] || '未知校区'
})

const user =computed(() => userStore.userInfo)
const currentExperience = computed(() => Math.max(user.value?.exp ?? 0, 0))
const levelExperience = computed(() => Math.max(user.value?.nextExp ?? 0, 0))
const experiencePercentage = computed(() => {
  if (!levelExperience.value) return 0
  return Math.min(Math.max((currentExperience.value / levelExperience.value) * 100, 0), 100)
})
</script>

<template>
  <div class="public-page flex min-h-full flex-col gap-5 p-4 sm:p-6">
    
    <!-- 1. 顶部个人信息卡片 (橙色背景) -->
    
    <section class="public-profile-hero relative flex w-full flex-col gap-5 overflow-hidden p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
      
      <!-- 左侧：头像与信息 -->
      <div class="z-10 flex min-w-0 items-center gap-4 sm:gap-6">
        <!-- 头像外圈 -->
        <div class="w-20 h-20 rounded-full border-4 border-white/30 overflow-hidden bg-white">
          <img 
            :src="user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'" 
            class="w-full h-full object-cover"
          />
        </div>
        
        <div class="flex flex-col gap-2">
          <h1 class="text-3xl font-bold tracking-wide">{{ user?.nickname || '爱吃鱼的猫' }}</h1>
          <p class="text-white/90 text-sm font-medium">{{ campusName || '未知校区' }}</p>
          
          <!-- 等级胶囊 -->
          <div class="mt-1 inline-flex w-fit items-center rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
            <Crown class="mr-1 size-3.5" />
            Lv.{{ user?.level || 1 }} {{ user?.title || '新晋铲屎官' }}
          </div>
        </div>
      </div>

      <!-- 右侧：编辑按钮 -->
      <Button 
        class="public-profile-action z-10 self-start border-none bg-white px-6 py-2 font-bold shadow-sm hover:bg-white/90 sm:self-auto"
        @click="router.push('/editProfile')"
      >
        <Pencil class="w-4 h-4" />
        编辑资料
      </Button>
    </section>

    <!-- 等级经验 -->
    <section class="public-card p-5 sm:p-6" aria-labelledby="experience-title">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.12em] text-gray-400">成长进度</p>
          <h2 id="experience-title" class="mt-1 text-lg font-bold text-gray-900">Lv.{{ user?.level || 1 }} {{ user?.title || '新晋铲屎官' }}</h2>
        </div>
        <p class="text-sm font-semibold text-gray-600">已有经验：{{ currentExperience }} / {{ levelExperience || '-' }}</p>
      </div>
      <div class="mt-4 h-3 overflow-hidden rounded-full bg-gray-100" role="progressbar" :aria-valuenow="experiencePercentage" aria-valuemin="0" aria-valuemax="100" aria-label="等级经验进度">
        <div class="h-full rounded-full bg-[#5CD6C2] transition-[width]" :style="{ width: `${experiencePercentage}%` }" />
      </div>
      <p class="mt-2 text-xs text-gray-400">当前等级升级进度 {{ Math.round(experiencePercentage) }}%</p>
    </section>

    <!-- 2. 数据统计  -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      
      <!-- 卡片 1: 累计投喂 -->
      <div class="public-card flex flex-col gap-4 p-5">
        <!-- 图标容器 -->
        <div class="w-10 h-10 bg-blue-100 text-blue-500 rounded-lg flex items-center justify-center">
          <img :src="forkIcon" class="w-5 h-5" />
        </div>
        <div>
          <div class="text-3xl font-extrabold text-gray-900">{{ user?.stats.feedCount  }}</div>
          <div class="text-xs text-gray-400 mt-1">累计投喂</div>
        </div>
      </div>

      <!-- 卡片 2: 发现新猫 -->
      <router-link
        to="/new-cat"
        class="public-card flex flex-col gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-green-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div class="w-10 h-10 bg-green-100 text-green-500 rounded-lg flex items-center justify-center">
          <img :src="foundIcon" class="w-5 h-5" />
        </div>
        <div>
          <div class="text-3xl font-extrabold text-gray-900">{{ user?.stats.found }}</div>
          <div class="text-xs text-gray-400 mt-1">发现新猫 · 提交线索</div>
        </div>
      </router-link>

      <!-- 卡片 3: 获赞认可 -->
      <div class="public-card flex flex-col gap-4 p-5">
        <div class="w-10 h-10 bg-orange-100 text-orange-500 rounded-lg flex items-center justify-center">
          <img :src="likeIcon" class="w-5 h-5" />
        </div>
        <div>
          <div class="text-3xl font-extrabold text-gray-900">{{ user?.stats.receivedLikes  }}</div>
          <div class="text-xs text-gray-400 mt-1">获赞认可</div>
        </div>
      </div>

      <!-- 卡片 4: 发布动态 -->
      <router-link
        to="/post"
        class="public-card flex flex-col gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-yellow-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div class="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center">
          <img :src="cameraIcon" class="w-5 h-5" />
        </div>
        <div>
          <div class="text-3xl font-extrabold text-gray-900">{{ user?.stats.momentCount }}</div>
          <div class="text-xs text-gray-400 mt-1">发布动态 · 分享记录</div>
        </div>
      </router-link>

    </div>

    <!-- 3. 小鱼干余额  -->
    <section class="public-balance-card group relative w-full overflow-hidden p-5 text-white sm:p-8">
      <div class="relative z-10">
        <div class="text-xs text-yellow-500/80 font-medium mb-2">小鱼干余额 (积分)</div>
        <div class="text-5xl font-black text-[#F3B72E] tracking-wider font-mono">
          {{ user?.currency || 850 }}
        </div>
      </div>
      
      <!-- 右下角装饰鱼 SVG -->
      <img :src="fishIcon" class="w-24 h-24 absolute -bottom-3 -right-4 opacity-80 group-hover:opacity-90 transition-opacity mr-6" />
    </section>

    <!-- 4. 功能入口  -->
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
      
      <!-- 领养申请 -->
      <section class="public-card public-center-entry flex min-h-[15.5rem] flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 sm:p-6">
        <header class="mb-4 flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-4">
            <div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
              <img :src="paperIcon" alt="" class="size-6" />
            </div>
            <div class="flex min-w-0 flex-col justify-center">
              <h3 class="text-lg font-bold text-gray-800">领养申请</h3>
              <span class="mt-1 text-xs text-gray-400">查看申请进度</span>
            </div>
          </div>
          <router-link 
            to="/my-adoptions" 
            class="shrink-0 text-sm font-medium text-orange-500 hover:text-orange-600"
          >
            查看全部 →
          </router-link>
        </header>
        
        <div v-if="adoptionLoading" class="flex flex-1 items-center justify-center py-4 text-sm text-gray-400">
          加载中...
        </div>
        <div v-else-if="adoptionList.length === 0" class="flex flex-1 items-center justify-center py-4 text-sm text-gray-400">
          暂无领养申请
        </div>
        <div v-else class="public-preview-scroll flex max-h-36 flex-col gap-2 overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable]">
          <button
            v-for="item in adoptionList"
            :key="item.id"
            type="button"
            class="flex min-h-[4.25rem] w-full shrink-0 items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            @click="router.push(`/cat/${item.catId}`)"
          >
            <img :src="item.catAvatar" :alt="item.catName" class="size-11 shrink-0 rounded-full object-cover" />
            <div class="min-w-0 flex-1">
              <div class="truncate font-medium text-gray-800">{{ item.catName }}</div>
              <div class="mt-1 text-xs text-gray-400">{{ item.createTime?.slice(0, 10) || '时间待更新' }}</div>
            </div>
            <Badge
              variant="outline"
              class="shrink-0 font-bold"
              :class="adoptionStatusInfo(item.status).class"
            >
              {{ adoptionStatusInfo(item.status).label }}
            </Badge>
          </button>
        </div>
      </section>

      <!-- 我的 SOS -->
      <section class="public-card public-center-entry flex min-h-[15.5rem] flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 sm:p-6">
        <header class="mb-4 flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-4">
            <div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
              <Siren class="size-5" />
            </div>
            <div class="flex min-w-0 flex-col justify-center">
              <h3 class="text-lg font-bold text-gray-800">我的 SOS</h3>
              <span class="mt-1 text-xs text-gray-400">查看求助处理进度</span>
            </div>
          </div>
          <router-link to="/my-sos" class="shrink-0 text-sm font-medium text-orange-500 hover:text-orange-600">
            查看全部 →
          </router-link>
        </header>

        <div v-if="sosLoading" class="flex flex-1 items-center justify-center py-4 text-sm text-gray-400">
          加载中...
        </div>
        <div v-else-if="sosError" class="flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center text-sm text-red-600">
          <span>SOS 记录加载失败</span>
          <Button variant="outline" size="sm" @click="fetchMySOS">重新加载</Button>
        </div>
        <div v-else-if="sosList.length === 0" class="flex flex-1 items-center justify-center py-4 text-sm text-gray-400">
          暂无 SOS 记录
        </div>
        <div v-else class="public-preview-scroll flex max-h-36 flex-col gap-2 overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable]">
          <button
            v-for="item in sosList"
            :key="item.id"
            type="button"
            class="flex min-h-[4.25rem] w-full shrink-0 items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            @click="router.push('/my-sos')"
          >
            <div class="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
              <Siren class="size-5" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate font-medium text-gray-800">{{ item.catName || '未收录猫咪' }}</div>
              <div class="mt-1 truncate text-xs text-gray-400">{{ item.location || '位置待更新' }}</div>
            </div>
            <Badge
              variant="outline"
              class="shrink-0 font-bold"
              :class="sosStatusInfo(item.status).class"
            >
              {{ sosStatusInfo(item.status).label }}
            </Badge>
          </button>
        </div>
      </section>

    </div>

    <BadgeShowcase
      :items="badges"
      :loading="badgeLoading"
      :error="badgeError"
      @retry="fetchBadges"
    />

    <!-- 5. 修改密码 & 退出登录 -->
    <div class="flex justify-center items-center gap-6 mt-4">
      <button
        @click="isBindEmailDialogOpen = true"
        class="flex items-center gap-2 text-gray-400 hover:text-orange-500 text-sm font-bold transition-colors py-2 rounded-lg"
      >
        <Mail class="w-4 h-4" />
        绑定邮箱
      </button>
      <span class="text-gray-200">|</span>
      <button 
        @click="isPasswordDialogOpen = true" 
        class="flex items-center gap-2 text-gray-400 hover:text-orange-500 text-sm font-bold transition-colors py-2 rounded-lg"
      >
        <Lock class="w-4 h-4" />
        修改密码
      </button>
      <span class="text-gray-200">|</span>
      <button 
        @click="handleLogout" 
        class="flex items-center gap-2 text-gray-400 hover:text-red-500 text-sm font-bold transition-colors py-2 rounded-lg"
      >
        <LogOut class="w-4 h-4 text-center" />
        退出登录
      </button>
    </div>

    <!-- 邮箱绑定弹窗 -->
    <Dialog v-model:open="isBindEmailDialogOpen" @update:open="(open) => !open && resetBindEmailForm()">
      <DialogContent class="public-dialog overflow-hidden p-0 sm:max-w-[400px]">
        <DialogHeader class="public-dialog-header px-6 py-5 pr-14">
          <DialogTitle>绑定邮箱</DialogTitle>
          <DialogDescription>验证码将发送到当前账号对应的山大邮箱，绑定后可使用邮箱密码登录。</DialogDescription>
        </DialogHeader>

        <div class="public-dialog-body flex flex-col gap-4 px-6 py-5">
          <div v-if="user?.email" class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
            当前邮箱：{{ user.email }}
          </div>
          <div class="space-y-2">
            <label for="bind-email-password" class="text-sm font-medium text-gray-700">当前登录密码</label>
            <Input
              id="bind-email-password"
              v-model="bindEmailForm.password"
              type="password"
              autocomplete="current-password"
              placeholder="请输入当前登录密码"
              class="public-dialog-field"
            />
          </div>
          <div class="space-y-2">
            <label for="bind-email-code" class="text-sm font-medium text-gray-700">邮箱验证码</label>
            <div class="flex gap-2">
              <Input
                id="bind-email-code"
                v-model="bindEmailForm.code"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                placeholder="请输入验证码"
                class="public-dialog-field min-w-0 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                class="shrink-0"
                :disabled="bindEmailCodeLoading || bindEmailCountdown > 0"
                @click="handleSendBindEmailCode"
              >
                {{ bindEmailCodeLoading ? '发送中' : bindEmailCountdown > 0 ? `${bindEmailCountdown}s` : '获取验证码' }}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter class="public-dialog-footer px-6 py-4">
          <Button
            variant="outline"
            class="public-dialog-cancel"
            :disabled="bindEmailLoading"
            @click="isBindEmailDialogOpen = false"
          >
            取消
          </Button>
          <Button
            class="public-dialog-primary bg-orange-500 text-white hover:bg-orange-600"
            :disabled="bindEmailLoading"
            @click="handleBindEmail"
          >
            {{ bindEmailLoading ? '绑定中...' : '确认绑定' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 修改密码弹窗 -->
    <Dialog v-model:open="isPasswordDialogOpen" @update:open="(open) => !open && resetPasswordForm()">
      <DialogContent class="public-dialog overflow-hidden p-0 sm:max-w-[400px]">
        <DialogHeader class="public-dialog-header px-6 py-5 pr-14">
          <DialogTitle>修改密码</DialogTitle>
          <DialogDescription>验证原密码后设置新的登录密码。</DialogDescription>
        </DialogHeader>
        
        <div class="public-dialog-body flex flex-col gap-4 px-6 py-5">
          <!-- 原密码 -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700">原密码</label>
            <div class="relative">
              <Input
                v-model="passwordForm.oldPassword"
                :type="showOldPassword ? 'text' : 'password'"
                placeholder="请输入原密码"
                class="public-dialog-field pr-10"
              />
              <button 
                type="button"
                @click="showOldPassword = !showOldPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <Eye v-if="!showOldPassword" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <!-- 新密码 -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700">新密码</label>
            <div class="relative">
              <Input
                v-model="passwordForm.newPassword"
                :type="showNewPassword ? 'text' : 'password'"
                placeholder="请输入新密码（至少6位）"
                class="public-dialog-field pr-10"
              />
              <button 
                type="button"
                @click="showNewPassword = !showNewPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <Eye v-if="!showNewPassword" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <!-- 确认新密码 -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700">确认新密码</label>
            <div class="relative">
              <Input
                v-model="passwordForm.confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="请再次输入新密码"
                class="public-dialog-field pr-10"
              />
              <button 
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <Eye v-if="!showConfirmPassword" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        <DialogFooter class="public-dialog-footer px-6 py-4">
          <Button 
            variant="outline" 
            class="public-dialog-cancel"
            @click="isPasswordDialogOpen = false"
            :disabled="passwordLoading"
          >
            取消
          </Button>
          <Button 
            @click="handleChangePassword"
            :disabled="passwordLoading"
            class="public-dialog-primary bg-orange-500 hover:bg-orange-600 text-white"
          >
            {{ passwordLoading ? '提交中...' : '确认修改' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 登出确认对话框 -->
    <ConfirmDialog
      v-model:open="isLogoutDialogOpen"
      title="退出登录"
      description="确定要退出当前账号吗？"
      confirm-text="退出"
      variant="warning"
      @confirm="confirmLogout"
    />

  </div>
</template>
