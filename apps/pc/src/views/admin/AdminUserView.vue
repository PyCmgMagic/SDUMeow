<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminUserApi } from '@/lib/api'
import { CampusMap, type AdminUserItem, type AdminUserDetail } from '@/types'
import { toast } from '@/lib/toast'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem
} from '@/components/ui/pagination'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import { ChevronLeft, ChevronRight, Users } from 'lucide-vue-next'

// 状态定义
const loading = ref(false)
const route = useRoute()
const router = useRouter()
const userList = ref<AdminUserItem[]>([])
const pageSize = 10 // 每页显示数量
const total = ref(0)
const totalPages = ref(1)
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailUser = ref<AdminUserDetail | null>(null)
const actionLoadingId = ref<number | null>(null)

// 封禁确认弹窗
const banDialogOpen = ref(false)
const banTargetUser = ref<AdminUserItem | null>(null)
let latestRequestId = 0

const DETAIL_CONCURRENCY = 3

const searchTerm = computed(() => (
  typeof route.query.search === 'string' ? route.query.search.trim() : ''
))
const currentPage = computed(() => {
  const value = Number.parseInt(String(route.query.page || '1'), 10)
  return Number.isInteger(value) && value > 0 ? value : 1
})
const setPage = (page: number) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  void router.push({ query: { ...route.query, page: String(page) } })
}

const statusText = (status: unknown) => {
  if (status === null || status === undefined || status === '') return '正常'
  if (status === 0 || status === '0' || status === 'NORMAL' || status === 'ACTIVE') return '正常'
  if (status === 1 || status === '1' || status === 'BANNED') return '已封禁'
  return String(status)
}

const isBanned = (status: unknown) => (
  status === 1 || status === '1' || String(status).toUpperCase() === 'BANNED'
)

const roleText = (user: AdminUserItem) => {
  const role = user.permission ?? user.role ?? user.roleName
  if (role === 0 || role === '0') return '普通用户'
  if (role === 1 || role === '1') return '管理员'

  const normalized = String(role || '').trim().toUpperCase()
  if (normalized === 'ADMIN' || normalized === 'ADMINISTRATOR' || normalized.includes('管理员')) return '管理员'
  if (normalized === 'USER' || normalized === 'MEMBER' || normalized.includes('普通用户')) return '普通用户'
  return normalized || '未知'
}

const isAdministrator = (user: AdminUserItem) => roleText(user) === '管理员'

const needsDetail = (user: AdminUserItem) => (
  !user.avatar ||
  (!user.sid && !user.studentId) ||
  user.level === undefined ||
  (user.permission === null || user.permission === undefined || user.permission === '') &&
  (user.role === null || user.role === undefined || user.role === '') &&
  (user.roleName === null || user.roleName === undefined || user.roleName === '')
)

const hydrateVisibleUserDetails = (items: AdminUserItem[], requestId: number) => {
  const pending = items
    .map((user, index) => ({ user, index }))
    .filter(({ user }) => needsDetail(user))

  let nextIndex = 0
  const worker = async () => {
    while (nextIndex < pending.length) {
      const task = pending[nextIndex]
      nextIndex += 1
      if (!task) return

      try {
        const detail = await adminUserApi.getUserDetail(task.user.id)
        if (requestId !== latestRequestId) return

        const currentUser = userList.value[task.index]
        if (currentUser?.id === task.user.id) {
          userList.value[task.index] = { ...currentUser, ...detail }
        }
      } catch {
        // The list remains usable when an individual detail request fails.
      }
    }
  }

  const workerCount = Math.min(DETAIL_CONCURRENCY, pending.length)
  void Promise.all(Array.from({ length: workerCount }, worker))
}

