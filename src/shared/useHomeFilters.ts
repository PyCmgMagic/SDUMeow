import { useSearchParams } from 'react-router-dom'
import { campusCode, useCampusStore } from './campus.store'

export function useHomeFilters() {
  const [params, setParams] = useSearchParams()
  const campus = useCampusStore((state) => state.campus)
  const setCampus = useCampusStore((state) => state.setCampus)
  const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1)
  const update = (values: Record<string, string>, resetPage = true) => {
    setParams((current) => {
      const next = new URLSearchParams(current)
      for (const [key, value] of Object.entries(values)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      if (resetPage) next.set('page', '1')
      return next
    }, { replace: true })
  }
  return {
    campus: params.get('campus') ? campusCode(params.get('campus')!) : campusCode(campus),
    search: params.get('search') || '',
    color: params.get('color') || '',
    page,
    setSearch: (search: string) => update({ search }),
    setColor: (color: string) => update({ color }),
    setPage: (page: number) => update({ page: String(page) }, false),
    setCampus: (campus: string) => { setCampus(campus); update({ campus: campusCode(campus) }) },
  }
}
