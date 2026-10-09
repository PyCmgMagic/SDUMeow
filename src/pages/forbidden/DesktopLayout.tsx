import { ShieldX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@pc/components/ui/button'

export function DesktopLayout() {
  const navigate = useNavigate()

  return (
    <section className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <ShieldX className="mx-auto mb-5 h-14 w-14 text-red-600" />
        <h1 className="text-2xl font-bold text-gray-900">无权访问管理后台</h1>
        <p className="mt-3 text-sm text-gray-500">当前账号没有管理员权限。</p>
        <Button className="mt-6" onClick={() => navigate('/')}>返回首页</Button>
      </div>
    </section>
  )
}