// 服务端分页获取用户列表
const fetchUserList = async () => {
  const requestId = ++latestRequestId
  loading.value = true
  try {
    const res = await adminUserApi.getUserList({
      page: currentPage.value,
      size: pageSize,
      ...(searchTerm.value ? { search: searchTerm.value } : {})
    })
    if (requestId !== latestRequestId) return
    const items = res.items || []
    userList.value = items
    total.value = Number(res.total ?? items.length)
    const responsePages = Number(res.pages)
    totalPages.value = Number.isFinite(responsePages) && responsePages > 0
      ? responsePages
      : Math.max(Math.ceil(total.value / pageSize), 1)
    if (total.value > 0 && currentPage.value > totalPages.value) {
      await router.replace({ query: { ...route.query, page: String(totalPages.value) } })
      return
    }
    hydrateVisibleUserDetails(items, requestId)
  } catch (error) {
    if (requestId !== latestRequestId) return
    console.error('Failed to fetch user list:', error)
    userList.value = []
    total.value = 0
    totalPages.value = 1
    toast.error('获取用户列表失败，请重试')
  } finally {
    if (requestId === latestRequestId) loading.value = false
  }
}

// 分页页码列表
const paginationPages = computed(() => {
  const pages: (number | 'ellipsis')[] = []
  const total = totalPages.value
  const current = currentPage.value

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 4) pages.push('ellipsis')
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (current < total - 3) pages.push('ellipsis')
    pages.push(total)
  }
  return pages
})

watch(
  () => [route.query.page, route.query.search],
  () => void fetchUserList(),
  { immediate: true }
)

// 查看详情（弹窗）
const handleViewDetail = async (userId: string | number) => {
  detailOpen.value = true
  detailLoading.value = true
  detailUser.value = null
  try {
    detailUser.value = await adminUserApi.getUserDetail(userId)
  } catch (error) {
    toast.error('获取用户详情失败')
  } finally {
    detailLoading.value = false
  }
}

// 封禁/解封用户
const handleToggleBan = (user: AdminUserItem) => {
  if (actionLoadingId.value !== null) return
  banTargetUser.value = user
  banDialogOpen.value = true
}

const confirmToggleBan = async () => {
  const user = banTargetUser.value
  if (!user) return
  
  const actionText = isBanned(user.status) ? '解封' : '封禁'
  
  banDialogOpen.value = false
  actionLoadingId.value = Number(user.id)
  try {
    await adminUserApi.toggleBan(user.id)
    toast.success(`${actionText}成功`)
    await fetchUserList()
  } catch (error) {
    toast.error(`${actionText}失败`)
  } finally {
    actionLoadingId.value = null
    banTargetUser.value = null
  }
}

