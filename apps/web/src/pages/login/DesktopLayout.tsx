import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from '@pc/lib/toast'
import { Eye, EyeOff, GraduationCap, LoaderCircle, LogIn, ShieldAlert, X } from 'lucide-react'
import { Button } from '@pc/components/ui/button'
import { Input } from '@pc/components/ui/input'
import { useAuthQueryFeedback } from '@pc/composables/useAuthQueryFeedback'
import { useUserStore } from '@pc/stores/user'
import { getSduAuthUrl, setAuthIntent } from '@pc/lib/auth'
import logo from '@/assets/猫猫图鉴-logo.png'

export function DesktopLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [sduLoading, setSduLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const isMock = import.meta.env.VITE_MOCK === '1'
  const [form, setForm] = useState({ email: isMock ? 'user@sdumeow.cn' : '', password: isMock ? 'meow123' : '' })
  const login = useUserStore((state) => state.login)

  const { authNotice, dismissAuthNotice } = useAuthQueryFeedback({
    loginPath: '/login',
    fallbackMessage: '统一认证登录失败，请重试',
    expiredMessage: '登录已过期，请重新登录',
    messages: {
      sdu: '统一认证登录失败，请重试',
      forbidden: '当前账号无访问权限',
      '403': '当前账号无访问权限',
      not_admin: '当前账号无管理员权限，请改用管理员入口登录',
    },
  })

  const safeRedirect = () => {
    const redirect = new URLSearchParams(location.search).get('redirect') ?? '/'
    return redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
  }

  const handleSduLogin = () => {
    setSduLoading(true)
    setAuthIntent('user', safeRedirect())
    window.location.assign(getSduAuthUrl('user'))
  }

  const handlePasswordLogin = async () => {
    const email = form.email.trim()
    if (!email || !form.password) {
      toast.warning('请输入邮箱和密码')
      return
    }
    setPasswordLoading(true)
    try {
      await login({ email, password: form.password })
      toast.success('登录成功')
      await navigate(safeRedirect())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '登录失败，请检查邮箱和密码')
    } finally {
      setPasswordLoading(false)
    }
  }

  const goVisitor = () => navigate('/')
  const goAdminLogin = () => {
    const query = new URLSearchParams({ redirect: '/admin/dashboard' })
    navigate(`/admin/login?${query.toString()}`)
  }

  return (
    <main className="auth-page auth-login-page">
      <section className="auth-card auth-card-login" aria-labelledby="login-title">
        <header className="auth-card-header">
          <img src={logo} alt="SDU Meow" className="auth-logo" />
          <p className="auth-eyebrow">SDU MEOW / CAMPUS CAT DIRECTORY</p>
          <h1 id="login-title" className="auth-title">Hello，校友！</h1>
          <p className="auth-subtitle">欢迎回到猫猫图鉴</p>
        </header>

        <div className="auth-card-body">
          {authNotice ? (
            <div
              className="mb-4 flex items-start gap-3 border-2 border-black bg-[#FEE2E2] px-3 py-3 text-left text-sm leading-6 text-[#7F1D1D]"
              role="alert"
            >
              <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p className="min-w-0 flex-1 font-medium">{authNotice}</p>
              <button
                type="button"
                className="shrink-0 text-[#7F1D1D] hover:text-black"
                aria-label="关闭提示"
                onClick={dismissAuthNotice}
              >
                <X className="size-4" />
              </button>
            </div>
          ) : null}

          <Button type="button" className="auth-sdu-button" disabled={sduLoading || passwordLoading} onClick={handleSduLogin}>
            {sduLoading ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <GraduationCap data-icon="inline-start" />}
            {sduLoading ? '正在前往统一认证...' : '山东大学统一认证'}
          </Button>

          <div className="auth-divider">邮箱密码登录</div>
          {isMock ? (
            <p className="mb-4 text-center text-sm leading-6 text-gray-500">演示账号已填好：user@sdumeow.cn / meow123</p>
          ) : null}
          <form
            className="auth-form-fields"
            onSubmit={(event) => {
              event.preventDefault()
              void handlePasswordLogin()
            }}
          >
            <label className="auth-field" htmlFor="user-login-email">
              <span>山大邮箱</span>
              <Input
                id="user-login-email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                type="email"
                autoComplete="username"
                placeholder="请输入山大邮箱"
                className="auth-input"
                disabled={passwordLoading || sduLoading}
              />
            </label>
            <label className="auth-field" htmlFor="user-login-password">
              <span>密码</span>
              <div className="auth-input-with-action">
                <Input
                  id="user-login-password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="请输入密码"
                  className="auth-input pr-12"
                  disabled={passwordLoading || sduLoading}
                />
                <button
                  type="button"
                  className="auth-input-action"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  disabled={passwordLoading || sduLoading}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </label>
            <Button type="submit" className="auth-submit-button" disabled={sduLoading || passwordLoading}>
              {passwordLoading ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <LogIn data-icon="inline-start" />}
              {passwordLoading ? '登录中...' : '邮箱密码登录'}
            </Button>
          </form>

          <Button type="button" variant="outline" className="auth-secondary-button" disabled={sduLoading || passwordLoading} onClick={goAdminLogin}>
            管理员入口
          </Button>

          <div className="auth-footer-links">
            <button type="button" className="auth-text-button" onClick={goVisitor}>游客登录</button>
          </div>
        </div>
      </section>
    </main>
  )
}
