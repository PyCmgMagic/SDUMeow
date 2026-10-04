import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'

import { adminUserApi } from '@pc/lib/api'
import { toast } from '@pc/lib/toast'
import { CampusMap, type AdminUserItem, type AdminUserDetail } from '@pc/types'
import { Button } from '@pc/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@pc/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@pc/components/ui/pagination'
import { Avatar, AvatarImage, AvatarFallback } from '@pc/components/ui/avatar'
import { Badge } from '@pc/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@pc/components/ui/dialog'
import { ConfirmDialog } from '@pc/components/ui/confirm-dialog'
import { AdminPageHeader } from '@pc/components/admin/AdminPageHeader'
import { AdminPanel } from '@pc/components/admin/AdminPanel'

const statusText = (status: unknown) => {
  if (status === null || status === undefined || status === '') return '正常'
  if (status === 0 || status === '0' || status === 'NORMAL' || status === 'ACTIVE') return '正常'
  if (status === 1 || status === '1' || status === 'BANNED') return '已封禁'
  return String(status)
}

const isBanned = (status: unknown) =>
  status === 1 || status === '1' || String(status).toUpperCase() === 'BANNED'

const roleText = (user: AdminUserItem | AdminUserDetail) => {
  const role = (user as AdminUserItem).permission ?? (user as AdminUserItem).role ?? user.roleName
  if (role === 0 || role === '0') return '普通用户'
  if (role === 1 || role === '1') return '管理员'

  const normalized = String(role || '').trim().toUpperCase()
  if (normalized === 'ADMIN' || normalized === 'ADMINISTRATOR' || normalized.includes('管理员')) return '管理员'
  if (normalized === 'USER' || normalized === 'MEMBER' || normalized.includes('普通用户')) return '普通用户'
  return normalized || '未知'
}

const isAdministrator = (user: AdminUserItem | AdminUserDetail) => roleText(user) === '管理员'

const needsDetail = (user: AdminUserItem) => (
  !user.avatar
  || (!user.sid && !user.studentId)
  || user.level === undefined
  || (user.permission === null || user.permission === undefined || user.permission === '')
  && (user.role === null || user.role === undefined || user.role === '')
  && (user.roleName === null || user.roleName === undefined || user.roleName === '')
)

const DETAIL_CONCURRENCY = 3
const PAGE_SIZE = 10 // 每页显示数量

