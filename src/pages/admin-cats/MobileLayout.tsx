import { readDraft, useRetainedState } from '@shared/drafts'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Input, Select } from 'antd'
import clsx from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { normalizeDynamicTypeLabel, normalizeDynamicTypeOptions, type DynamicTypeOption } from '@/api/adapters/types'
import { getCats } from '@/api/endpoints/cats'
import { getColors, getLocations, getTags } from '@/api/endpoints/types'
import { QueryState } from '@/components/feedback/QueryState'
import { usePageTitle } from '@/hooks/usePageTitle'
import { asArray, asRecord, asString, toPaged } from '@/utils/format'
import { normalizeMediaUrl } from '@/utils/media'
import { useListFilters, ADMIN_PAGE_SIZE } from '@shared/useListFilters'
import { ListPagination } from '@shared/ListPagination'

type CatStatus = '在校' | '领养处理中' | '已领养' | '已毕业' | '住院' | '喵星'
type CatFilter = '全部' | CatStatus

type CatItem = {
  id: string
  name: string
  avatar: string
  status: CatStatus
  color: string
  campus: string
  location: string
  meta: string
  tags: string[]
}

const filters: CatFilter[] = ['全部', '在校', '已领养', '喵星', '住院', '领养处理中']
const statusCodes: Partial<Record<CatFilter, string>> = { 在校: '0', 已领养: '1', 喵星: '2', 住院: '3', 领养处理中: '4' }

const statusStyle: Record<CatStatus, string> = {
  在校: 'bg-[#ecfdf3] text-[#2e7d32]',
  领养处理中: 'bg-[#ffebee] text-[#d32f2f]',
  已领养: 'bg-[#e8f5e9] text-[#2e7d32]',
  已毕业: 'bg-[#eff6ff] text-[#1565c0]',
  住院: 'bg-[#fff7ed] text-[#f57c00]',
  喵星: 'bg-[#fff8e1] text-[#ffa000]',
}

const campusCodeToLabelMap: Record<string, string> = {
  '0': '中心校区',
  '1': '趵突泉校区',
  '2': '洪家楼校区',
  '3': '千佛山校区',
  '4': '兴隆山校区',
  '5': '软件园校区',
  '6': '青岛校区',
  '7': '威海校区',
}

const campusEnumToLabelMap: Record<string, string> = {
  CENTRAL: '中心校区',
  BAOTUQUAN: '趵突泉校区',
  HONGJIALOU: '洪家楼校区',
  QIANFOSHAN: '千佛山校区',
  XINGLONGSHAN: '兴隆山校区',
  SOFTWARE_PARK: '软件园校区',
  QINGDAO: '青岛校区',
  WEIHAI: '威海校区',
}

function firstPresent(...values: unknown[]): unknown {
  return values.find((value) => {
    if (value === null || value === undefined) return false
    return typeof value !== 'string' || value.trim().length > 0
  })
}

function nonNumericLabel(value: unknown, fallback = ''): string {
  const label = asString(value).trim()
  if (!label || /^\d+$/.test(label)) return fallback
  return label
}

function resolveDynamicLabel(value: unknown, options: DynamicTypeOption[], fallback = ''): string {
  return normalizeDynamicTypeLabel(value, options, nonNumericLabel(value, fallback)) || fallback
}

function unwrapRawRecord(value: unknown): Record<string, unknown> {
  let row = asRecord(value)
  for (let index = 0; index < 3; index += 1) {
    const nested = asRecord(row.raw)
    if (!Object.keys(nested).length) return row
    row = nested
  }
  return row
}

function normalizeCampus(rawCampus: unknown): string {
  if (typeof rawCampus === 'number' && Number.isFinite(rawCampus)) {
    return campusCodeToLabelMap[String(rawCampus)] ?? String(rawCampus)
  }

  const record = asRecord(rawCampus)
  if (Object.keys(record).length > 0) {
    return normalizeCampus(record.campusName || record.label || record.name || record.title || record.code || record.id || record.value)
  }

  const campus = asString(rawCampus).trim()
  if (!campus) return ''
  if (campus in campusCodeToLabelMap) return campusCodeToLabelMap[campus]
  const enumCampus = campus.toUpperCase()
  if (enumCampus in campusEnumToLabelMap) return campusEnumToLabelMap[enumCampus]
  return campus
}

function normalizeStatus(rawStatus: unknown): CatStatus {
  const numeric = String(rawStatus)
  const label = filters.find((item) => statusCodes[item] === numeric)
  if (label && label !== '全部') return label
  const status = asString(rawStatus).trim().toUpperCase()
  if (!status) return '在校'
  if (status.includes('待领养') || status.includes('处理中') || status.includes('交接') || status.includes('PENDING') || status.includes('WAIT')) return '领养处理中'
  if (status.includes('住院') || status.includes('治疗') || status.includes('TREAT') || status.includes('HOSPITAL')) return '住院'
  if (status.includes('喵星') || status.includes('MEOW') || status.includes('STAR')) return '喵星'
  if (status.includes('毕业') || status.includes('GRADUATE')) return '已毕业'
  if (status.includes('领养') || status.includes('ADOPTED')) return '已领养'
  if (status.includes('在校') || status.includes('SCHOOL') || status.includes('CAMPUS')) return '在校'
  return '在校'
}

