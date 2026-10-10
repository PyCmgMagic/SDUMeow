import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

export const ADMIN_PAGE_SIZE = 10

export function useListFilters(statuses: readonly string[] = []) {
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const pageValue = Number(params.get('page'))
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1
  const status = statuses.includes(params.get('status') || '') ? params.get('status')! : ''
  const search = params.get('search') || ''
  const update = (values: Record<string, string>, resetPage = true) => {
    const next = new URLSearchParams(typeof window === 'undefined' ? params : window.location.search)
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    if (resetPage) next.set('page', '1')
    navigate({ pathname: location.pathname, search: next.toString(), hash: location.hash }, { replace: true, preventScrollReset: true })
  }
  return {
    params, page, status, search,
    setPage: (page: number) => update({ page: String(page) }, false),
    setStatus: (status: string) => update({ status }),
    setSearch: (search: string) => update({ search }),
    update,
  }
}
