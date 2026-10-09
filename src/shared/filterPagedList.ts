import { toPaged } from '@/utils/format'
import { ADMIN_PAGE_SIZE } from './useListFilters'

/** For list APIs without server-side search, filter before paginating. */
export async function filterPagedList<T>(
  load: (page: number, size: number) => Promise<unknown>,
  page: number,
  matches: (item: T) => boolean,
) {
  const first = toPaged<T>(await load(1, 100))
  const size = first.size || first.items.length || 100
  const pages = first.pages || Math.ceil(first.total / size)
  const all = [...first.items]
  for (let next = 2; next <= pages; next += 1) {
    all.push(...toPaged<T>(await load(next, 100)).items)
  }
  const filtered = all.filter(matches)
  return {
    items: filtered.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE),
    total: filtered.length,
    pages: Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE)),
    current: page,
    size: ADMIN_PAGE_SIZE,
  }
}
