import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserStore } from '@pc/stores/user';
import { adoptionApi, badgeApi, sosApi, userApi } from '@pc/lib/api';
import { hasBadgeEntries, normalizeBadges } from '@pc/lib/badges';
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
} from '@pc/types';
import { Badge } from '@pc/components/ui/badge';
import { Button } from '@pc/components/ui/button';
import { Input } from '@pc/components/ui/input';
import { CampusMap } from '@pc/types';
import { BadgeShowcase } from '@pc/components/BadgeShowcase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@pc/components/ui/dialog';
import { ConfirmDialog } from '@pc/components/ui/confirm-dialog';
import { toast } from '@pc/lib/toast';
import { cn } from '@pc/lib/utils';

import forkIcon from '@pc/assets/icons/fork.svg';
import foundIcon from '@pc/assets/icons/found.svg';
import likeIcon from '@pc/assets/icons/like.svg';
import paperIcon from '@pc/assets/icons/paper.svg';
import cameraIcon from '@pc/assets/icons/camera.svg';
import fishIcon from '@pc/assets/icons/fish.svg';
import { Crown, LogOut, Pencil, Lock, Mail, Eye, EyeOff, Siren } from 'lucide-react';

export function DesktopLayout() {
const navigate = useNavigate()
const userInfo = useUserStore((s) => s.userInfo)

// 领养申请列表
const [adoptionList, setAdoptionList] = useState<MyAdoptionItem[]>([])
const [adoptionLoading, setAdoptionLoading] = useState(false)
const [sosList, setSosList] = useState<SOSItem[]>([])
const [sosLoading, setSosLoading] = useState(false)
const [sosError, setSosError] = useState('')
const [badges, setBadges] = useState<BadgeDisplayItem[]>([])
const [badgeLoading, setBadgeLoading] = useState(false)
const [badgeError, setBadgeError] = useState('')

// 获取领养申请列表
const fetchMyAdoptions = async () => {
  setAdoptionLoading(true)
  try {
    const res = await adoptionApi.getMyAdoptions({ page: 1, size: 20 })
    setAdoptionList(res?.items || [])
  } catch (error) {
    console.error('获取领养申请失败:', error)
  } finally {
    setAdoptionLoading(false)
  }
}

const fetchMySOS = async () => {
  setSosLoading(true)
  setSosError('')
  try {
    const response = await sosApi.getMySOS({ page: 1, size: 20 })
    setSosList(response?.items || [])
  } catch (error) {
    setSosList([])
    setSosError(error instanceof Error ? error.message : 'SOS 记录加载失败')
  } finally {
    setSosLoading(false)
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
  setBadgeLoading(true)
  setBadgeError('')
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
    setBadges(normalized)
  } catch (error) {
    setBadgeError(error instanceof Error ? error.message : '徽章加载失败')
  } finally {
    setBadgeLoading(false)
  }
}

//登出确认弹窗
const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)

const handleLogout=()=>{
    setIsLogoutDialogOpen(true)
}

const confirmLogout = () => {
    setIsLogoutDialogOpen(false)
    useUserStore.getState().logout()
    navigate('/login')
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

// 邮箱绑定弹窗：验证码发送到当前登录账号对应的邮箱，绑定接口只提交密码和验证码。
const [isBindEmailDialogOpen, setIsBindEmailDialogOpen] = useState(false)
const [bindEmailForm, setBindEmailForm] = useState({ password: '', code: '' })
const [bindEmailLoading, setBindEmailLoading] = useState(false)
const [bindEmailCodeLoading, setBindEmailCodeLoading] = useState(false)
const [bindEmailCountdown, setBindEmailCountdown] = useState(0)
const bindEmailCountdownRef = useRef(0)
const bindEmailTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

const clearBindEmailTimer = () => {
  if (bindEmailTimerRef.current) {
    clearInterval(bindEmailTimerRef.current)
    bindEmailTimerRef.current = undefined
  }
}

const resetBindEmailForm = () => {
  clearBindEmailTimer()
  setBindEmailForm({ password: '', code: '' })
  bindEmailCountdownRef.current = 0
  setBindEmailCountdown(0)
}

const handleSendBindEmailCode = async () => {
  if (bindEmailCodeLoading || bindEmailCountdown > 0) return

  setBindEmailCodeLoading(true)
  try {
    await userApi.sendVerificationCodeForCurrentUser()
    toast.success('验证码已发送，请查收当前账号邮箱')
    bindEmailCountdownRef.current = 60
    setBindEmailCountdown(60)
    clearBindEmailTimer()
    bindEmailTimerRef.current = setInterval(() => {
      if (bindEmailCountdownRef.current <= 1) {
        bindEmailCountdownRef.current = 0
        setBindEmailCountdown(0)
        clearBindEmailTimer()
      } else {
        bindEmailCountdownRef.current -= 1
        setBindEmailCountdown(bindEmailCountdownRef.current)
      }
    }, 1000)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '验证码发送失败，请稍后再试')
  } finally {
    setBindEmailCodeLoading(false)
  }
}

