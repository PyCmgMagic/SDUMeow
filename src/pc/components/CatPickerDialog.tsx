import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Search, MapPin } from 'lucide-react'
import { catApi, typeApi } from '@pc/lib/api'
import { CampusMap, type CatListItem, type TypeOption } from '@pc/types'
import { Button } from '@pc/components/ui/button'
import { Input } from '@pc/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@pc/components/ui/dialog'
import { cn } from '@pc/lib/utils'

export interface CatPickerDialogProps {
  open: boolean
  title?: string
  allowUnknown?: boolean
  isSelectable?: (cat: CatListItem) => boolean
  getDisabledReason?: (cat: CatListItem) => string
  onOpenChange?: (value: boolean) => void
  onSelect?: (cat: CatListItem) => void
  onUnknown?: () => void
  trigger?: ReactNode
}

const pageSize = 9

export function CatPickerDialog(props: CatPickerDialogProps) {
  const {
    open,
    title = '选择猫咪',
    allowUnknown = false,
    isSelectable,
    getDisabledReason,
    onOpenChange,
    onSelect,
    onUnknown,
    trigger
  } = props

  const [cats, setCats] = useState<CatListItem[]>([])
  const [page, setPageState] = useState(1)
  const pageRef = useRef(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQueryState] = useState('')
  const searchQueryRef = useRef('')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [colorOptions, setColorOptions] = useState<TypeOption[]>([])
  const [locationOptions, setLocationOptions] = useState<TypeOption[]>([])
  const debounceTimerRef = useRef<number | null>(null)
  const latestRequestIdRef = useRef(0)
  const openRef = useRef(open)
  openRef.current = open

  const setPage = (value: number) => {
    pageRef.current = value
    setPageState(value)
  }
  const setSearchQuery = (value: string) => {
    searchQueryRef.current = value
    setSearchQueryState(value)
  }

  const colorLabels = useMemo(() => new Map(colorOptions.map((item) => [item.id, item.label])), [colorOptions])
  const locationLabels = useMemo(() => new Map(locationOptions.map((item) => [item.id, item.label])), [locationOptions])
  const colorLabel = (id: number) => colorLabels.get(id) || `花色 #${id}`
  const placeLabel = (cat: CatListItem) => {
    if (cat.location !== null) return locationLabels.get(cat.location) || `地点 #${cat.location}`
    return CampusMap[cat.campus] || `校区 #${cat.campus}`
  }
  const isCatSelectable = (cat: CatListItem) => isSelectable?.(cat) ?? true
  const disabledReason = (cat: CatListItem) => getDisabledReason?.(cat) || '当前不可选择'

  const fetchCats = async () => {
    const requestId = ++latestRequestIdRef.current
    setLoading(true)
    setLoadError('')
    try {
      const search = searchQueryRef.current.trim()
      const result = await catApi.getCatList({
        page: pageRef.current,
        pageSize,
        ...(search && { search })
      })
      if (requestId !== latestRequestIdRef.current) return
      setCats(result.items)
      setTotal(result.total)
      setTotalPages(Math.max(result.totalPage, 1))
    } catch (error) {
      if (requestId !== latestRequestIdRef.current) return
      setCats([])
      setTotal(0)
      setTotalPages(1)
      setLoadError(error instanceof Error ? error.message : '猫咪列表加载失败')
    } finally {
      if (requestId === latestRequestIdRef.current) setLoading(false)
    }
  }

  const loadTypeOptions = async () => {
    if (colorOptions.length && locationOptions.length) return
    const results = await Promise.allSettled([typeApi.getColors(), typeApi.getLocations()])
    if (results[0].status === 'fulfilled') setColorOptions(results[0].value)
    if (results[1].status === 'fulfilled') setLocationOptions(results[1].value)
  }

  const selectCat = (cat: CatListItem) => {
    if (!isCatSelectable(cat)) return
    onSelect?.(cat)
    onOpenChange?.(false)
  }

  const selectUnknown = () => {
    onUnknown?.()
    onOpenChange?.(false)
  }

  useEffect(() => {
    if (!open) {
      latestRequestIdRef.current += 1
      return
    }
    setPage(1)
    setSearchQuery('')
    void loadTypeOptions()
    void fetchCats()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open) void fetchCats()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  useEffect(() => {
    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
    setPage(1)
    debounceTimerRef.current = window.setTimeout(() => {
      if (openRef.current) void fetchCats()
    }, 300)
    return () => {
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
    }
  }, [searchQuery])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
      latestRequestIdRef.current += 1
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={(value) => onOpenChange?.(value)}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="flex max-h-[82vh] flex-col sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>搜索并选择本次操作关联的校园猫咪。</DialogDescription>
        </DialogHeader>

        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-10" placeholder="搜索猫咪名称..." />
        </div>

        <button
          type="button"
          className="rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-primary hover:bg-primary/10"
          style={{ display: allowUnknown ? undefined : 'none' }}
          onClick={selectUnknown}
        >
          不认识这只猫 / 未收录猫咪
        </button>

        {loading ? <div className="py-12 text-center text-sm text-gray-500">正在加载猫咪...</div>
          : loadError ? <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-red-600">
          <span>{loadError}</span>
          <Button variant="outline" size="sm" onClick={() => void fetchCats()}>重新加载</Button>
        </div>
          : cats.length === 0 ? <div className="py-12 text-center text-sm text-gray-500">未找到匹配的猫咪</div>
          : <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3">
          {cats.map((cat) => (
            <button
              key={cat.id}
              type="button"
              disabled={!isCatSelectable(cat)}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary enabled:hover:border-primary enabled:hover:shadow-sm disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100"
              onClick={() => selectCat(cat)}
            >
              <div className="aspect-[4/3] bg-gray-100">
                <img src={cat.avatar} alt={cat.name} className={cn('h-full w-full object-cover', !isCatSelectable(cat) && 'grayscale opacity-60')} />
              </div>
              <div className="space-y-1 p-3">
                <div className={cn('truncate text-sm font-bold', isCatSelectable(cat) ? 'text-gray-900' : 'text-gray-500')}>{cat.name}</div>
                <div className="truncate text-xs text-gray-500">{colorLabel(cat.color)}</div>
                <div className="flex items-center gap-1 truncate text-xs text-gray-500">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{placeLabel(cat)}</span>
                </div>
                {!isCatSelectable(cat) && <div className="line-clamp-2 min-h-8 text-xs font-bold leading-4 text-gray-600">{disabledReason(cat)}</div>}
              </div>
            </button>
          ))}
        </div>}

        {!loading && !loadError && total > 0 && (
          <div className="flex items-center justify-between border-t pt-3 text-sm text-gray-500">
            <span>共 {total} 只</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
              <span>第 {page} / {totalPages} 页</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default CatPickerDialog
