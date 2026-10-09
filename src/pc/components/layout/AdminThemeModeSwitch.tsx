import { LayoutDashboard, Palette } from 'lucide-react'

import { cn } from '@pc/lib/utils'
import { useThemeStore } from '@pc/stores/theme'
import type { AdminTheme } from '@pc/stores/theme'

const modes: Array<{ value: AdminTheme; label: string; icon: typeof Palette }> = [
  { value: 'management', label: '线条', icon: LayoutDashboard },
  { value: 'campus', label: '柔和', icon: Palette },
]

export function AdminThemeModeSwitch() {
  const adminTheme = useThemeStore((state) => state.adminTheme)
  const setAdminTheme = useThemeStore((state) => state.setAdminTheme)

  return (
    <section className="admin-theme-switcher" aria-label="管理员界面风格">
      <p className="admin-theme-label">界面风格</p>
      <div className="grid grid-cols-2 gap-1" role="group" aria-label="选择管理员界面风格">
        {modes.map((mode) => {
          const Icon = mode.icon
          return (
            <button
              key={mode.value}
              type="button"
              className={cn('admin-theme-option', adminTheme === mode.value && 'is-active')}
              aria-pressed={adminTheme === mode.value}
              title={`${mode.label}模式`}
              onClick={() => setAdminTheme(mode.value)}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              <span>{mode.label}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