function normalizeTagLabels(values: unknown, tagOptions: DynamicTypeOption[]): string[] {
  return asArray<unknown>(values)
    .map((value) => {
      const fallback = asString(value).trim()
      return normalizeDynamicTypeLabel(value, tagOptions, /^\d+$/.test(fallback) ? '' : fallback)
    })
    .filter(Boolean)
}

type AdminCatDynamicTypeOptions = {
  colors: DynamicTypeOption[]
  locations: DynamicTypeOption[]
  tags: DynamicTypeOption[]
}

function normalizeCats(payload: unknown, typeOptions: AdminCatDynamicTypeOptions): CatItem[] {
  const rawItems = toPaged<Record<string, unknown>>(payload).items

  return rawItems.map((item, index) => {
    const row = asRecord(item)
    const raw = unwrapRawRecord(row.raw || row)
    const basicInfo = asRecord(raw.basicInfo)
    const status = normalizeStatus(firstPresent(raw.status, basicInfo.status, row.status, raw.statusText))
    const colorValue = firstPresent(
      raw.colorName,
      basicInfo.colorName,
      raw.colorLabel,
      basicInfo.colorLabel,
      raw.colorId,
      basicInfo.colorId,
      raw.color,
      basicInfo.color,
      row.color,
    )
    const campusValue = firstPresent(
      raw.campusName,
      basicInfo.campusName,
      raw.campusLabel,
      basicInfo.campusLabel,
      raw.campusCode,
      basicInfo.campusCode,
      raw.campusId,
      basicInfo.campusId,
      raw.campus,
      basicInfo.campus,
      row.campus,
    )
    const locationValue = firstPresent(
      raw.locationName,
      raw.hauntLocationName,
      basicInfo.locationName,
      basicInfo.hauntLocationName,
      raw.locationLabel,
      basicInfo.locationLabel,
      raw.locationId,
      basicInfo.locationId,
      raw.hauntLocation,
      basicInfo.hauntLocation,
      raw.location,
      row.location,
    )
    const color = resolveDynamicLabel(colorValue, typeOptions.colors, '未知花色')
    const campus = normalizeCampus(campusValue)
    const location = resolveDynamicLabel(locationValue, typeOptions.locations, campus || '未知地点')
    const meta = [color, campus || location].filter(Boolean).join(' · ')

    return {
      id: asString(row.id, String(index + 1)),
      name: asString(row.name, `猫咪${index + 1}`),
      avatar: normalizeMediaUrl(row.avatar || row.image),
      status,
      color,
      campus,
      location,
      meta,
      tags: normalizeTagLabels(firstPresent(raw.tagNames, raw.tags, raw.tagIds, row.tagNames, row.tags, row.tagIds), typeOptions.tags),
    }
  })
}

type CatCoverProps = {
  src: string
  alt: string
}

function CatCover({ src, alt }: CatCoverProps) {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [src])

  if (!src || hasError) return null

  return <img alt={alt} className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" src={src} onError={() => setHasError(true)} />
}

