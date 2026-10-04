import type { ReactNode } from 'react'

export interface AdminPanelProps {
  title?: string
  meta?: string
  toolbar?: ReactNode
  footer?: ReactNode
  children?: ReactNode
}

export function AdminPanel({ title, meta, toolbar, footer, children }: AdminPanelProps) {
  return (
    <section className="admin-panel overflow-hidden border-2 border-black bg-white shadow-[5px_5px_0px_rgba(0,0,0,1)]">
      {title || meta || toolbar ? (
        <div
          className="admin-panel-header flex min-h-12 items-center justify-between gap-4 border-b-2 border-black bg-[#F3F4F6] px-5 py-3"
        >
          {title ? <h2 className="admin-panel-title text-sm font-black text-gray-900">{title}</h2> : null}
          <div className="ml-auto flex items-center gap-3">
            {meta ? <span className="admin-panel-meta text-xs font-bold text-gray-500">{meta}</span> : null}
            {toolbar}
          </div>
        </div>
      ) : null}
      {children}
      {footer ? <div className="admin-panel-footer border-t-2 border-black bg-[#F3F4F6]">
        {footer}
      </div> : null}
    </section>
  )
}

export default AdminPanel
