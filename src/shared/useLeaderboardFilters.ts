import { useListFilters } from './useListFilters'

export const leaderboardTabs = [
  { key: 'popularity', label: '人气榜', unit: '票' },
  { key: 'appearance', label: '颜值榜', unit: '颜值分' },
  { key: 'gluttony', label: '吃货榜', unit: '贪吃值' },
  { key: 'fight', label: '战力榜', unit: '战力值' },
] as const

export function useLeaderboardFilters() {
  const { params, update } = useListFilters()
  const tab = leaderboardTabs.find((tab) => tab.key === params.get('type')) || leaderboardTabs[0]
  return {
    tab,
    showAll: params.get('expanded') === '1',
    setTab: (type: string) => update({ type, expanded: '' }, false),
    setShowAll: (show: boolean) => update({ expanded: show ? '1' : '' }, false),
  }
}
