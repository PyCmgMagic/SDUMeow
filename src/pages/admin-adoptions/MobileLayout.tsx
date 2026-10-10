import { CalendarOutlined, ClockCircleOutlined, LeftOutlined, RightOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Input } from 'antd'
import clsx from 'clsx'
import { type WheelEvent, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'

import { getAdminAdoptions } from '@/api/endpoints/adoptions'
import { QueryState } from '@/components/feedback/QueryState'
import { usePageTitle } from '@/hooks/usePageTitle'
import { asRecord, asString, formatTimestampText, toPaged } from '@/utils/format'
import { useListFilters, ADMIN_PAGE_SIZE } from '@shared/useListFilters'
import { ListPagination } from '@shared/ListPagination'
import { filterPagedList } from '@shared/filterPagedList'

type AdoptionStatus = 'pending' | 'interview' | 'approved' | 'rejected' | 'completed' | 'cancelled'
type FilterKey = 'all' | AdoptionStatus

type AdoptionItem = {
  id: string
  applicant: string
  catId: string
  catName: string
  catAvatar: string
  catMeta: string
  status: AdoptionStatus
  time: string
  reason?: string
  phone?: string
  wechat?: string
}

const statusText: Record<AdoptionStatus, string> = {
  pending: '待处理',
  interview: '待面谈',
  approved: '通过',
  rejected: '拒绝',
  completed: '已完成',
  cancelled: '已取消',
}

const apiStatusByStatus: Record<AdoptionStatus, string> = {
  pending: 'PENDING',
  interview: 'INTERVIEW',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
}
const statusOrder: AdoptionStatus[] = ['pending', 'interview', 'approved', 'rejected', 'completed', 'cancelled']

function toAdoptionStatus(value: unknown, fallbackStatus: AdoptionStatus): AdoptionStatus {
  if (value !== null && value !== undefined && value !== '' && statusOrder[Number(value)]) return statusOrder[Number(value)]
  const status = asString(value, fallbackStatus).trim().toUpperCase()
  if (status.includes('CANCEL')) return 'cancelled'
  if (status.includes('COMPLETED')) return 'completed'

  if (status.includes('REJECT') || status.includes('REFUSE') || status.includes('DENY') || status.includes('驳回') || status.includes('拒绝')) {
    return 'rejected'
  }

  if (status.includes('INTERVIEW') || status.includes('MEETING') || status.includes('面谈')) {
    return 'interview'
  }

  if (
    status.includes('APPROV') ||
    status.includes('PASS') ||
    status.includes('ACCEPT') ||
    status.includes('COMPLETED') ||
    status.includes('通过')
  ) {
    return 'approved'
  }

  return 'pending'
}

function normalizeItems(payload: unknown, fallbackStatus: AdoptionStatus): AdoptionItem[] {
  const rawItems = toPaged<Record<string, unknown>>(payload).items

  return rawItems.map((item, index) => {
    const row = asRecord(item)

    return {
      id: asString(row.id, String(index + 1)),
      catId: asString(row.catId, ''),
      applicant: asString(row.applicantName || row.userName, `申请人${index + 1}`),
      catName: asString(row.catName, `猫咪${index + 1}`),
      catAvatar: asString(row.catAvatar, ''),
      catMeta: asString(row.catMeta || row.location, '软件园校区'),
      status: toAdoptionStatus(row.status, fallbackStatus),
      time: formatTimestampText(row.createTime || row.createdAt || row.time, '刚刚提交'),
      reason: asString(row.reason),
      phone: asString(asRecord(row.contact).phone),
      wechat: asString(asRecord(row.contact).wechat),
    }
  })
}

export function MobileLayout() {
  usePageTitle('领养申请审批')
  const filters = useListFilters(['0', '1', '2', '3', '4', '5'])
  const keywordInput = filters.search
  const setKeywordInput = filters.setSearch
  const keyword = keywordInput.trim().toLowerCase()
  const activeFilter: FilterKey = filters.status ? statusOrder[Number(filters.status)] : 'all'
  const setActiveFilter = (filter: FilterKey) => filters.setStatus(filter === 'all' ? '' : String(statusOrder.indexOf(filter)))
  const apiStatus = activeFilter === 'all' ? '' : apiStatusByStatus[activeFilter]
  const filterRowRef = useRef<HTMLDivElement | null>(null)

  const query = useQuery({
    refetchOnMount: 'always',
    queryKey: ['admin-adoptions', 'list', filters.page, filters.status, keyword],
    queryFn: async () => {
      const load = async (page: number, size: number) => (await getAdminAdoptions({ status: apiStatus || undefined, page, size })).data
      if (!keyword) return getAdminAdoptions({ status: apiStatus || undefined, page: filters.page, size: ADMIN_PAGE_SIZE })
      const data = await filterPagedList<Record<string, unknown>>(load, filters.page, (row) =>
        [row.id, row.applicantName || row.userName, row.catName, asRecord(row.contact).phone, asRecord(row.contact).wechat].join(' ').toLowerCase().includes(keyword))
      return { data }
    },
  })
  const allItems = useMemo(() => {
    return normalizeItems(query.data?.data, 'pending')
  }, [query.data?.data])
  const items = allItems

  const handleFilterWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
    event.preventDefault()
    filterRowRef.current?.scrollBy({ left: event.deltaY, behavior: 'smooth' })
  }
  const scrollFilters = (direction: -1 | 1) => {
    filterRowRef.current?.scrollBy({ left: direction * 132, behavior: 'smooth' })
  }
  const isLoading = query.isLoading
  const queryError = query.error

  return (
    <div className="pb-8">
      <section className="mb-5 rounded-b-[24px] bg-white px-5 pb-5 pt-5 shadow-[0_2px_15px_rgba(0,0,0,0.04)]">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-[#2c3e50]">领养申请审批</h1>
          <span className="rounded-lg bg-[#f1f5f9] px-2 py-1 text-[11px] text-[#94a3b8]">
            <CalendarOutlined className="mr-1" />
            {new Date().toLocaleDateString('zh-CN').replaceAll('/', '.')}
          </span>
        </div>

        <Input
          className="!h-12 !rounded-2xl !border-none !bg-[#f5f5f5]"
          placeholder="搜索申请单号、姓名或猫咪..."
          prefix={<SearchOutlined className="text-[#bdc3c7]" />}
          value={keywordInput}
          onChange={(event) => setKeywordInput(event.target.value)}
        />
      </section>

      <div className="h5-content pt-0">
        <div className="mb-4 flex items-center gap-2">
          <button
            aria-label="向左查看更多分类"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[12px] text-[#64748b] shadow-sm"
            onClick={() => scrollFilters(-1)}
            type="button"
          >
            <LeftOutlined />
          </button>
          <div ref={filterRowRef} className="chip-row min-w-0 flex-1 gap-2 pb-2" onWheel={handleFilterWheel}>
            {[
              ['all', '全部申请'],
              ['pending', '待处理'],
              ['interview', '待面谈'],
              ['approved', '通过'],
              ['rejected', '拒绝'],
              ['completed', '已完成'],
              ['cancelled', '已取消'],
            ].map(([key, label]) => (
              <button
                key={String(key)}
                aria-pressed={activeFilter === key}
                className={clsx(
                  'shrink-0 whitespace-nowrap rounded-xl border px-3 py-2 text-sm shadow-[0_4px_10px_rgba(0,0,0,0.02)]',
                  activeFilter === key ? 'border-transparent bg-[#66bb6a] text-white' : 'border-black/[0.03] bg-white text-[#2c3e50]',
                )}
                onClick={() => setActiveFilter(key as FilterKey)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <button
            aria-label="向右查看更多分类"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[12px] text-[#64748b] shadow-sm"
            onClick={() => scrollFilters(1)}
            type="button"
          >
            <RightOutlined />
          </button>
        </div>

        <QueryState
          error={queryError}
          isEmpty={!isLoading && !queryError && items.length === 0}
          isLoading={isLoading}
          emptyDescription="暂无领养申请"
        >
          <div className="space-y-4">
            {items.map((item) => (
              <Link key={item.id} className="block" to={`/admin/adoptions/${item.id}?status=${apiStatusByStatus[item.status]}`}>
                <div
                  className={clsx(
                    'rounded-[20px] border border-black/[0.03] bg-white p-4 shadow-[0_10px_20px_rgba(0,0,0,0.02)]',
                    item.status === 'pending' && 'border-l-4 border-l-[#ffa726]',
                    item.status === 'interview' && 'border-l-4 border-l-[#42a5f5]',
                    item.status === 'approved' && 'border-l-4 border-l-[#26a69a]',
                    item.status === 'rejected' && 'border-l-4 border-l-[#bdc3c7]',
                  )}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f1f5f9] text-[11px] text-[#475569]">
                      <UserOutlined />
                    </div>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-[#2c3e50]">{item.applicant}</span>
                    <span
                      className={clsx(
                        'ml-auto shrink-0 whitespace-nowrap rounded-xl px-2 py-1 text-[11px] font-bold',
                        item.status === 'pending' && 'bg-[#fff8e1] text-[#ffa000]',
                        item.status === 'interview' && 'bg-[#e3f2fd] text-[#1565c0]',
                        item.status === 'approved' && 'bg-[#e8f5e9] text-[#2e7d32]',
                        item.status === 'rejected' && 'bg-[#f5f5f5] text-[#999]',
                      )}
                    >
                      {statusText[item.status]}
                    </span>
                  </div>

                  <div className="mb-3 flex gap-3 rounded-xl bg-[#f8fafc] p-3">
                    <div className="h-[50px] w-[50px] overflow-hidden rounded-[10px] bg-gradient-to-br from-[#d1d5db] to-[#94a3b8]">
                      {item.catAvatar ? <img alt={item.catName} className="h-full w-full object-cover" src={item.catAvatar} /> : null}
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-bold text-[#2c3e50]">{item.catName}</p>
                      <p className="text-[11px] text-[#7f8c8d]">{item.catMeta}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[12px] text-[#7f8c8d]">
                    <span className={item.status === 'rejected' ? 'text-[#d32f2f]' : ''}>
                      <ClockCircleOutlined className="mr-1" />
                      {item.reason || item.time}
                    </span>
                    <span className="text-[#e2e8f0]">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </QueryState>
        <ListPagination data={query.data?.data} page={filters.page} onChange={filters.setPage} loading={query.isFetching} />
      </div>
    </div>
  )
}
