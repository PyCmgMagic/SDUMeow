import { useNavigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@pc/components/ui/button'

export default function AdminAuthForbiddenView() {
  const navigate = useNavigate()

  const goAdminLogin = () => {
    void navigate('/admin/login')
  }

  const goUserLogin = () => {
    void navigate('/login')
  }

  return (
    <main className="auth-page auth-login-page">
      <section
        className="auth-card auth-card-login mx-auto w-full max-w-md border-2 border-black bg-white p-7 text-center shadow-[6px_6px_0_rgba(0,0,0,1)]"
        role="alert"
        aria-labelledby="admin-auth-forbidden-title"
      >
        <div className="mb-3 inline-block border-2 border-black bg-[#FEE2E2] px-2.5 py-1 text-xs font-extrabold tracking-wider text-[#B91C1C]">
          HTTP 403
        </div>
        <ShieldAlert className="mx-auto mb-3 size-10 text-[#B91C1C]" aria-hidden="true" />
        <h1 id="admin-auth-forbidden-title" className="text-2xl font-black text-gray-950">
          无管理员访问权限
        </h1>
        <p className="mt-3 text-sm leading-7 text-gray-500">
          当前统一认证账号没有管理后台权限，无法完成管理员登录。如需开通权限，请联系系统管理员。
        </p>
        <div className="mt-6 grid gap-2.5">
          <Button
            type="button"
            className="h-11 border-2 border-black bg-[#FACC15] font-extrabold text-black shadow-[3px_3px_0_rgba(0,0,0,1)] hover:bg-[#EAB308]"
            onClick={goAdminLogin}
          >
            返回管理员登录
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 border-2 border-black bg-white font-bold text-black shadow-[3px_3px_0_rgba(0,0,0,1)] hover:bg-gray-50"
            onClick={goUserLogin}
          >
            返回用户登录
          </Button>
        </div>
      </section>
    </main>
  )
}
