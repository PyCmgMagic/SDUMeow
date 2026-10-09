import { useState } from 'react'
import { Award, ChevronDown, ChevronUp, LockKeyhole, Medal } from 'lucide-react'
import type { BadgeDisplayItem } from '@pc/types'
import { Button } from '@pc/components/ui/button'
import { cn } from '@pc/lib/utils'

export interface BadgeShowcaseProps {
  items: BadgeDisplayItem[]
  loading: boolean
  error?: string
  onRetry?: () => void
}

export function BadgeShowcase(props: BadgeShowcaseProps) {
  const { items, loading, error, onRetry } = props

  const [expanded, setExpanded] = useState(false)
  const earnedCount = items.filter((item) => item.earned).length
  const visibleItems = expanded ? items : items.slice(0, 8)
  const progressWidth = (item: BadgeDisplayItem) => {
    if (item.progressPercentage !== undefined) return Math.min(Math.max(item.progressPercentage, 0), 100)
    if (item.earned) return 100
    if (item.progress === undefined || !item.target) return 0
    return Math.min(Math.max((item.progress / item.target) * 100, 0), 100)
  }

  const progressLabel = (item: BadgeDisplayItem) => {
    if (item.earned) return '已获得'
    if (item.progress !== undefined && item.target !== undefined) return `${item.progress} / ${item.target}`
    return '未完成'
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-black bg-[#FACC15] shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            <Award className="h-6 w-6 text-black" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">荣誉勋章</h2>
          <p className="text-sm text-gray-500">我的徽章 {earnedCount} / {items.length}</p>
          </div>
        </div>
        {items.length > 8 && <Button variant="ghost" size="sm" className="gap-1" onClick={() => setExpanded(!expanded)}>
          {expanded ? '收起' : '查看全部'}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>}
      </div>

      {loading ? <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => i + 1).map((index) => <div key={index} className="h-40 animate-pulse rounded-lg border border-gray-200 bg-gray-100" />)}
      </div>
        : error ? <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
        <span>{error}</span>
        <Button variant="outline" size="sm" onClick={() => onRetry?.()}>重新加载</Button>
      </div>
        : items.length === 0 ? <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">
        暂无徽章数据
      </div>
        : <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {visibleItems.map((item) => (
          <article
            key={item.id}
            className={cn('relative min-h-40 overflow-hidden rounded-lg border p-4 transition-shadow',
            item.earned ? 'border-yellow-300 bg-white shadow-sm hover:shadow-md' : 'border-gray-200 bg-gray-100 text-gray-400')}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div
                className={cn('flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border',
                item.earned ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300 bg-gray-200 grayscale')}
              >
                {item.iconUrl
                  ? <img src={item.iconUrl} alt={item.name} className={cn('h-full w-full object-cover', !item.earned && 'grayscale opacity-60')} />
                  : <Medal className={cn('h-7 w-7', item.earned ? 'text-yellow-600' : 'text-gray-400')} />}
              </div>
              {!item.earned && <LockKeyhole className="h-4 w-4 text-gray-400" />}
            </div>
            <h3 className={cn('truncate text-sm font-bold', item.earned ? 'text-gray-900' : 'text-gray-500')}>{item.name}</h3>
            <p className={cn('mt-1 line-clamp-2 text-xs leading-5', item.earned ? 'text-gray-500' : 'text-gray-400')}>
              {item.description || (item.earned ? '已获得' : '尚未解锁')}
            </p>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[11px] text-gray-500">
                <span>解锁进度</span>
                <span>{progressLabel(item)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div className={cn('h-full transition-[width]', item.earned ? 'bg-[#FACC15]' : 'bg-[#5CD6C2]')} style={{ width: `${progressWidth(item)}%` }} />
              </div>
            </div>
          </article>
        ))}
      </div>}
    </section>
  )
}

export default BadgeShowcase