</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader eyebrow="USER DIRECTORY" title="用户管理" description="查看账户信息并管理用户状态。" :icon="Users" tone="yellow" />

    <AdminPanel title="用户列表" :meta="`共 ${total} 位用户`">
      <div>
          <div v-if="loading" class="p-8 text-center text-gray-500">
            加载中...
          </div>
          <div v-else-if="userList.length === 0" class="p-8 text-center text-gray-500">
            暂无用户数据
          </div>
          <div v-else class="overflow-x-auto">
            <Table>
              <TableHeader class="admin-data-table-header bg-[#FFF8DE]">
                <TableRow class="border-b-2 border-black hover:bg-[#FFF8DE]">
                  <TableHead>ID</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>学号</TableHead>
                  <TableHead>等级</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="user in userList" :key="user.id" class="admin-data-table-row border-b border-gray-200 hover:bg-[#FFF8DE]">
                      <TableCell>
                        <span class="text-sm text-gray-700">#{{ user.id }}</span>
                      </TableCell>

                  <TableCell>
                    <div class="flex items-center gap-3">
                      <Avatar class="admin-data-avatar w-8 h-8 border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                        <AvatarImage v-if="user.avatar" :src="user.avatar" :alt="user.name" />
                        <AvatarFallback>{{ (user.name || 'U').charAt(0) }}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p class="font-medium text-gray-900">{{ user.name }}</p>
                      </div>
                    </div>
                  </TableCell>

                       <TableCell>
                         <span class="inline-flex border-2 border-black bg-[#F3F4F6] px-2 py-1 text-sm font-bold text-gray-800">{{ roleText(user) }}</span>
                       </TableCell>

                       <TableCell>
                        <span class="text-sm text-gray-700">{{ user.sid || user.studentId || '未提供' }}</span>
                      </TableCell>

                       <TableCell>
                         <span class="inline-flex border-2 border-black bg-[#FACC15] px-2 py-1 text-sm font-bold text-black">Lv.{{ user.level ?? user.levelTitle ?? '-' }}</span>
                       </TableCell>

                       <TableCell>
                         <Badge variant="outline" :class="isBanned(user.status) ? 'border-2 border-red-700 bg-red-50 text-red-800' : 'border-2 border-black bg-[#DDF8F2] text-black'">{{ statusText(user.status) }}</Badge>
                       </TableCell>

                       <TableCell>
                         <div class="flex gap-2 flex-wrap">
                           <Button size="sm" variant="outline" :disabled="loading" @click="handleViewDetail(user.id)"
                             class="border-2 border-black bg-white font-bold hover:bg-[#FACC15]">
                             查看详情
                           </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            :disabled="loading || actionLoadingId === Number(user.id) || isAdministrator(user)"
                            @click="handleToggleBan(user)"
                             :class="isBanned(user.status) ? 'border-2 border-black bg-[#5CD6C2] font-bold text-black hover:bg-[#48C4B1]' : 'border-2 border-red-700 bg-white font-bold text-red-800 hover:bg-red-50'"
                          >
                            {{ isBanned(user.status) ? '解封' : '封禁' }}
                          </Button>
                        </div>
                      </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
      </div>
    </AdminPanel>

      <!-- 分页 -->
      <div class="admin-page-number-pagination mt-6 flex justify-center" v-if="totalPages > 1">
        <Pagination :total="total" :items-per-page="pageSize" :page="currentPage">
          <PaginationContent class="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              class="h-9 w-9"
              :disabled="currentPage <= 1"
              @click="setPage(currentPage - 1)"
            >
              <ChevronLeft class="h-4 w-4" />
            </Button>

            <template v-for="(page, index) in paginationPages" :key="`page-${page}-${index}`">
              <PaginationItem v-if="page === 'ellipsis'" :value="index">
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem v-else :value="page as number">
                <Button
                  variant="ghost"
                  size="icon"
                   class="h-9 w-9 border-2 border-black"
                   :class="currentPage === page ? 'bg-[#FACC15] text-black hover:bg-[#EAB308]' : 'bg-white hover:bg-[#FFF8DE]'"
                  @click="setPage(page as number)"
                >
                  {{ page }}
                </Button>
              </PaginationItem>
            </template>

            <Button
              variant="ghost"
              size="icon"
              class="h-9 w-9"
              :disabled="currentPage >= totalPages"
              @click="setPage(currentPage + 1)"
            >
              <ChevronRight class="h-4 w-4" />
            </Button>
          </PaginationContent>
        </Pagination>
      </div>
  </div>

  <!-- 详情弹窗 -->
  <Dialog v-model:open="detailOpen">
    <DialogContent class="admin-dialog max-w-lg overflow-hidden border-2 border-black p-0">
      <DialogHeader class="admin-dialog-header border-b-2 border-black bg-[#FFF8DE] px-6 py-5 pr-14"><DialogTitle class="text-xl font-black">用户详情</DialogTitle><DialogDescription>查看该用户的账户信息、状态与校园资料。</DialogDescription></DialogHeader>
      <div class="px-6 py-5">
        <div v-if="detailLoading" class="grid grid-cols-2 gap-3 animate-pulse"><div v-for="item in 4" :key="item" class="h-16 border-2 border-gray-300 bg-gray-100"></div></div>
        <div v-else-if="detailUser">
          <div class="flex items-center gap-4 border-b-2 border-black pb-5">
            <Avatar class="size-16 border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]">
              <AvatarImage v-if="detailUser.avatar" :src="detailUser.avatar" :alt="detailUser.name" />
              <AvatarFallback class="bg-[#FACC15] text-xl font-black text-black">
                {{ detailUser.name?.charAt(0) || 'U' }}
              </AvatarFallback>
            </Avatar>
            <div class="min-w-0 flex-1">
              <p class="truncate text-xl font-black text-gray-900">{{ detailUser.name }}</p>
              <p v-if="detailUser.nickname" class="text-sm text-gray-500">{{ detailUser.nickname }}</p>
              <p class="text-xs text-gray-400 mt-0.5">ID: {{ detailUser.id }}</p>
            </div>
          </div>
          
          <div class="my-5 flex flex-wrap gap-2">
            <Badge :class="isAdministrator(detailUser) ? 'border-2 border-black bg-[#F3F4F6] text-black' : 'border-2 border-black bg-white text-black'" variant="outline">
              {{ roleText(detailUser) }}
            </Badge>
            <Badge variant="outline" class="border-2 border-black bg-[#FACC15] text-black">
              Lv.{{ detailUser.level ?? 1 }} {{ detailUser.levelTitle || '' }}
            </Badge>
            <Badge :class="isBanned(detailUser.status) ? 'border-2 border-red-700 bg-red-50 text-red-800' : 'border-2 border-black bg-[#DDF8F2] text-black'" variant="outline">
              {{ statusText(detailUser.status) }}
            </Badge>
          </div>
          
          <div class="grid grid-cols-2 border-2 border-black text-sm">
            <div class="border-b-2 border-r-2 border-black p-3"><p class="text-xs font-bold text-gray-500">学号</p><p class="mt-1 font-bold text-gray-900">{{ detailUser.sid || detailUser.studentId || '未绑定' }}</p></div>
            <div class="border-b-2 border-black p-3"><p class="text-xs font-bold text-gray-500">校区</p><p class="mt-1 font-bold text-gray-900">{{ detailUser.campus !== undefined ? CampusMap[Number(detailUser.campus)] || '未知' : '未知' }}</p></div>
            <div class="border-r-2 border-black bg-[#FFF8DE] p-3"><p class="text-xs font-bold text-gray-500">小鱼干</p><p class="mt-1 font-bold text-gray-900">{{ detailUser.currency ?? 0 }}</p></div>
            <div class="bg-[#F3F4F6] p-3"><p class="text-xs font-bold text-gray-500">经验值</p><p class="mt-1 font-bold text-gray-900">{{ detailUser.exp ?? 0 }} / {{ detailUser.nextExp ?? '-' }}</p></div>
          </div>
          <div v-if="detailUser.stats" class="mt-5 border-2 border-black">
            <p class="border-b-2 border-black bg-[#FFF8DE] px-3 py-2 text-sm font-black">用户统计</p>
            <div class="grid grid-cols-4 text-center">
              <div>
                <p class="pt-3 text-lg font-black text-gray-800">{{ detailUser.stats.feedCount ?? 0 }}</p><p class="pb-3 text-xs text-gray-500">投喂</p>
              </div>
              <div>
                <p class="pt-3 text-lg font-black text-gray-800">{{ detailUser.stats.foundNewCatCount ?? detailUser.stats.found ?? 0 }}</p><p class="pb-3 text-xs text-gray-500">发现</p>
              </div>
              <div>
                <p class="pt-3 text-lg font-black text-gray-800">{{ detailUser.stats.momentCount ?? 0 }}</p><p class="pb-3 text-xs text-gray-500">动态</p>
              </div>
              <div>
                <p class="pt-3 text-lg font-black text-gray-800">{{ detailUser.stats.receivedLikes ?? 0 }}</p><p class="pb-3 text-xs text-gray-500">获赞</p>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="py-8 text-center text-gray-500">暂无数据</div>
      </div>
      <DialogFooter class="admin-dialog-footer border-t-2 border-black bg-[#F3F4F6] px-6 py-4"><Button class="admin-secondary-action border-2 border-black bg-white font-bold text-black hover:bg-[#FACC15]" @click="detailOpen = false">关闭</Button></DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- 封禁/解封确认对话框 -->
  <ConfirmDialog
    v-model:open="banDialogOpen"
    :title="isBanned(banTargetUser?.status) ? '解封用户' : '封禁用户'"
    :description="`确认${isBanned(banTargetUser?.status) ? '解封' : '封禁'}用户「${banTargetUser?.name || '该用户'}」吗？`"
    :confirm-text="isBanned(banTargetUser?.status) ? '解封' : '封禁'"
    :variant="isBanned(banTargetUser?.status) ? 'default' : 'danger'"
    @confirm="confirmToggleBan"
  />
</template>
