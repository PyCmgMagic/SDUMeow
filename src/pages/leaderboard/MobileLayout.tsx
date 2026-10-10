import { ArrowLeftOutlined, CrownFilled } from '@ant-design/icons'
import { useQueries, useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { getCatDetail } from '@/api/endpoints/cats'
import { getLeaderboard } from '@/api/endpoints/leaderboard'
import { QueryState } from '@/components/feedback/QueryState'
import { usePageTitle } from '@/hooks/usePageTitle'
import { asNumber, asRecord, asString, toPaged } from '@/utils/format'
import { leaderboardTabs, useLeaderboardFilters } from '@shared/useLeaderboardFilters'

type RankCat = {
  rank: number
  catId: string
  name: string
  avatar: string
  campus: string
  feedCount: number
}

const UNKNOWN_CAMPUS = '未知校区'

const campusCodeLabelMap: Record<string, string> = {
  '0': '中心校区',
  '1': '趵突泉校区',
  '2': '洪家楼校区',
  '3': '千佛山校区',
  '4': '兴隆山校区',
  '5': '软件园校区',
  '6': '青岛校区',
  '7': '威海校区',
}

const campusEnumLabelMap: Record<string, string> = {
  CENTRAL: '中心校区',
  ZHONG_XIN: '中心校区',
  BAOTUQUAN: '趵突泉校区',
  BAO_TU_QUAN: '趵突泉校区',
  HONGJIALOU: '洪家楼校区',
  HONG_JIA_LOU: '洪家楼校区',
  QIANFOSHAN: '千佛山校区',
  QIAN_FO_SHAN: '千佛山校区',
  XINGLONGSHAN: '兴隆山校区',
  XING_LONG_SHAN: '兴隆山校区',
  SOFTWARE_PARK: '软件园校区',
  QINGDAO: '青岛校区',
  QING_DAO: '青岛校区',
  WEIHAI: '威海校区',
  WEI_HAI: '威海校区',
}

function firstPresent(...values: unknown[]): unknown {
  return values.find((value) => {
    if (value === null || value === undefined) return false
    if (typeof value !== 'string') return true
    const text = value.trim()
    return text.length > 0 && text !== UNKNOWN_CAMPUS
  })
}

function normalizeCampus(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return campusCodeLabelMap[String(value)] ?? String(value)
  }

  const record = asRecord(value)
  if (Object.keys(record).length > 0) {
    return normalizeCampus(
      firstPresent(
        record.campusName,
        record.campusLabel,
        record.label,
        record.name,
        record.title,
        record.campus,
        record.campusCode,
        record.campusId,
        record.code,
        record.id,
        record.value,
      ),
    )
  }

  const campus = asString(value).trim()
  if (!campus) return UNKNOWN_CAMPUS
  if (campus in campusCodeLabelMap) return campusCodeLabelMap[campus]
  return campusEnumLabelMap[campus.toUpperCase()] ?? campus
}

function normalizeLeaderboard(payload: unknown): RankCat[] {
  const items = toPaged<Record<string, unknown>>(payload).items

  return items
    .map((item, index) => {
      const row = asRecord(item)
      const cat = asRecord(row.cat)
      const catInfo = asRecord(row.catInfo || row.cat_info)
      const basicInfo = asRecord(firstPresent(row.basicInfo, row.catBasicInfo, row.cat_basic_info, cat.basicInfo, catInfo.basicInfo))
      const rank = asNumber(row.rank, index + 1)

      return {
        rank,
        catId: asString(firstPresent(row.catId, row.cat_id, cat.id, catInfo.id, row.id)),
        name: asString(firstPresent(row.name, row.catName, row.cat_name, cat.name, catInfo.name), `猫咪 ${rank}`),
        avatar: asString(firstPresent(row.avatar, row.catAvatar, row.cat_avatar, cat.avatar, catInfo.avatar), ''),
        campus: normalizeCampus(
          firstPresent(
            row.campusName,
            row.campusLabel,
            row.catCampusName,
            row.catCampus,
            row.campusCode,
            row.campusId,
            row.campus,
            basicInfo.campusName,
            basicInfo.campusLabel,
            basicInfo.campusCode,
            basicInfo.campusId,
            basicInfo.campus,
            cat.campusName,
            cat.campusLabel,
            cat.campusCode,
            cat.campusId,
            cat.campus,
            catInfo.campusName,
            catInfo.campusLabel,
            catInfo.campusCode,
            catInfo.campusId,
            catInfo.campus,
          ),
        ),
        feedCount: asNumber(row.value, asNumber(row.feedCount, asNumber(row.popularity, 0))),
      }
    })
    .sort((a, b) => a.rank - b.rank)
}

