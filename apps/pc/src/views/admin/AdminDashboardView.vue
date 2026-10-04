
<script setup lang="ts">

import { ref, onMounted, onActivated, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { statsApi, userApi } from '@/lib/api'
import { CampusMap, type AdminDashboardStats } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import AdminPanel from '@/components/admin/AdminPanel.vue'
import { toast } from '@/lib/toast'
import {
  ArrowRight,
  Cat,
  FileText,
  Heart,
  TrendingUp,
  MapPin,
  LifeBuoy,
  Lock,
  LogOut,
  Eye,
  EyeOff,
  LayoutDashboard,
  House
} from 'lucide-vue-next'
// 用户中心相关逻辑
const router = useRouter()
const userStore = useUserStore()

// 登出确认弹窗
const isLogoutDialogOpen = ref(false)
const handleLogout = () => {
  isLogoutDialogOpen.value = true
}
const handleReturnToUser = () => {
  // Legacy admin logins stored their token in the user slot. Drop only that
  // incompatible session; an SSO user with admin permission keeps its login.
  if (!userStore.adminToken && !userStore.userInfo) userStore.logout()
  router.push('/')
}
const confirmLogout = () => {
  isLogoutDialogOpen.value = false
  userStore.adminLogout()
  router.push('/admin/login')
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
    userStore.logoutAll()
    toast.success('修改密码成功，请重新登录')
    router.push('/login')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '密码修改失败')
  } finally {
    passwordLoading.value = false
  }
}

// 统计数据
const dashboardStats = ref<AdminDashboardStats | null>(null)
const statsLoading = ref(false)
const statsError = ref('')
const coveredCampusCount = computed(() => dashboardStats.value?.campusDistribution.filter((item) => item.count > 0).length || 0)
const primaryCampus = computed(() => {
  const first = [...(dashboardStats.value?.campusDistribution || [])].sort((a, b) => b.count - a.count)[0]
  if (!first) return '暂无校区数据'
  return `${CampusMap[first.campus] || `校区 #${first.campus}`} ${first.percentage}%`
})

// 统计卡片数据
const stats = computed(() => [
  { label: '登记猫咪', value: String(dashboardStats.value?.totalCats || 0), icon: Cat },
  { label: '待审领养', value: String(dashboardStats.value?.adoptApplications || 0), icon: Heart },
  { label: '待处理 SOS', value: String(dashboardStats.value?.pendingSOS || 0), icon: LifeBuoy },
  { label: '覆盖校区', value: String(coveredCampusCount.value), icon: MapPin },
])

// 加载数据
const fetchStats = async () => {
  statsLoading.value = true
  statsError.value = ''
  try {
    dashboardStats.value = await statsApi.getAdminDashboardStats()
  } catch (error) {
    console.error('获取统计数据失败', error)
    statsError.value = error instanceof Error ? error.message : '仪表盘统计加载失败'
  } finally {
    statsLoading.value = false
  }
}

// 页面挂载和激活时刷新数据
onMounted(fetchStats)
onActivated(fetchStats)

