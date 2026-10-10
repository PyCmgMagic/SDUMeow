import { useState } from 'react'
import { StudentOnlineLogo } from '@pc/components/StudentOnlineLogo'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, GraduationCap, LoaderCircle, ShieldAlert, ShieldCheck, X } from 'lucide-react'
import { Button } from '@pc/components/ui/button'
import { Input } from '@pc/components/ui/input'
import { toast } from '@pc/lib/toast'
import { useAuthQueryFeedback } from '@pc/composables/useAuthQueryFeedback'
import { useUserStore } from '@pc/stores/user'
import { getSduAuthUrl, setAuthIntent } from '@pc/lib/auth'
import logo from '@/assets/猫猫图鉴-logo.png'

export function DesktopLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [sduLoading, setSduLoading] = useState(false)
  const adminLogin = useUserStore((state) => state.adminLogin)

  const { authNotice, dismissAuthNotice } = useAuthQueryFeedback({
    loginPath: '/admin/login',
    fallbackMessage: '管理员统一认证失败，请重试',
    expiredMessage: '管理员登录已过期，请重新认证',
    messages: {
      sdu: '统一认证失败，请重试或使用管理员邮箱密码登录',
      forbidden: '当前账号无管理员权限，无法进入管理后台',
      '403': '当前账号无管理员权限，无法进入管理后台',
      not_admin: '当前账号无管理员权限，无法进入管理后台',
    },
  })

  const safeRedirect = () => {
    const redirect = new URLSearchParams(location.search).get('redirect') ?? '/admin/dashboard'
    return redirect.startsWith('/admin') && !redirect.startsWith('//')
      ? redirect
      : '/admin/dashboard'
  }

  const handleLogin = async () => {
    const email = form.email.trim()
    if (!email || !form.password) {
      toast.warning('请输入管理员邮箱和密码')
      return
    }

    setLoading(true)
    try {
      await adminLogin({ email, password: form.password })
      toast.success('管理员登录成功')
      await navigate(safeRedirect())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '管理员登录失败，请检查账号和密码')
    } finally {
      setLoading(false)
    }
  }

  const safeSduRedirect = () => {
    const redirect = new URLSearchParams(location.search).get('redirect') ?? '/admin/dashboard'
    return redirect.startsWith('/admin') && !redirect.startsWith('//') ? redirect : '/admin/dashboard'
  }

  const handleSduLogin = () => {
    setSduLoading(true)
    setAuthIntent('admin', safeSduRedirect())
    // The administrator CAS entry point sets the HttpOnly mode=admin cookie
    // before redirecting to the same CAS callback.
    window.location.assign(getSduAuthUrl('admin'))
  }

  const goBack = () => navigate('/login')

  return (
    <main className="auth-page auth-login-page">
      <section className="auth-card auth-card-login" aria-labelledby="admin-login-title">
        <header className="auth-card-header">
          <img src={logo} alt="MEOW" className="auth-logo" />
          <p className="auth-eyebrow">MEOW / ADMIN CONSOLE</p>
          <h1 id="admin-login-title" className="auth-title">管理员登录</h1>
          <p className="auth-subtitle">使用管理员账号进入管理后台</p>
        </header>

        <form
          className="auth-card-body"
          onSubmit={(event) => {
            event.preventDefault()
            void handleLogin()
          }}
        >
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

          <div className="auth-form-fields">
            <label className="auth-field" htmlFor="admin-login-email">
              <span>管理员邮箱</span>
              <Input
                id="admin-login-email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                type="email"
                autoComplete="username"
                maxLength={120}
                placeholder="请输入管理员邮箱"
                className="auth-input"
                disabled={loading || sduLoading}
              />
            </label>

            <label className="auth-field" htmlFor="admin-login-password">
              <span>密码</span>
              <div className="auth-input-with-action">
                <Input
                  id="admin-login-password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="请输入密码"
                  className="auth-input pr-12"
                  disabled={loading || sduLoading}
                />
                <button
                  type="button"
                  className="auth-input-action"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  disabled={loading || sduLoading}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </label>
          </div>

          <Button type="button" className="auth-sdu-button" disabled={loading || sduLoading} onClick={handleSduLogin}>
            {sduLoading ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <GraduationCap data-icon="inline-start" />}
            {sduLoading ? '正在前往统一认证...' : '管理员统一认证登录'}
          </Button>

          <div className="auth-divider">管理员邮箱密码登录</div>
          <Button type="submit" className="auth-submit-button" disabled={loading || sduLoading}>
            {loading ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <ShieldCheck data-icon="inline-start" />}
            {loading ? '正在登录...' : '进入管理后台'}
          </Button>

          <div className="auth-footer-links">
            <button type="button" className="auth-text-button" disabled={loading} onClick={goBack}>
              <ArrowLeft data-icon="inline-start" /> 返回统一认证
            </button>
          </div>
        </form>
        <footer className="flex justify-center px-8 pb-6" aria-label="学生在线">
          <StudentOnlineLogo className="w-[clamp(8.5rem,38vw,12rem)]" />
        </footer>
      </section>
    </main>
  )
}
