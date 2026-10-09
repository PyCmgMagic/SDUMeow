import { useState } from 'react'
import logo from '@pc/assets/brand/student-online.png'
import { cn } from '@pc/lib/utils'

interface StudentOnlineLogoProps {
  className?: string
}

/** Shared PC studio branding; the enclosing link determines responsive size. */
export function StudentOnlineLogo({ className }: StudentOnlineLogoProps) {
  const [failed, setFailed] = useState(false)
  return (
    <a href="https://www.online.sdu.edu.cn/" target="_blank" rel="noopener noreferrer"
      aria-label="学生在线官网（新窗口打开）"
      className={cn('inline-flex max-w-full items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', className)}>
      {failed ? <span className="text-sm font-bold text-foreground">学生在线</span>
        : <img src={logo} alt="学生在线网络文化工作室" className="block h-auto w-full max-w-full object-contain" onError={() => setFailed(true)} />}
    </a>
  )
}
