import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminUserApi } from '@pc/lib/api'
import { CampusMap, type AdminUserDetail } from '@pc/types'
import { Avatar, AvatarImage, AvatarFallback } from '@pc/components/ui/avatar'
import { Badge } from '@pc/components/ui/badge'
import { Button } from '@pc/components/ui/button'
import { AdminPageHeader } from '@pc/components/admin/AdminPageHeader'
import { AdminPanel } from '@pc/components/admin/AdminPanel'
import { ArrowLeft, Loader2, UserRound } from 'lucide-react'
import { toast } from '@pc/lib/toast'

const statusText = (status: unknown) => {
  if (status === null || status === undefined || status === '') return '正常'
  if (status === 0 || status === '0' || status === 'NORMAL' || status === 'ACTIVE') return '正常'
  if (status === 1 || status === '1' || status === 'BANNED') return '已封禁'
  return String(status)
}

const roleText = (detail: AdminUserDetail) => {
  const role = detail.permission ?? detail.role ?? detail.roleName
  if (role === 0 || role === '0') return '普通用户'
  if (role === 1 || role === '1') return '管理员'

  const normalized = String(role || '').trim().toUpperCase()
  if (normalized === 'ADMIN' || normalized === 'ADMINISTRATOR' || normalized.includes('管理员')) return '管理员'
  if (normalized === 'USER' || normalized === 'MEMBER' || normalized.includes('普通用户')) return '普通用户'
  return normalized || '未知'
}

export function DesktopLayout() {
  const { id } = useParams()
  const router = useNavigate()
  const [user, setUser] = useState<AdminUserDetail | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchDetail = async () => {
    if (!id) return
    setLoading(true)
    try {
      setUser(await adminUserApi.getUserDetail(id))
    } catch (error) {
      console.error('Failed to fetch user detail', error)
      toast.error('获取用户详情失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchDetail()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 意图为仅挂载执行 / 模拟 Vue watch
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader eyebrow="USER DIRECTORY" title="用户详情" description="查看账户资料、校园归属与社区贡献。" icon={UserRound} tone="yellow"
        action={<Button variant="outline" className="admin-secondary-action border-2 border-black bg-white font-bold hover:bg-[#FACC15]" onClick={() => router(-1)}><ArrowLeft className="size-4" />返回</Button>}
      />

      <AdminPanel title="基础信息" meta={user ? `用户 ID：${user.id}` : '加载中'}>
        {loading ? (
          <div className="flex min-h-56 items-center justify-center"><Loader2 className="size-6 animate-spin text-gray-500" /></div>
        ) : user ? (
          <div className="p-5">
            <div className="flex flex-col gap-5 border-b-2 border-black pb-5 sm:flex-row sm:items-center">
              <Avatar className="admin-data-avatar size-20 border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)]">{user.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}<AvatarFallback className="bg-[#FACC15] text-2xl font-black text-black">{user.name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1"><p className="truncate text-2xl font-black text-gray-900">{user.name}</p>{user.nickname && user.nickname !== user.name ? <p className="mt-1 text-sm text-gray-600">{user.nickname}</p> : null}<p className="mt-1 text-sm text-gray-500">用户 ID：{user.id}</p></div>
              <div className="flex flex-wrap gap-2"><Badge variant="outline" className="border-2 border-black bg-[#F3F4F6] text-black">{roleText(user)}</Badge><Badge variant="outline" className="border-2 border-black bg-[#FACC15] text-black">Lv.{user.level ?? '-'}</Badge><Badge variant="outline" className={statusText(user.status) === '已封禁' ? 'border-2 border-red-700 bg-red-50 text-red-800' : 'border-2 border-black bg-[#DDF8F2] text-black'}>{statusText(user.status)}</Badge></div>
            </div>
            <dl className="mt-5 grid border-2 border-black text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div className="border-b-2 border-black p-3 sm:border-r-2 lg:border-b-0"><dt className="font-bold text-gray-500">学号</dt><dd className="mt-1 font-bold text-gray-900">{user.sid || user.studentId || '未提供'}</dd></div>
              <div className="border-b-2 border-black p-3 lg:border-b-0 lg:border-r-2"><dt className="font-bold text-gray-500">校区</dt><dd className="mt-1 font-bold text-gray-900">{user.campus !== undefined ? CampusMap[Number(user.campus)] || '未知' : '未知'}</dd></div>
              <div className="border-b-2 border-black bg-[#FFF8DE] p-3 sm:border-r-2 lg:border-b-0 lg:border-r-0"><dt className="font-bold text-gray-500">小鱼干</dt><dd className="mt-1 font-bold text-gray-900">{user.currency ?? '-'}</dd></div>
              <div className="border-b-2 border-black p-3 sm:border-b-0 sm:border-r-2"><dt className="font-bold text-gray-500">联系方式</dt><dd className="mt-1 break-all font-bold text-gray-900">{user.phone || user.wechat || '未提供'}</dd></div>
              <div className="border-b-2 border-black p-3 sm:border-b-0 lg:border-r-2"><dt className="font-bold text-gray-500">创建时间</dt><dd className="mt-1 font-bold text-gray-900">{user.createTime || '-'}</dd></div>
              <div className="bg-[#F3F4F6] p-3"><dt className="font-bold text-gray-500">最近登录</dt><dd className="mt-1 font-bold text-gray-900">{user.lastLoginTime || '-'}</dd></div>
            </dl>
          </div>
        ) : (
          <div className="p-10 text-center text-gray-500">暂无用户信息</div>
        )}
      </AdminPanel>

      {user?.stats ? (
        <AdminPanel title="社区统计" meta="累计贡献">
          <div className="grid grid-cols-2 divide-x-2 divide-y-2 divide-black border-t-0 text-center sm:grid-cols-4 sm:divide-y-0"><div className="p-5"><p className="text-3xl font-black">{user.stats.feedCount ?? 0}</p><p className="mt-1 text-sm text-gray-600">投喂次数</p></div><div className="p-5"><p className="text-3xl font-black">{user.stats.foundNewCatCount ?? user.stats.found ?? 0}</p><p className="mt-1 text-sm text-gray-600">发现新猫</p></div><div className="p-5"><p className="text-3xl font-black">{user.stats.receivedLikes ?? 0}</p><p className="mt-1 text-sm text-gray-600">收到点赞</p></div><div className="p-5"><p className="text-3xl font-black">{user.stats.momentCount ?? 0}</p><p className="mt-1 text-sm text-gray-600">发布动态</p></div></div>
        </AdminPanel>
      ) : null}
    </div>
  )
}
