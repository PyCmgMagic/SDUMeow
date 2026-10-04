import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { toast } from '@pc/lib/toast'
import { ArrowLeft, Check, Eye, ImagePlus, MapPin, Phone, Save, UserRound } from 'lucide-react'
import { useUserStore } from '@pc/stores/user'
import { CampusMap } from '@pc/types'
import { IMAGE_FILE_ACCEPT, isSupportedImageFile, uploadImages } from '@pc/lib/upload'
import { Avatar, AvatarFallback, AvatarImage } from '@pc/components/ui/avatar'
import { Button } from '@pc/components/ui/button'
import { Input } from '@pc/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@pc/components/ui/select'

const campusOptions = Object.entries(CampusMap).map(([value, label]) => ({ value, label }))

export function DesktopLayout() {
  const navigate = useNavigate()
  const updateProfile = useUserStore((s) => s.updateProfile)
  const [loading, setLoading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [originalAvatar, setOriginalAvatar] = useState('')
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false)
  // 对应源码里的 let avatarPreviewUrl（非响应式普通变量，用 ref 保持）
  const avatarPreviewUrlRef = useRef('')

  const [form, setForm] = useState({
    nickname: '',
    campus: '',
    avatar: '',
    wechat: '',
    phone: '',
  })

  const campusNumber = Number(form.campus)
  const previewCampus = Number.isNaN(campusNumber) ? form.campus || '尚未选择校区' : CampusMap[campusNumber] || '尚未选择校区'
  const previewInitial = form.nickname.trim().slice(0, 1) || '喵'
  const avatarSource = avatarLoadFailed ? '' : form.avatar

  const syncUserInfo = () => {
    const userInfo = useUserStore.getState().userInfo
    if (!userInfo) return

    setForm({
      nickname: userInfo.nickname || '',
      campus: userInfo.campus === undefined || userInfo.campus === null ? '' : String(userInfo.campus),
      avatar: userInfo.avatar || '',
      wechat: userInfo.contact?.wechat || '',
      phone: userInfo.contact?.phone || '',
    })
    setOriginalAvatar(userInfo.avatar || '')
    setAvatarLoadFailed(false)
  }

  // 挂载时同步用户信息；卸载时回收头像预览 URL（对应 onMounted + onBeforeUnmount）
  useEffect(() => {
    syncUserInfo()
    return () => {
      if (avatarPreviewUrlRef.current) URL.revokeObjectURL(avatarPreviewUrlRef.current)
    }
  }, [])

  const triggerUpload = () => fileInputRef.current?.click()

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const file = input.files?.[0]
    input.value = ''
    if (!file) return

    if (!isSupportedImageFile(file)) {
      toast.error('仅支持 JPG 或 PNG 格式图片')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB')
      return
    }

    if (avatarPreviewUrlRef.current) URL.revokeObjectURL(avatarPreviewUrlRef.current)
    setAvatarFile(file)
    avatarPreviewUrlRef.current = URL.createObjectURL(file)
    setForm((prev) => ({ ...prev, avatar: avatarPreviewUrlRef.current }))
    setAvatarLoadFailed(false)
    toast.success('头像已选择，保存后生效')
  }

  const handleAvatarError = () => {
    setAvatarLoadFailed(true)
  }

  const handleSave = async () => {
    const nickname = form.nickname.trim()
    const phone = form.phone.trim()
    const wechat = form.wechat.trim()

    if (!nickname || !form.campus || !phone || !wechat) {
      toast.warning('请完整填写昵称、校区和联系方式')
      return
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      toast.warning('请输入有效的 11 位手机号')
      return
    }

    setLoading(true)
    try {
      const avatarKey = avatarFile ? (await uploadImages([avatarFile]))[0] : undefined
      await updateProfile({
        nickname,
        avatar: originalAvatar,
        campus: Number(form.campus),
        contact: { phone, wechat },
      }, avatarKey)
      toast.success('资料已保存')
      navigate('/me')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/me')
  }

  return (
    <div className="public-page public-profile-editor min-h-full">
      <header className="profile-editor-header">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="profile-editor-back shrink-0"
            aria-label="返回个人中心"
            onClick={handleCancel}
          >
            <ArrowLeft data-icon="inline-start" />
          </Button>
          <div className="min-w-0">
            <p className="profile-editor-eyebrow">ACCOUNT / PROFILE</p>
            <h1 className="profile-editor-title">编辑个人资料</h1>
            <p className="profile-editor-description">更新你的公开身份信息，让校园里的每次互动都更容易被认出。</p>
          </div>
        </div>
        <div className="profile-editor-header-status" aria-live="polite">
          <Check />
          <span>资料仅对已登录用户可见</span>
        </div>
      </header>

      <form className="profile-editor-layout" onSubmit={(event) => { event.preventDefault(); void handleSave() }}>
        <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
          <section className="profile-editor-section">
            <header className="profile-editor-section-header">
              <div className="profile-editor-section-icon profile-editor-section-icon-accent"><UserRound /></div>
              <div>
                <h2>头像与身份</h2>
                <p>选择一张清晰的头像，方便朋友在动态和求助中认出你。</p>
              </div>
            </header>
            <div className="profile-editor-avatar-panel">
              <Avatar className="profile-editor-avatar">
                {avatarSource ? <AvatarImage src={avatarSource} alt={form.nickname || '用户头像'} onError={handleAvatarError} /> : null}
                <AvatarFallback>{previewInitial}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="profile-editor-avatar-name truncate">{form.nickname || '还没有昵称'}</p>
                <p className="profile-editor-avatar-meta">JPG / PNG · 最大 5MB</p>
                <input ref={fileInputRef} className="hidden" type="file" accept={IMAGE_FILE_ACCEPT} onChange={handleFileChange} />
                <Button type="button" variant="outline" className="profile-editor-upload mt-4" onClick={triggerUpload}>
                  <ImagePlus data-icon="inline-start" />
                  更换头像
                </Button>
              </div>
              <div className="profile-editor-avatar-mark" aria-hidden="true"><Eye /></div>
            </div>
          </section>

          <section className="profile-editor-section">
            <header className="profile-editor-section-header">
              <div className="profile-editor-section-icon"><MapPin /></div>
              <div>
                <h2>基本信息</h2>
                <p>这些内容会出现在你的个人资料和社区互动中。</p>
              </div>
            </header>
            <div className="profile-editor-fields profile-editor-fields-two">
              <label className="profile-editor-field" htmlFor="profile-nickname">
                <span>昵称 <b>*</b></span>
                <Input id="profile-nickname" value={form.nickname} maxLength={30} autoComplete="nickname" placeholder="例如：爱吃鱼的猫"
                  onChange={(event) => setForm({ ...form, nickname: event.target.value })} />
                <small>最多 30 个字符</small>
              </label>
              <label className="profile-editor-field" htmlFor="profile-campus">
                <span>所在校区 <b>*</b></span>
                <Select value={form.campus} onValueChange={(value) => setForm({ ...form, campus: value })}>
                  <SelectTrigger id="profile-campus" aria-label="选择所在校区">
                    <SelectValue placeholder="请选择校区" />
                  </SelectTrigger>
                  <SelectContent>
                    {campusOptions.map((campus) => (
                      <SelectItem key={campus.value} value={campus.value}>
                        {campus.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <small>用于匹配附近的校园动态</small>
              </label>
            </div>
          </section>

          <section className="profile-editor-section">
            <header className="profile-editor-section-header">
              <div className="profile-editor-section-icon profile-editor-section-icon-warm"><Phone /></div>
              <div>
                <h2>联系方式</h2>
                <p>仅用于领养申请和 SOS 救援等需要联系你的场景。</p>
              </div>
            </header>
            <div className="profile-editor-fields profile-editor-fields-two">
              <label className="profile-editor-field" htmlFor="profile-wechat">
                <span>微信号 <b>*</b></span>
                <Input id="profile-wechat" value={form.wechat} maxLength={50} autoComplete="username" placeholder="请输入微信号"
                  onChange={(event) => setForm({ ...form, wechat: event.target.value })} />
              </label>
              <label className="profile-editor-field" htmlFor="profile-phone">
                <span>手机号 <b>*</b></span>
                <Input id="profile-phone" value={form.phone} inputMode="tel" maxLength={11} autoComplete="tel" placeholder="请输入 11 位手机号"
                  onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </label>
            </div>
          </section>

          <footer className="profile-editor-actions">
            <Button type="button" variant="outline" className="profile-editor-cancel" disabled={loading} onClick={handleCancel}>
              返回个人中心
            </Button>
            <Button type="submit" className="profile-editor-save" disabled={loading}>
              <Save data-icon="inline-start" />
              {loading ? '保存中...' : '保存资料'}
            </Button>
          </footer>
        </div>

        <aside className="profile-editor-aside">
          <section className="profile-editor-preview">
            <div className="profile-editor-preview-heading"><span>LIVE PREVIEW</span><Eye /></div>
            <div className="profile-editor-preview-avatar">
              <Avatar className="size-full">
                {avatarSource ? <AvatarImage src={avatarSource} alt={form.nickname || '预览头像'} onError={handleAvatarError} /> : null}
                <AvatarFallback>{previewInitial}</AvatarFallback>
              </Avatar>
            </div>
            <h2 className="profile-editor-preview-name">{form.nickname || '你的昵称'}</h2>
            <p className="profile-editor-preview-campus">{previewCampus}</p>
            <div className="profile-editor-preview-rule" />
            <p className="profile-editor-preview-copy">更新后，其他同学会在你的公开资料卡中看到这些信息。</p>
          </section>
          <section className="profile-editor-tip">
            <p className="profile-editor-tip-label">PROFILE NOTE</p>
            <p>联系方式不会显示在公开个人中心，只会在你主动参与的申请或求助流程中提供给工作人员。</p>
          </section>
        </aside>
      </form>
    </div>
  )
}