const handleBindEmail = async () => {
  const password = bindEmailForm.password.trim()
  const code = bindEmailForm.code.trim()
  if (!password) return toast.warning('请输入当前登录密码')
  if (!code) return toast.warning('请输入邮箱验证码')

  setBindEmailLoading(true)
  try {
    await userApi.bindEmail({ password, code })
    await useUserStore.getState().fetchUserInfo()
    setIsBindEmailDialogOpen(false)
    resetBindEmailForm()
    toast.success('邮箱绑定成功')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '邮箱绑定失败，请检查密码和验证码')
  } finally {
    setBindEmailLoading(false)
  }
}

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
    })
    setIsPasswordDialogOpen(false)
    resetPasswordForm()
    // 登出并跳转到登录页
    useUserStore.getState().logout()
    toast.success('修改密码成功，请重新登录')
    navigate('/login')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '密码修改失败')
  } finally {
    setPasswordLoading(false)
  }
}

//初始化数据 + onBeforeUnmount(clearBindEmailTimer)
useEffect(() => {
  if (useUserStore.getState().token) {
    void useUserStore.getState().fetchUserInfo()
    void fetchMyAdoptions()
    void fetchMySOS()
    void fetchBadges()
  }
  return clearBindEmailTimer
}, [])

//校区计算属性
const campusName = (() => {
  const info = userInfo
  // 如果没登录/没数据，或者是 undefined，返回默认值
  if (!info || info.campus === undefined) {
    return '未知校区'
  }
  //  查表，如果查不到，也显示未知
  const idx = typeof info.campus === 'number' ? info.campus : Number(info.campus)
  if (Number.isNaN(idx)) return '未知校区'
  return CampusMap[idx] || '未知校区'
})()

