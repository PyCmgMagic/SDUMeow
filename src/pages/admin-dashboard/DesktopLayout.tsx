import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import { useUserStore } from '@pc/stores/user'
import { statsApi, userApi } from '@pc/lib/api'
import { CampusMap, type AdminDashboardStats } from '@pc/types'
import { cn } from '@pc/lib/utils'
import { Button } from '@pc/components/ui/button'
import { Input } from '@pc/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@pc/components/ui/dialog'
import { ConfirmDialog } from '@pc/components/ui/confirm-dialog'
import { AdminPageHeader } from '@pc/components/admin/AdminPageHeader'
import { AdminPanel } from '@pc/components/admin/AdminPanel'
import { toast } from '@pc/lib/toast'

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

export function DesktopLayout() {
  const router = useNavigate()
  // 用户中心相关逻辑
  const logout = useUserStore((state) => state.logout)
  const adminLogout = useUserStore((state) => state.adminLogout)
  const logoutAll = useUserStore((state) => state.logoutAll)

  // 登出确认弹窗
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const handleLogout = () => {
    setIsLogoutDialogOpen(true)
  }
  const handleReturnToUser = () => {
    // Legacy admin logins stored their token in the user slot. Drop only that
    // incompatible session; an SSO user with admin permission keeps its login.
    if (!useUserStore.getState().adminToken && !useUserStore.getState().userInfo) logout()
    router('/')
  }
  const confirmLogout = () => {
    setIsLogoutDialogOpen(false)
    adminLogout()
    router('/admin/login')
  }

  // 修改密码弹窗相关
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const resetPasswordForm = () => {
    setPasswordForm({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    setShowOldPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
  }
  const handleChangePassword = async () => {
    const { oldPassword, newPassword, confirmPassword } = passwordForm
    if (!oldPassword) return toast.warning('请输入原密码')
    if (!newPassword) return toast.warning('请输入新密码')
    if (newPassword.length < 6) return toast.warning('新密码至少6位')
    if (newPassword !== confirmPassword) return toast.warning('两次密码输入不一致')
    if (oldPassword === newPassword) return toast.warning('新密码不能与原密码相同')
    setPasswordLoading(true)
    try {
      await userApi.changePassword({
        oldPassword,
        newPassword,
        confirmPassword
      }, 'admin')
      setIsPasswordDialogOpen(false)
      resetPasswordForm()
      logoutAll()
      toast.success('修改密码成功，请重新登录')
      router('/login')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '密码修改失败')
    } finally {
      setPasswordLoading(false)
    }
  }

  // 统计数据
  const [dashboardStats, setDashboardStats] = useState<AdminDashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState('')
  const coveredCampusCount = dashboardStats?.campusDistribution.filter((item) => item.count > 0).length || 0
  const primaryCampus = (() => {
    const first = [...(dashboardStats?.campusDistribution || [])].sort((a, b) => b.count - a.count)[0]
    if (!first) return '暂无校区数据'
    return `${CampusMap[first.campus] || `校区 #${first.campus}`} ${first.percentage}%`
  })()

  // 统计卡片数据
  const stats = [
    { label: '登记猫咪', value: String(dashboardStats?.totalCats || 0), icon: Cat },
    { label: '待审领养', value: String(dashboardStats?.adoptApplications || 0), icon: Heart },
    { label: '待处理 SOS', value: String(dashboardStats?.pendingSOS || 0), icon: LifeBuoy },
    { label: '覆盖校区', value: String(coveredCampusCount), icon: MapPin },
  ]

  // 加载数据
  const fetchStats = async () => {
    setStatsLoading(true)
    setStatsError('')
    try {
      setDashboardStats(await statsApi.getAdminDashboardStats())
    } catch (error) {
      console.error('获取统计数据失败', error)
      setStatsError(error instanceof Error ? error.message : '仪表盘统计加载失败')
    } finally {
      setStatsLoading(false)
    }
  }

  // 页面挂载和激活时刷新数据
  useEffect(() => {
    void fetchStats()
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader eyebrow="ADMIN OVERVIEW" title="管理工作台" description="汇总待处理事务并进入核心管理流程。" icon={LayoutDashboard} tone="mint"
        action={
          <>
            <Button variant="outline" className="admin-secondary-action border-2 border-black bg-white font-bold hover:bg-[#DDF8F2]" onClick={handleReturnToUser}><House className="size-4" />返回用户端</Button>
            <Button className="admin-primary-action border-2 border-black bg-[#5CD6C2] font-bold text-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-[#48C4B1]" onClick={() => setIsPasswordDialogOpen(true)}><Lock className="size-4" />修改密码</Button>
            <Button variant="outline" className="admin-secondary-action border-2 border-black bg-white font-bold hover:bg-[#FACC15]" onClick={handleLogout}><LogOut className="size-4" />退出登录</Button>
          </>
        }
      />

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="admin-dashboard-hero flex min-h-56 flex-col justify-between border-2 border-black bg-[#5CD6C2] p-6 shadow-[5px_5px_0px_rgba(0,0,0,1)] lg:col-span-2">
          <div><p className="text-sm font-bold text-gray-700">TODAY'S QUEUE</p><h2 className="mt-2 text-2xl font-black text-black">待处理事项</h2><p className="mt-3 text-base text-gray-800">目前有 <strong>{dashboardStats?.adoptApplications || 0}</strong> 个领养申请及 <strong>{dashboardStats?.pendingSOS || 0}</strong> 个 SOS 待处理。</p></div>
          <Link to="/admin/adoptions" className="mt-6"><Button className="admin-dashboard-hero-action border-2 border-black bg-black font-bold text-white hover:bg-gray-800">进入审核中心<ArrowRight className="size-4" /></Button></Link>
        </div>
        <div className="admin-dashboard-highlight flex min-h-56 flex-col justify-between border-2 border-black bg-[#FACC15] p-6 shadow-[5px_5px_0px_rgba(0,0,0,1)]">
          <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-gray-700">登记猫咪总数</p><p className="mt-2 text-6xl font-black">{dashboardStats?.totalCats || 0}</p></div><span className="flex size-11 items-center justify-center border-2 border-black bg-white"><TrendingUp className="size-5" /></span></div>
          <p className="mt-6 text-sm font-bold text-gray-700">数量最多校区：<span className="text-black">{primaryCampus}</span></p>
        </div>
      </section>

      {statsLoading ? (
        <div className="border-2 border-black bg-white px-4 py-3 text-sm text-gray-600">正在加载仪表盘数据...</div>
      ) : statsError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-800"><span>{statsError}</span><Button variant="outline" size="sm" className="border-red-700 bg-white text-red-800 hover:bg-red-100" onClick={() => void fetchStats()}>重新加载</Button></div>
      ) : null}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="admin-dashboard-stat border-2 border-black bg-white p-5 shadow-[4px_4px_0px_rgba(0,0,0,1)]"><div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-gray-600">{stat.label}</span><stat.icon className="size-5" /></div><p className="mt-5 text-4xl font-black">{stat.value}</p></div>
        ))}
      </section>

      <AdminPanel title="工作台" meta="常用入口">
        <div className="admin-dashboard-workbench grid gap-px bg-black md:grid-cols-2">
          {manageCards.map((card) => (
            <Link key={card.title} to={card.path} className="admin-dashboard-workbench-card group flex min-h-48 flex-col bg-white p-6 hover:bg-[#FFF8DE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset">
              <span className={cn(card.bg, 'admin-dashboard-workbench-icon flex size-12 items-center justify-center border-2 border-black')}><card.icon className="size-6" /></span><h3 className="mt-5 text-lg font-black">{card.title}</h3><p className="mt-2 flex-1 text-sm text-gray-600">{card.desc}</p><span className="mt-6 flex items-center gap-2 text-sm font-bold">{card.action}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </AdminPanel>

      <Dialog open={isPasswordDialogOpen} onOpenChange={(open) => { setIsPasswordDialogOpen(open); if (!open) resetPasswordForm() }}>
        <DialogContent className="admin-dialog border-2 border-black p-0 sm:max-w-[430px]"><DialogHeader className="admin-dialog-header border-b-2 border-black bg-[#FFF8DE] px-6 py-5 pr-14"><DialogTitle className="text-xl font-black">修改密码</DialogTitle><DialogDescription>验证原密码后设置新的管理员登录密码。</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-4 px-6 py-5">
            {[{ key: 'oldPassword', label: '原密码', placeholder: '请输入原密码', visible: showOldPassword }, { key: 'newPassword', label: '新密码', placeholder: '至少 6 位', visible: showNewPassword }, { key: 'confirmPassword', label: '确认新密码', placeholder: '请再次输入新密码', visible: showConfirmPassword }].map((field) => (
              <div key={field.key} className="space-y-2"><label className="text-sm font-bold text-gray-900">{field.label}</label><div className="relative"><Input value={passwordForm[field.key as keyof typeof passwordForm]} type={field.visible ? 'text' : 'password'} placeholder={field.placeholder} className="border-2 border-black pr-11 focus-visible:ring-[#FACC15]" onChange={(event) => setPasswordForm((prev) => ({ ...prev, [field.key]: event.target.value }))} /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black" aria-label={field.visible ? `隐藏${field.label}` : `显示${field.label}`} onClick={() => field.key === 'oldPassword' ? setShowOldPassword(!showOldPassword) : field.key === 'newPassword' ? setShowNewPassword(!showNewPassword) : setShowConfirmPassword(!showConfirmPassword)}>{field.visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
            ))}
          </div>
          <DialogFooter className="admin-dialog-footer border-t-2 border-black bg-[#F3F4F6] px-6 py-4"><Button variant="outline" className="border-2 border-black bg-white font-bold" disabled={passwordLoading} onClick={() => setIsPasswordDialogOpen(false)}>取消</Button><Button className="admin-primary-action border-2 border-black bg-[#5CD6C2] font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:bg-[#48C4B1]" disabled={passwordLoading} onClick={() => void handleChangePassword()}>{passwordLoading ? '提交中...' : '确认修改'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen} title="退出登录" description="确定要退出当前账号吗？" confirmText="退出" variant="warning" onConfirm={confirmLogout} />
    </div>
  )
}
