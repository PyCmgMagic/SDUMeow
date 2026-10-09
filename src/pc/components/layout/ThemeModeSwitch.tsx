import { LayoutDashboard, Palette } from 'lucide-react'

import { cn } from '@pc/lib/utils'
import { useThemeStore } from '@pc/stores/theme'
import type { PublicTheme } from '@pc/stores/theme'

const modes: Array<{ value: PublicTheme; label: string; icon: typeof Palette }> = [
  { value: 'classic', label: '柔和', icon: Palette },
  { value: 'admin', label: '线条', icon: LayoutDashboard },
]

export function ThemeModeSwitch() {
  const publicTheme = useThemeStore((state) => state.publicTheme)
  const setPublicTheme = useThemeStore((state) => state.setPublicTheme)

  return (
    <section className="public-theme-switcher mx-3 mb-3 p-2" aria-label="界面风格">
      <p className="public-theme-label mb-2 px-1 text-xs font-semibold tracking-wide">界面风格</p>
      <div className="grid grid-cols-2 gap-1" role="group" aria-label="选择界面风格">
        {modes.map((mode) => {
          const Icon = mode.icon
          return (
            <button
              key={mode.value}
              type="button"
              className={cn(
                'public-theme-option flex min-h-9 items-center justify-center gap-1.5 px-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                publicTheme === mode.value && 'is-active',
              )}
              aria-pressed={publicTheme === mode.value}
              title={`${mode.label}模式`}
              onClick={() => setPublicTheme(mode.value)}
            >
              <Icon className="size-3.5" />
              <span>{mode.label}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
