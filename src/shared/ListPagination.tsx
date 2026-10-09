import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect } from 'react'
import { toPaged } from '@/utils/format'
import { ADMIN_PAGE_SIZE } from './useListFilters'

export function ListPagination({ data, page, onChange, loading = false }: {
  data: unknown
  page: number
  onChange: (page: number) => void
  loading?: boolean
}) {
  const paged = toPaged(data)
  const pages = Math.max(1, paged.pages || Math.ceil(paged.total / ADMIN_PAGE_SIZE))
  useEffect(() => {
    if (data && !loading && page > pages) onChange(pages)
  }, [data, loading, page, pages, onChange])
  return (
    <nav aria-label="列表分页" className="mt-5 flex items-center justify-center gap-4 text-sm">
      <button type="button" aria-label="上一页" title="上一页" className="flex size-9 items-center justify-center rounded-md border border-gray-200 bg-white disabled:opacity-40"
        disabled={loading || page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft className="size-4" /></button>
      <span aria-live="polite">第 {page} / {pages} 页</span>
      <button type="button" aria-label="下一页" title="下一页" className="flex size-9 items-center justify-center rounded-md border border-gray-200 bg-white disabled:opacity-40"
        disabled={loading || page >= pages} onClick={() => onChange(page + 1)}><ChevronRight className="size-4" /></button>
    </nav>
  )
}