export function MobileLayout() {
  usePageTitle('全校封神榜')
  const navigate = useNavigate()
  const { tab, setTab, showAll, setShowAll } = useLeaderboardFilters()

  const query = useQuery({
    queryKey: ['leaderboard', tab.key],
    queryFn: () => getLeaderboard(tab.key),
  })

  const rankedCats = useMemo(() => normalizeLeaderboard(query.data?.data), [query.data?.data])
  const campusLookupCatIds = useMemo(
    () => Array.from(new Set(rankedCats.filter((item) => item.campus === UNKNOWN_CAMPUS && item.catId).map((item) => item.catId))),
    [rankedCats],
  )
  const campusQueries = useQueries({
    queries: campusLookupCatIds.map((catId) => ({
      queryKey: ['cat-detail', catId],
      queryFn: () => getCatDetail(catId),
      enabled: Boolean(catId),
    })),
  })
  const campusByCatId = useMemo(() => {
    const result: Record<string, string> = {}

    campusLookupCatIds.forEach((catId, index) => {
      const catRecord = asRecord(campusQueries[index]?.data?.data)
      const basicInfo = asRecord(catRecord.basicInfo)
      const campus = normalizeCampus(
        firstPresent(
          catRecord.campusName,
          catRecord.campusLabel,
          catRecord.campusCode,
          catRecord.campusId,
          catRecord.campus,
          basicInfo.campusName,
          basicInfo.campusLabel,
          basicInfo.campusCode,
          basicInfo.campusId,
          basicInfo.campus,
        ),
      )

      if (campus !== UNKNOWN_CAMPUS) {
        result[catId] = campus
      }
    })

    return result
  }, [campusLookupCatIds, campusQueries])
  const displayRankedCats = useMemo(
    () =>
      rankedCats.map((item) => {
        if (item.campus !== UNKNOWN_CAMPUS || !item.catId) return item
        const campus = campusByCatId[item.catId]
        return campus ? { ...item, campus } : item
      }),
    [campusByCatId, rankedCats],
  )
  const topThree = useMemo(() => {
    const source = displayRankedCats.slice(0, 3)
    const first = source.find((item) => item.rank === 1)
    const second = source.find((item) => item.rank === 2)
    const third = source.find((item) => item.rank === 3)
    const ordered = [second, first, third].filter((item): item is RankCat => Boolean(item))

    return ordered.length === source.length ? ordered : source
  }, [displayRankedCats])
  const followRanks = displayRankedCats.slice(3, showAll ? undefined : 20)

  return (
    <div className="h5-content pb-6">
      <div className="mb-5 flex items-center">
        <button className="top-icon-btn" type="button" onClick={() => navigate(-1)}>
          <ArrowLeftOutlined />
        </button>
        <h1 className="flex-1 text-center text-[18px] font-bold">全校封神榜</h1>
        <span className="w-9" />
      </div>

      <div className="mb-7 flex rounded-full bg-white p-1 shadow-[0_8px_16px_rgba(0,0,0,0.06)]">
        {leaderboardTabs.map((item) => (
          <button key={item.key} aria-pressed={tab.key === item.key}
            className={clsx('min-w-0 flex-1 rounded-full py-2 text-[13px] font-semibold', tab.key === item.key ? 'bg-[#1a1a1a] text-white' : 'text-[#64748b]')}
            onClick={() => setTab(item.key)} type="button">{item.label}</button>
        ))}
      </div>

      <QueryState
        error={query.error}
        isEmpty={!query.isLoading && !query.error && rankedCats.length === 0}
        isLoading={query.isLoading}
        emptyDescription="暂无排行数据"
      >
        <div className="mb-7 flex items-end justify-center gap-4">
          {topThree.map((item) => {
            const first = item.rank === 1
            const content = (
              <>
                <div className="relative mx-auto w-fit max-w-full pt-1">
                  {first ? <CrownFilled className="absolute -top-5 left-1/2 -translate-x-1/2 text-[22px] text-[#ffd700]" /> : null}
                  <div
                    className={clsx(
                      'mx-auto aspect-square max-w-full overflow-hidden rounded-full bg-gradient-to-br from-[#d1d5db] to-[#94a3b8]',
                      first ? 'w-[90px] border-4 border-[#ffd700]' : 'w-[72px] border-4 border-white',
                    )}
                  >
                    {item.avatar ? <img alt={item.name} className="h-full w-full object-cover" src={item.avatar} /> : null}
                  </div>
                  <div
                    className={clsx(
                      'mx-auto mt-1 flex items-center justify-center rounded-full border-2 border-white text-[12px] font-extrabold text-white',
                      first ? 'h-[30px] w-[30px] bg-[#ffd700] text-[14px]' : item.rank === 2 ? 'h-6 w-6 bg-[#c0c0c0]' : 'h-6 w-6 bg-[#cd7f32]',
                    )}
                  >
                    {item.rank}
                  </div>
                </div>
                <p title={item.name} className={clsx('mt-2 line-clamp-2 h-11 break-words font-bold leading-[22px] text-[#333]', first ? 'text-[15px]' : 'text-[13px]')}>{item.name}</p>
                <p title={item.campus} className="truncate text-[11px] text-[#7f8c8d]">{item.campus}</p>
                <p title={`${item.feedCount} ${tab.unit}`} className={clsx('truncate text-[11px]', first ? 'font-semibold text-[#ffa000]' : 'text-[#999]')}>{item.feedCount} {tab.unit}</p>
              </>
            )

            return item.catId ? (
              <Link key={item.catId} className={clsx('min-w-0 flex-1 text-center', first && '-translate-y-4')} to={`/cats/${item.catId}`}>
                {content}
              </Link>
            ) : (
              <div key={`${item.name}-${item.rank}`} className={clsx('min-w-0 flex-1 text-center', first && '-translate-y-4')}>
                {content}
              </div>
            )
          })}
        </div>

        <div className="space-y-3">
          {followRanks.map((item) => {
            const rowContent = (
              <>
                <div className="w-8 shrink-0 text-center text-[16px] font-bold text-[#ccc]">{item.rank}</div>
                <div className="mr-3 h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#d1d5db] to-[#94a3b8]">
                  {item.avatar ? <img alt={item.name} className="h-full w-full object-cover" src={item.avatar} /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p title={item.name} className="line-clamp-2 break-words text-[14px] font-semibold text-[#333]">{item.name}</p>
                  <p title={`常驻：${item.campus}`} className="truncate text-[11px] text-[#999]">常驻：{item.campus}</p>
                </div>
                <span className="ml-2 shrink-0 whitespace-nowrap text-[14px] font-semibold text-[#555]">{item.feedCount} {tab.unit}</span>
              </>
            )

            return item.catId ? (
              <Link
                key={item.catId}
                className="flex items-center rounded-[16px] bg-white px-3 py-3 shadow-[0_8px_16px_rgba(0,0,0,0.06)]"
                to={`/cats/${item.catId}`}
              >
                {rowContent}
              </Link>
            ) : (
              <div key={`${item.name}-${item.rank}`} className="flex items-center rounded-[16px] bg-white px-3 py-3 shadow-[0_8px_16px_rgba(0,0,0,0.06)]">
                {rowContent}
              </div>
            )
          })}
        </div>
        {displayRankedCats.length > 20 ? (
          <button type="button" className="mt-4 w-full py-3 text-sm text-[#64748b]" onClick={() => setShowAll(!showAll)}>{showAll ? '收起' : '查看更多'}</button>
        ) : null}
      </QueryState>
    </div>
  )
}