const user = userInfo
const currentExperience = Math.max(user?.exp ?? 0, 0)
const levelExperience = Math.max(user?.nextExp ?? 0, 0)
const experiencePercentage = levelExperience
  ? Math.min(Math.max((currentExperience / levelExperience) * 100, 0), 100)
  : 0

  return (
    <div className="public-page flex min-h-full flex-col gap-5 p-4 sm:p-6">

      {/* 1. 顶部个人信息卡片 (橙色背景) */}

      <section className="public-profile-hero relative flex w-full flex-col gap-5 overflow-hidden p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">

        {/* 左侧：头像与信息 */}
        <div className="z-10 flex min-w-0 items-center gap-4 sm:gap-6">
          {/* 头像外圈 */}
          <div className="w-20 h-20 rounded-full border-4 border-white/30 overflow-hidden bg-white">
            <img
              src={user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-wide">{user?.nickname || '爱吃鱼的猫'}</h1>
            <p className="text-white/90 text-sm font-medium">{campusName || '未知校区'}</p>

            {/* 等级胶囊 */}
            <div className="mt-1 inline-flex w-fit items-center rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
              <Crown className="mr-1 size-3.5" />
              Lv.{user?.level || 1} {user?.title || '新晋铲屎官'}
            </div>
          </div>
        </div>

        {/* 右侧：编辑按钮 */}
        <Button
          className="public-profile-action z-10 self-start border-none bg-white px-6 py-2 font-bold shadow-sm hover:bg-white/90 sm:self-auto"
          onClick={() => navigate('/me/edit')}
        >
          <Pencil className="w-4 h-4" />
          编辑资料
        </Button>
      </section>

      {/* 等级经验 */}
      <section className="public-card p-5 sm:p-6" aria-labelledby="experience-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400">成长进度</p>
            <h2 id="experience-title" className="mt-1 text-lg font-bold text-gray-900">Lv.{user?.level || 1} {user?.title || '新晋铲屎官'}</h2>
          </div>
          <p className="text-sm font-semibold text-gray-600">已有经验：{currentExperience} / {levelExperience || '-'}</p>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={experiencePercentage} aria-valuemin={0} aria-valuemax={100} aria-label="等级经验进度">
          <div className="h-full rounded-full bg-[#5CD6C2] transition-[width]" style={{ width: `${experiencePercentage}%` }} />
        </div>
        <p className="mt-2 text-xs text-gray-400">当前等级升级进度 {Math.round(experiencePercentage)}%</p>
      </section>

      {/* 2. 数据统计  */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* 卡片 1: 累计投喂 */}
        <div className="public-card flex flex-col gap-4 p-5">
          {/* 图标容器 */}
          <div className="w-10 h-10 bg-blue-100 text-blue-500 rounded-lg flex items-center justify-center">
            <img src={forkIcon} className="w-5 h-5" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-gray-900">{user?.stats.feedCount  }</div>
            <div className="text-xs text-gray-400 mt-1">累计投喂</div>
          </div>
        </div>

        {/* 卡片 2: 发现新猫 */}
        <Link
          to="/new-cat"
          className="public-card flex flex-col gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-green-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="w-10 h-10 bg-green-100 text-green-500 rounded-lg flex items-center justify-center">
            <img src={foundIcon} className="w-5 h-5" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-gray-900">{user?.stats.found }</div>
            <div className="text-xs text-gray-400 mt-1">发现新猫 · 提交线索</div>
          </div>
        </Link>

        {/* 卡片 3: 获赞认可 */}
        <div className="public-card flex flex-col gap-4 p-5">
          <div className="w-10 h-10 bg-orange-100 text-orange-500 rounded-lg flex items-center justify-center">
            <img src={likeIcon} className="w-5 h-5" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-gray-900">{user?.stats.receivedLikes  }</div>
            <div className="text-xs text-gray-400 mt-1">获赞认可</div>
          </div>
        </div>

        {/* 卡片 4: 发布动态 */}
            <Link
              to="/publish"
          className="public-card flex flex-col gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-yellow-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center">
            <img src={cameraIcon} className="w-5 h-5" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-gray-900">{user?.stats.momentCount }</div>
            <div className="text-xs text-gray-400 mt-1">发布动态 · 分享记录</div>
          </div>
        </Link>

      </div>

      {/* 3. 小鱼干余额  */}
      <section className="public-balance-card group relative w-full overflow-hidden p-5 text-white sm:p-8">
        <div className="relative z-10">
          <div className="text-xs text-yellow-500/80 font-medium mb-2">小鱼干余额 (积分)</div>
          <div className="text-5xl font-black text-[#F3B72E] tracking-wider font-mono">
            {user?.currency || 850}
          </div>
        </div>

        {/* 右下角装饰鱼 SVG */}
        <img src={fishIcon} className="w-24 h-24 absolute -bottom-3 -right-4 opacity-80 group-hover:opacity-90 transition-opacity mr-6" />
      </section>

      {/* 4. 功能入口  */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

        {/* 领养申请 */}
        <section className="public-card public-center-entry flex min-h-[15.5rem] flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 sm:p-6">
          <header className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
                <img src={paperIcon} alt="" className="size-6" />
              </div>
              <div className="flex min-w-0 flex-col justify-center">
                <h3 className="text-lg font-bold text-gray-800">领养申请</h3>
                <span className="mt-1 text-xs text-gray-400">查看申请进度</span>
              </div>
            </div>
            <Link
              to="/my-adoptions"
              className="shrink-0 text-sm font-medium text-orange-500 hover:text-orange-600"
            >
              查看全部 →
            </Link>
          </header>

          {adoptionLoading ? (
            <div className="flex flex-1 items-center justify-center py-4 text-sm text-gray-400">
              加载中...
            </div>
          ) : adoptionList.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-4 text-sm text-gray-400">
              暂无领养申请
            </div>
          ) : (
            <div className="public-preview-scroll flex max-h-36 flex-col gap-2 overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable]">
              {adoptionList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex min-h-[4.25rem] w-full shrink-0 items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => navigate(`/cats/${item.catId}`)}
                >
                  <img src={item.catAvatar} alt={item.catName} className="size-11 shrink-0 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-gray-800">{item.catName}</div>
                    <div className="mt-1 text-xs text-gray-400">{item.createTime?.slice(0, 10) || '时间待更新'}</div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn('shrink-0 font-bold', adoptionStatusInfo(item.status).class)}
                  >
                    {adoptionStatusInfo(item.status).label}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 我的 SOS */}
        <section className="public-card public-center-entry flex min-h-[15.5rem] flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 sm:p-6">
          <header className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
                <Siren className="size-5" />
              </div>
              <div className="flex min-w-0 flex-col justify-center">
                <h3 className="text-lg font-bold text-gray-800">我的 SOS</h3>
                <span className="mt-1 text-xs text-gray-400">查看求助处理进度</span>
              </div>
            </div>
            <Link to="/my-sos" className="shrink-0 text-sm font-medium text-orange-500 hover:text-orange-600">
              查看全部 →
            </Link>
          </header>

          {sosLoading ? (
            <div className="flex flex-1 items-center justify-center py-4 text-sm text-gray-400">
              加载中...
            </div>
          ) : sosError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center text-sm text-red-600">
              <span>SOS 记录加载失败</span>
              <Button variant="outline" size="sm" onClick={() => void fetchMySOS()}>重新加载</Button>
            </div>
          ) : sosList.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-4 text-sm text-gray-400">
              暂无 SOS 记录
            </div>
          ) : (
            <div className="public-preview-scroll flex max-h-36 flex-col gap-2 overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable]">
              {sosList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex min-h-[4.25rem] w-full shrink-0 items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={() => navigate('/my-sos')}
                >
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
                    <Siren className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-gray-800">{item.catName || '未收录猫咪'}</div>
                    <div className="mt-1 truncate text-xs text-gray-400">{item.location || '位置待更新'}</div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn('shrink-0 font-bold', sosStatusInfo(item.status).class)}
                  >
                    {sosStatusInfo(item.status).label}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </section>

      </div>

      <BadgeShowcase
        items={badges}
        loading={badgeLoading}
        error={badgeError}
        onRetry={fetchBadges}
      />

      {/* 5. 修改密码 & 退出登录 */}
      <div className="flex justify-center items-center gap-6 mt-4">
        <button
          onClick={() => setIsBindEmailDialogOpen(true)}
          className="flex items-center gap-2 text-gray-400 hover:text-orange-500 text-sm font-bold transition-colors py-2 rounded-lg"
        >
          <Mail className="w-4 h-4" />
          绑定邮箱
        </button>
        <span className="text-gray-200">|</span>
        <button
          onClick={() => setIsPasswordDialogOpen(true)}
          className="flex items-center gap-2 text-gray-400 hover:text-orange-500 text-sm font-bold transition-colors py-2 rounded-lg"
        >
          <Lock className="w-4 h-4" />
          修改密码
        </button>
        <span className="text-gray-200">|</span>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-400 hover:text-red-500 text-sm font-bold transition-colors py-2 rounded-lg"
        >
          <LogOut className="w-4 h-4 text-center" />
          退出登录
        </button>
      </div>

      {/* 邮箱绑定弹窗 */}
      <Dialog open={isBindEmailDialogOpen} onOpenChange={(open) => { setIsBindEmailDialogOpen(open); if (!open) resetBindEmailForm() }}>
        <DialogContent className="public-dialog overflow-hidden p-0 sm:max-w-[400px]">
          <DialogHeader className="public-dialog-header px-6 py-5 pr-14">
            <DialogTitle>绑定邮箱</DialogTitle>
            <DialogDescription>验证码将发送到当前账号对应的山大邮箱，绑定后可使用邮箱密码登录。</DialogDescription>
          </DialogHeader>

          <div className="public-dialog-body flex flex-col gap-4 px-6 py-5">
            {user?.email ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                当前邮箱：{user.email}
              </div>
            ) : null}
            <div className="space-y-2">
              <label htmlFor="bind-email-password" className="text-sm font-medium text-gray-700">当前登录密码</label>
              <Input
                id="bind-email-password"
                value={bindEmailForm.password}
                onChange={(e) => setBindEmailForm((prev) => ({ ...prev, password: e.target.value }))}
                type="password"
                autoComplete="current-password"
                placeholder="请输入当前登录密码"
                className="public-dialog-field"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="bind-email-code" className="text-sm font-medium text-gray-700">邮箱验证码</label>
              <div className="flex gap-2">
                <Input
                  id="bind-email-code"
                  value={bindEmailForm.code}
                  onChange={(e) => setBindEmailForm((prev) => ({ ...prev, code: e.target.value }))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="请输入验证码"
                  className="public-dialog-field min-w-0 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  disabled={bindEmailCodeLoading || bindEmailCountdown > 0}
                  onClick={() => void handleSendBindEmailCode()}
                >
                  {bindEmailCodeLoading ? '发送中' : bindEmailCountdown > 0 ? `${bindEmailCountdown}s` : '获取验证码'}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="public-dialog-footer px-6 py-4">
            <Button
              variant="outline"
              className="public-dialog-cancel"
              disabled={bindEmailLoading}
              onClick={() => setIsBindEmailDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              className="public-dialog-primary bg-orange-500 text-white hover:bg-orange-600"
              disabled={bindEmailLoading}
              onClick={() => void handleBindEmail()}
            >
              {bindEmailLoading ? '绑定中...' : '确认绑定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 修改密码弹窗 */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={(open) => { setIsPasswordDialogOpen(open); if (!open) resetPasswordForm() }}>
        <DialogContent className="public-dialog overflow-hidden p-0 sm:max-w-[400px]">
          <DialogHeader className="public-dialog-header px-6 py-5 pr-14">
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>验证原密码后设置新的登录密码。</DialogDescription>
          </DialogHeader>

          <div className="public-dialog-body flex flex-col gap-4 px-6 py-5">
            {/* 原密码 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">原密码</label>
              <div className="relative">
                <Input
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, oldPassword: e.target.value }))}
                  type={showOldPassword ? 'text' : 'password'}
                  placeholder="请输入原密码"
                  className="public-dialog-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {!showOldPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 新密码 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">新密码</label>
              <div className="relative">
                <Input
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="请输入新密码（至少6位）"
                  className="public-dialog-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {!showNewPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 确认新密码 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">确认新密码</label>
              <div className="relative">
                <Input
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="请再次输入新密码"
                  className="public-dialog-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {!showConfirmPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="public-dialog-footer px-6 py-4">
            <Button
              variant="outline"
              className="public-dialog-cancel"
              onClick={() => setIsPasswordDialogOpen(false)}
              disabled={passwordLoading}
            >
              取消
            </Button>
            <Button
              onClick={() => void handleChangePassword()}
              disabled={passwordLoading}
              className="public-dialog-primary bg-orange-500 hover:bg-orange-600 text-white"
            >
              {passwordLoading ? '提交中...' : '确认修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 登出确认对话框 */}
      <ConfirmDialog
        open={isLogoutDialogOpen}
        onOpenChange={setIsLogoutDialogOpen}
        title="退出登录"
        description="确定要退出当前账号吗？"
        confirmText="退出"
        variant="warning"
        onConfirm={confirmLogout}
      />

    </div>
  )
}
