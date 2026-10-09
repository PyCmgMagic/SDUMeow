import { cn } from '@pc/lib/utils'

type FilterValue = string | number | null
type FilterTone = 'yellow' | 'mint'

export interface AdminStatusTabsProps {
  ariaLabel: string
  value: FilterValue
  options: Array<{ label: string; value: FilterValue }>
  tone?: FilterTone
  onChange?: (value: FilterValue) => void
}

const selectedClasses: Record<FilterTone, string> = {
  yellow: 'admin-status-tab-yellow bg-[#FACC15] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]',
  mint: 'admin-status-tab-mint bg-[#5CD6C2] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'
}

export function AdminStatusTabs({ ariaLabel, value, options, tone = 'yellow', onChange }: AdminStatusTabsProps) {
  return (
    <div className="admin-status-tabs w-full overflow-x-auto border-2 border-black bg-gray-100 p-1 sm:w-auto" aria-label={ariaLabel}>
      <div className="flex min-w-max">
        {options.map((option) => (
          <button
            key={`${option.value}-${option.label}`}
            type="button"
            className={cn('admin-status-tab min-h-9 shrink-0 px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2',
            value === option.value ? cn('is-active', selectedClasses[tone]) : 'text-gray-600 hover:bg-white')}
            aria-pressed={value === option.value}
            onClick={() => onChange?.(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default AdminStatusTabs