export function DesktopLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  // 状态定义
  const [loading, setLoading] = useState(false)
  const [userList, setUserList] = useState<AdminUserItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailUser, setDetailUser] = useState<AdminUserDetail | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)

  // 封禁确认弹窗
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [banTargetUser, setBanTargetUser] = useState<AdminUserItem | null>(null)
  const latestRequestIdRef = useRef(0)

  const queryPage = new URLSearchParams(location.search).get('page')
  const querySearch = new URLSearchParams(location.search).get('search')
  const searchTerm = querySearch !== null ? querySearch.trim() : ''
  const currentPage = (() => {
    const value = Number.parseInt(String(queryPage || '1'), 10)
    return Number.isInteger(value) && value > 0 ? value : 1
  })()

  const withQuery = (mutations: (search: URLSearchParams) => void) => {
    const next = new URLSearchParams(location.search)
    mutations(next)
    const queryString = next.toString()
    return queryString ? `${location.pathname}?${queryString}` : location.pathname
  }

  const setPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return
    navigate(withQuery((search) => search.set('page', String(page))))
  }

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
          if (requestId !== latestRequestIdRef.current) return

          setUserList((current) => {
            const currentUser = current[task.index]
            if (currentUser?.id === task.user.id) {
              const next = [...current]
              next[task.index] = { ...currentUser, ...detail }
              return next
            }
            return current
          })
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
    const requestId = ++latestRequestIdRef.current
    setLoading(true)
    try {
      const res = await adminUserApi.getUserList({
        page: currentPage,
        size: PAGE_SIZE,
        ...(searchTerm ? { search: searchTerm } : {}),
      })
      if (requestId !== latestRequestIdRef.current) return
      const items = res.items || []
      setUserList(items)
      const resolvedTotal = Number(res.total ?? items.length)
      setTotal(resolvedTotal)
      const responsePages = Number(res.pages)
      const resolvedPages = Number.isFinite(responsePages) && responsePages > 0
        ? responsePages
        : Math.max(Math.ceil(resolvedTotal / PAGE_SIZE), 1)
      setTotalPages(resolvedPages)
      if (resolvedTotal > 0 && currentPage > resolvedPages) {
        navigate(
          withQuery((search) => search.set('page', String(resolvedPages))),
          { replace: true },
        )
        return
      }
      hydrateVisibleUserDetails(items, requestId)
    } catch (error) {
      if (requestId !== latestRequestIdRef.current) return
      console.error('Failed to fetch user list:', error)
      setUserList([])
      setTotal(0)
      setTotalPages(1)
      toast.error('获取用户列表失败，请重试')
    } finally {
      if (requestId === latestRequestIdRef.current) setLoading(false)
    }
  }

  // 分页页码列表
  const paginationPages: Array<number | 'ellipsis'> = (() => {
    const pages: Array<number | 'ellipsis'> = []
    const totalPageCount = totalPages
    const current = currentPage

    if (totalPageCount <= 7) {
      for (let i = 1; i <= totalPageCount; i++) pages.push(i)
    } else {
      pages.push(1)
      if (current > 4) pages.push('ellipsis')
      const start = Math.max(2, current - 1)
      const end = Math.min(totalPageCount - 1, current + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (current < totalPageCount - 3) pages.push('ellipsis')
      pages.push(totalPageCount)
    }
    return pages
  })()

  useEffect(() => {
    void fetchUserList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm])

  // 查看详情（弹窗）
  const handleViewDetail = async (userId: string | number) => {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailUser(null)
    try {
      setDetailUser(await adminUserApi.getUserDetail(userId))
    } catch {
      toast.error('获取用户详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  // 封禁/解封用户
  const handleToggleBan = (user: AdminUserItem) => {
    if (actionLoadingId !== null) return
    setBanTargetUser(user)
    setBanDialogOpen(true)
  }

  const confirmToggleBan = async () => {
    const user = banTargetUser
    if (!user) return

    const actionText = isBanned(user.status) ? '解封' : '封禁'

    setBanDialogOpen(false)
    setActionLoadingId(Number(user.id))
    try {
      await adminUserApi.toggleBan(user.id)
      toast.success(`${actionText}成功`)
      await fetchUserList()
    } catch {
      toast.error(`${actionText}失败`)
    } finally {
      setActionLoadingId(null)
      setBanTargetUser(null)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <AdminPageHeader eyebrow="USER DIRECTORY" title="用户管理" description="查看账户信息并管理用户状态。" icon={Users} tone="yellow" />

        <AdminPanel title="用户列表" meta={`共 ${total} 位用户`}>
          <div>
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                加载中...
              </div>
            ) : userList.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                暂无用户数据
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="admin-data-table-header bg-[#FFF8DE]">
                    <TableRow className="border-b-2 border-black hover:bg-[#FFF8DE]">
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
                    {userList.map((user) => (
                      <TableRow key={user.id} className="admin-data-table-row border-b border-gray-200 hover:bg-[#FFF8DE]">
                        <TableCell>
                          <span className="text-sm text-gray-700">#{user.id}</span>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="admin-data-avatar w-8 h-8 border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                              {user.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : undefined}
                              <AvatarFallback>{(user.name || 'U').charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="inline-flex border-2 border-black bg-[#F3F4F6] px-2 py-1 text-sm font-bold text-gray-800">{roleText(user)}</span>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm text-gray-700">{user.sid || user.studentId || '未提供'}</span>
                        </TableCell>

                        <TableCell>
                          <span className="inline-flex border-2 border-black bg-[#FACC15] px-2 py-1 text-sm font-bold text-black">Lv.{user.level ?? user.levelTitle ?? '-'}</span>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className={isBanned(user.status) ? 'border-2 border-red-700 bg-red-50 text-red-800' : 'border-2 border-black bg-[#DDF8F2] text-black'}>{statusText(user.status)}</Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" variant="outline" disabled={loading} onClick={() => handleViewDetail(user.id)}
                              className="border-2 border-black bg-white font-bold hover:bg-[#FACC15]">
                              查看详情
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={loading || actionLoadingId === Number(user.id) || isAdministrator(user)}
                              onClick={() => handleToggleBan(user)}
                              className={isBanned(user.status) ? 'border-2 border-black bg-[#5CD6C2] font-bold text-black hover:bg-[#48C4B1]' : 'border-2 border-red-700 bg-white font-bold text-red-800 hover:bg-red-50'}
                            >
                              {isBanned(user.status) ? '解封' : '封禁'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </AdminPanel>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="admin-page-number-pagination mt-6 flex justify-center">
            <Pagination total={total} itemsPerPage={PAGE_SIZE} page={currentPage}>
              <PaginationContent className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {paginationPages.map((page, index) => (
                  page === 'ellipsis' ? (
                    <PaginationItem key={`page-${page}-${index}`} value={index}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={`page-${page}-${index}`} value={page}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-9 w-9 border-2 border-black ${currentPage === page ? 'bg-[#FACC15] text-black hover:bg-[#EAB308]' : 'bg-white hover:bg-[#FFF8DE]'}`}
                        onClick={() => setPage(page)}
                      >
                        {page}
                      </Button>
                    </PaginationItem>
                  )
                ))}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* 详情弹窗 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="admin-dialog max-w-lg overflow-hidden border-2 border-black p-0">
          <DialogHeader className="admin-dialog-header border-b-2 border-black bg-[#FFF8DE] px-6 py-5 pr-14"><DialogTitle className="text-xl font-black">用户详情</DialogTitle><DialogDescription>查看该用户的账户信息、状态与校园资料。</DialogDescription></DialogHeader>
          <div className="px-6 py-5">
            {detailLoading ? (
              <div className="grid grid-cols-2 gap-3 animate-pulse">{Array.from({ length: 4 }, (_, item) => <div key={item} className="h-16 border-2 border-gray-300 bg-gray-100"></div>)}</div>
            ) : detailUser ? (
              <div>
                <div className="flex items-center gap-4 border-b-2 border-black pb-5">
                  <Avatar className="size-16 border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]">
                    {detailUser.avatar ? <AvatarImage src={detailUser.avatar} alt={detailUser.name} /> : undefined}
                    <AvatarFallback className="bg-[#FACC15] text-xl font-black text-black">
                      {detailUser.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xl font-black text-gray-900">{detailUser.name}</p>
                    {detailUser.nickname ? <p className="text-sm text-gray-500">{detailUser.nickname}</p> : null}
                    <p className="text-xs text-gray-400 mt-0.5">ID: {detailUser.id}</p>
                  </div>
                </div>

                <div className="my-5 flex flex-wrap gap-2">
                  <Badge className={isAdministrator(detailUser) ? 'border-2 border-black bg-[#F3F4F6] text-black' : 'border-2 border-black bg-white text-black'} variant="outline">
                    {roleText(detailUser)}
                  </Badge>
                  <Badge variant="outline" className="border-2 border-black bg-[#FACC15] text-black">
                    Lv.{detailUser.level ?? 1} {detailUser.levelTitle || ''}
                  </Badge>
                  <Badge className={isBanned(detailUser.status) ? 'border-2 border-red-700 bg-red-50 text-red-800' : 'border-2 border-black bg-[#DDF8F2] text-black'} variant="outline">
                    {statusText(detailUser.status)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 border-2 border-black text-sm">
                  <div className="border-b-2 border-r-2 border-black p-3"><p className="text-xs font-bold text-gray-500">学号</p><p className="mt-1 font-bold text-gray-900">{detailUser.sid || detailUser.studentId || '未绑定'}</p></div>
                  <div className="border-b-2 border-black p-3"><p className="text-xs font-bold text-gray-500">校区</p><p className="mt-1 font-bold text-gray-900">{detailUser.campus !== undefined ? CampusMap[Number(detailUser.campus)] || '未知' : '未知'}</p></div>
                  <div className="border-r-2 border-black bg-[#FFF8DE] p-3"><p className="text-xs font-bold text-gray-500">小鱼干</p><p className="mt-1 font-bold text-gray-900">{detailUser.currency ?? 0}</p></div>
                  <div className="bg-[#F3F4F6] p-3"><p className="text-xs font-bold text-gray-500">经验值</p><p className="mt-1 font-bold text-gray-900">{detailUser.exp ?? 0} / {detailUser.nextExp ?? '-'}</p></div>
                </div>
                {detailUser.stats ? (
                  <div className="mt-5 border-2 border-black">
                    <p className="border-b-2 border-black bg-[#FFF8DE] px-3 py-2 text-sm font-black">用户统计</p>
                    <div className="grid grid-cols-4 text-center">
                      <div>
                        <p className="pt-3 text-lg font-black text-gray-800">{detailUser.stats.feedCount ?? 0}</p><p className="pb-3 text-xs text-gray-500">投喂</p>
                      </div>
                      <div>
                        <p className="pt-3 text-lg font-black text-gray-800">{detailUser.stats.foundNewCatCount ?? detailUser.stats.found ?? 0}</p><p className="pb-3 text-xs text-gray-500">发现</p>
                      </div>
                      <div>
                        <p className="pt-3 text-lg font-black text-gray-800">{detailUser.stats.momentCount ?? 0}</p><p className="pb-3 text-xs text-gray-500">动态</p>
                      </div>
                      <div>
                        <p className="pt-3 text-lg font-black text-gray-800">{detailUser.stats.receivedLikes ?? 0}</p><p className="pb-3 text-xs text-gray-500">获赞</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">暂无数据</div>
            )}
          </div>
          <DialogFooter className="admin-dialog-footer border-t-2 border-black bg-[#F3F4F6] px-6 py-4"><Button className="admin-secondary-action border-2 border-black bg-white font-bold text-black hover:bg-[#FACC15]" onClick={() => setDetailOpen(false)}>关闭</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 封禁/解封确认对话框 */}
      <ConfirmDialog
        open={banDialogOpen}
        onOpenChange={setBanDialogOpen}
        title={isBanned(banTargetUser?.status) ? '解封用户' : '封禁用户'}
        description={`确认${isBanned(banTargetUser?.status) ? '解封' : '封禁'}用户「${banTargetUser?.name || '该用户'}」吗？`}
        confirmText={isBanned(banTargetUser?.status) ? '解封' : '封禁'}
        variant={isBanned(banTargetUser?.status) ? 'default' : 'danger'}
        onConfirm={confirmToggleBan}
      />
    </>
  )
}