// 业务管理卡片数据
const manageCards = [
  { 
    title: '猫咪档案管理', 
    desc: '管理猫咪资料、健康状况和日志。',
    icon: Cat,
    bg: 'bg-[#F3F4F6]', // 浅灰色
    action: '管理猫咪',
    path: '/admin/cats'
  },
  { 
    title: '领养流程管理', 
    desc: '审核领养申请和面试记录。',
    icon: FileText,
    bg: 'bg-[#FEF3C7]', // 浅黄色
    action: '审核申请',
    path: '/admin/adoptions'
  },
 
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader eyebrow="ADMIN OVERVIEW" title="管理工作台" description="汇总待处理事务并进入核心管理流程。" :icon="LayoutDashboard" tone="mint">
      <template #action>
        <Button variant="outline" class="admin-secondary-action border-2 border-black bg-white font-bold hover:bg-[#DDF8F2]" @click="handleReturnToUser"><House class="size-4" />返回用户端</Button>
        <Button class="admin-primary-action border-2 border-black bg-[#5CD6C2] font-bold text-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-[#48C4B1]" @click="isPasswordDialogOpen = true"><Lock class="size-4" />修改密码</Button>
        <Button variant="outline" class="admin-secondary-action border-2 border-black bg-white font-bold hover:bg-[#FACC15]" @click="handleLogout"><LogOut class="size-4" />退出登录</Button>
      </template>
    </AdminPageHeader>

    <section class="grid gap-5 lg:grid-cols-3">
      <div class="admin-dashboard-hero flex min-h-56 flex-col justify-between border-2 border-black bg-[#5CD6C2] p-6 shadow-[5px_5px_0px_rgba(0,0,0,1)] lg:col-span-2">
        <div><p class="text-sm font-bold text-gray-700">TODAY'S QUEUE</p><h2 class="mt-2 text-2xl font-black text-black">待处理事项</h2><p class="mt-3 text-base text-gray-800">目前有 <strong>{{ dashboardStats?.adoptApplications || 0 }}</strong> 个领养申请及 <strong>{{ dashboardStats?.pendingSOS || 0 }}</strong> 个 SOS 待处理。</p></div>
        <router-link to="/admin/adoptions" class="mt-6"><Button class="admin-dashboard-hero-action border-2 border-black bg-black font-bold text-white hover:bg-gray-800">进入审核中心<ArrowRight class="size-4" /></Button></router-link>
      </div>
      <div class="admin-dashboard-highlight flex min-h-56 flex-col justify-between border-2 border-black bg-[#FACC15] p-6 shadow-[5px_5px_0px_rgba(0,0,0,1)]">
        <div class="flex items-start justify-between gap-4"><div><p class="text-sm font-bold text-gray-700">登记猫咪总数</p><p class="mt-2 text-6xl font-black">{{ dashboardStats?.totalCats || 0 }}</p></div><span class="flex size-11 items-center justify-center border-2 border-black bg-white"><TrendingUp class="size-5" /></span></div>
        <p class="mt-6 text-sm font-bold text-gray-700">数量最多校区：<span class="text-black">{{ primaryCampus }}</span></p>
      </div>
    </section>

    <div v-if="statsLoading" class="border-2 border-black bg-white px-4 py-3 text-sm text-gray-600">正在加载仪表盘数据...</div>
    <div v-else-if="statsError" class="flex flex-wrap items-center justify-between gap-3 border-2 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{{ statsError }}</span><Button variant="outline" size="sm" class="border-red-700 bg-white text-red-800 hover:bg-red-100" @click="fetchStats">重新加载</Button></div>

    <section class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div v-for="stat in stats" :key="stat.label" class="admin-dashboard-stat border-2 border-black bg-white p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)]"><div class="flex items-center justify-between gap-3"><span class="text-sm font-bold text-gray-600">{{ stat.label }}</span><component :is="stat.icon" class="size-5" /></div><p class="mt-5 text-4xl font-black">{{ stat.value }}</p></div>
    </section>

    <AdminPanel title="工作台" meta="常用入口">
      <div class="admin-dashboard-workbench grid gap-px bg-black md:grid-cols-2">
        <router-link v-for="card in manageCards" :key="card.title" :to="card.path" class="admin-dashboard-workbench-card group flex min-h-48 flex-col bg-white p-6 hover:bg-[#FFF8DE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset">
          <span :class="[card.bg, 'admin-dashboard-workbench-icon flex size-12 items-center justify-center border-2 border-black']"><component :is="card.icon" class="size-6" /></span><h3 class="mt-5 text-lg font-black">{{ card.title }}</h3><p class="mt-2 flex-1 text-sm text-gray-600">{{ card.desc }}</p><span class="mt-6 flex items-center gap-2 text-sm font-bold">{{ card.action }}<ArrowRight class="size-4 transition-transform group-hover:translate-x-1" /></span>
        </router-link>
      </div>
    </AdminPanel>

    <Dialog v-model:open="isPasswordDialogOpen" @update:open="(open) => !open && resetPasswordForm()">
      <DialogContent class="admin-dialog border-2 border-black p-0 sm:max-w-[430px]"><DialogHeader class="admin-dialog-header border-b-2 border-black bg-[#FFF8DE] px-6 py-5 pr-14"><DialogTitle class="text-xl font-black">修改密码</DialogTitle><DialogDescription>验证原密码后设置新的管理员登录密码。</DialogDescription></DialogHeader>
        <div class="flex flex-col gap-4 px-6 py-5">
          <div v-for="field in [{ key: 'oldPassword', label: '原密码', placeholder: '请输入原密码', visible: showOldPassword }, { key: 'newPassword', label: '新密码', placeholder: '至少 6 位', visible: showNewPassword }, { key: 'confirmPassword', label: '确认新密码', placeholder: '请再次输入新密码', visible: showConfirmPassword }]" :key="field.key" class="space-y-2"><label class="text-sm font-bold text-gray-900">{{ field.label }}</label><div class="relative"><Input v-model="passwordForm[field.key as keyof typeof passwordForm]" :type="field.visible ? 'text' : 'password'" :placeholder="field.placeholder" class="border-2 border-black pr-11 focus-visible:ring-[#FACC15]" /><button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black" :aria-label="field.visible ? `隐藏${field.label}` : `显示${field.label}`" @click="field.key === 'oldPassword' ? (showOldPassword = !showOldPassword) : field.key === 'newPassword' ? (showNewPassword = !showNewPassword) : (showConfirmPassword = !showConfirmPassword)"><EyeOff v-if="field.visible" class="size-4" /><Eye v-else class="size-4" /></button></div></div>
        </div>
        <DialogFooter class="admin-dialog-footer border-t-2 border-black bg-[#F3F4F6] px-6 py-4"><Button variant="outline" class="border-2 border-black bg-white font-bold" :disabled="passwordLoading" @click="isPasswordDialogOpen = false">取消</Button><Button class="admin-primary-action border-2 border-black bg-[#5CD6C2] font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-[#48C4B1]" :disabled="passwordLoading" @click="handleChangePassword">{{ passwordLoading ? '提交中...' : '确认修改' }}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <ConfirmDialog v-model:open="isLogoutDialogOpen" title="退出登录" description="确定要退出当前账号吗？" confirm-text="退出" variant="warning" @confirm="confirmLogout" />
  </div>
</template>