export function MobileLayout() {
  usePageTitle('猫咪档案管理')
  const navigate = useNavigate()
  const [resumeEditor, setResumeEditor] = useRetainedState('admin-cats-dialog', 'editDialogOpen', false)
  useEffect(() => {
    if (!resumeEditor) return
    const cat = readDraft('admin-cats-dialog').values.selectedCatForEdit as { id: string } | null
    setResumeEditor(false)
    navigate(`/admin/cats/${cat?.id || 'new'}/edit`)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 挂载时接续桌面端正在编辑的档案。
  }, [resumeEditor])
  const listFilters = useListFilters(['0', '1', '2', '3', '4'])
  const { page, search: keywordInput, setSearch: setKeywordInput } = listFilters
  const activeFilter = filters.find((item) => statusCodes[item] === listFilters.status) || '全部'
  const setActiveFilter = (filter: CatFilter) => listFilters.setStatus(statusCodes[filter] || '')
  const color = listFilters.params.get('color') || ''

  const query = useQuery({
    refetchOnMount: 'always',
    queryKey: ['admin-cats', 'list', page, listFilters.status, color, keywordInput],
    queryFn: () =>
      getCats({
        page,
        pageSize: ADMIN_PAGE_SIZE,
        ...(listFilters.status ? { status: listFilters.status } : {}),
        ...(color ? { color } : {}),
        ...(keywordInput.trim() ? { search: keywordInput.trim() } : {}),
      }),
  })
  const tagsQuery = useQuery({
    queryKey: ['type', 'tags'],
    queryFn: getTags,
  })
  const colorsQuery = useQuery({
    queryKey: ['type', 'colors'],
    queryFn: getColors,
  })
  const locationsQuery = useQuery({
    queryKey: ['type', 'locations'],
    queryFn: getLocations,
  })
  const typeOptions = useMemo(
    () => ({
      colors: normalizeDynamicTypeOptions(colorsQuery.data?.data),
      locations: normalizeDynamicTypeOptions(locationsQuery.data?.data),
      tags: normalizeDynamicTypeOptions(tagsQuery.data?.data),
    }),
    [colorsQuery.data?.data, locationsQuery.data?.data, tagsQuery.data?.data],
  )

  const cats = useMemo(() => normalizeCats(query.data?.data, typeOptions), [query.data?.data, typeOptions])

  const filteredCats = cats

  return (
    <div className="pb-8">
      <section className="mb-5 rounded-b-[24px] bg-white px-5 pb-5 pt-5 shadow-[0_2px_15px_rgba(0,0,0,0.04)]">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-[#2c3e50]">猫咪档案管理</h1>
          <Link
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffd54f] text-[#5d4037] shadow-[0_4px_10px_rgba(255,213,79,0.4)]"
            to="/admin/cats/new/edit"
          >
            <PlusOutlined />
          </Link>
        </div>

        <Input
          className="!h-12 !rounded-2xl !border-none !bg-[#f5f5f5]"
          placeholder="搜索猫咪名字、花色或地点..."
          prefix={<SearchOutlined className="text-[#bdc3c7]" />}
          value={keywordInput}
          onChange={(event) => setKeywordInput(event.target.value)}
        />
        <Select aria-label="花色筛选" className="mt-3 w-full" value={color} onChange={(color) => listFilters.update({ color })}
          options={[{ label: '全部花色', value: '' }, ...typeOptions.colors.map((item) => ({ label: item.label, value: String(item.value) }))]} />
      </section>

      <div className="h5-content pt-0">
        <div className="chip-row mb-4">
          {filters.map((item) => (
            <button
              key={item}
              aria-pressed={activeFilter === item}
              className={clsx(
                'whitespace-nowrap rounded-full border px-4 py-2 text-[13px] transition',
                activeFilter === item
                  ? 'border-transparent bg-[#ffd54f] font-semibold text-[#5d4037] shadow-[0_4px_10px_rgba(255,213,79,0.3)]'
                  : 'border-black/[0.05] bg-white text-[#7f8c8d]',
              )}
              onClick={() => setActiveFilter(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>

        <QueryState
          error={query.error}
          isEmpty={!query.isLoading && !query.error && filteredCats.length === 0}
          isLoading={query.isLoading}
          emptyDescription="暂无猫咪档案"
        >
          <div className="grid grid-cols-2 gap-3">
            {filteredCats.map((cat) => (
              <article
                key={cat.id}
                className="cursor-pointer overflow-hidden rounded-[20px] border border-black/[0.03] bg-white shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition hover:shadow-[0_10px_24px_rgba(0,0,0,0.08)]"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/admin/cats/${cat.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    navigate(`/admin/cats/${cat.id}`)
                  }
                }}
              >
                <div className="relative h-32 bg-gradient-to-br from-[#d1d5db] to-[#94a3b8]">
                  <CatCover alt={cat.name} src={cat.avatar} />
                  <span
                    className={clsx(
                      'absolute right-2 top-2 rounded-xl px-2 py-1 text-[10px] font-bold',
                      statusStyle[cat.status],
                    )}
                  >
                    {cat.status}
                  </span>
                </div>

                <div className="p-3">
                  <h3 className="mb-1 text-[15px] font-bold text-[#2c3e50]">{cat.name}</h3>
                  <p className="mb-3 text-[11px] text-[#7f8c8d]">{cat.meta}</p>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      className="rounded-lg bg-[#fff8e1] py-1.5 text-center text-[12px] font-semibold text-[#ffa000]"
                      state={{ cat }}
                      to={`/admin/cats/${cat.id}/edit`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      编辑
                    </Link>
                    <Link
                      className="rounded-lg bg-[#f5f5f5] py-1.5 text-center text-[12px] font-semibold text-[#7f8c8d]"
                      to={`/admin/cats/${cat.id}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      详情
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </QueryState>
        <ListPagination data={query.data?.data} page={page} onChange={listFilters.setPage} loading={query.isFetching} />


      </div>

      <Link
        className="fixed bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#ffd54f] text-[24px] text-[#5d4037] shadow-[0_8px_25px_rgba(255,213,79,0.5)]"
        to="/admin/cats/new/edit"
      >
        <PlusOutlined />
      </Link>
    </div>
  )
}
