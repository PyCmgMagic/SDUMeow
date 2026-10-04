import type { ComponentType, ReactNode } from 'react'

type HeaderTone = 'yellow' | 'mint' | 'gray'

export interface AdminPageHeaderProps {
  eyebrow: string
  title: string
  description: string
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  tone?: HeaderTone
  summary?: ReactNode
  action?: ReactNode
}

const toneClasses: Record<HeaderTone, string> = {
  yellow: 'admin-page-header-icon-yellow bg-[#FACC15]',
  mint: 'admin-page-header-icon-mint bg-[#5CD6C2]',
  gray: 'admin-page-header-icon-gray bg-[#F3F4F6]'
}

export function AdminPageHeader({ eyebrow, title, description, icon: Icon, tone = 'yellow', summary, action }: AdminPageHeaderProps) {
  return (
    <header className="admin-page-header flex flex-col gap-4 border-b-2 border-black pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex items-start gap-4">
        <div
          className={`admin-page-header-icon flex size-12 shrink-0 items-center justify-center border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] ${toneClasses[tone]}`}
        >
          <Icon className="size-6" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="admin-page-eyebrow text-sm font-bold text-gray-500">{eyebrow}</p>
          <h1 className="admin-page-title mt-1 text-2xl font-black text-gray-950">{title}</h1>
          <p className="admin-page-description mt-2 text-sm text-gray-600">{description}</p>
        </div>
      </div>
      {action || summary ? <div className="admin-page-actions flex flex-wrap items-center gap-3 self-start lg:self-auto">
        {summary}
        {action}
      </div> : null}
    </header>
  )
}

export default AdminPageHeader
