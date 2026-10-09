import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { catApi } from '@pc/lib/api'
import { cn } from '@pc/lib/utils'
import { CampusMap, type LeaderboardItem } from '@pc/types'
import { leaderboardTabs, useLeaderboardFilters } from '@shared/useLeaderboardFilters'
import { Button } from '@pc/components/ui/button'
import { Crown, MapPin, Info, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'


export function DesktopLayout() {
  const navigate = useNavigate()
  const { tab, setTab: setCurrentTab, showAll, setShowAll } = useLeaderboardFilters()
  const currentTab = tab.key
  const [list, setList] = useState<LeaderboardItem[]>([])
  const defaultShowCount = 17 // 默认显示的剩余数量（第4-20名）

  // 榜单选项配置
  const tabs = leaderboardTabs

  // --- 数据计算  ---
  const topThree = (() => {
    // 安全检查：如果 list 不是数组，直接返回空，防止崩盘
    if (!Array.isArray(list) || list.length === 0) return []

    const first = list[0]
    const second = list[1]
    const third = list[2]
    return [second, first, third].filter((item): item is LeaderboardItem => Boolean(item))
  })()

  // 剩余列表（全部，不含前3名）
  const allRestList = Array.isArray(list) ? list.slice(3) : []

  // 显示的剩余列表（默认17个，点击查看更多后显示全部）
  const restList = showAll ? allRestList : allRestList.slice(0, defaultShowCount)

  // 是否有更多数据可显示
  const hasMore = allRestList.length > defaultShowCount

  const campusName = (campus?: number | string) => {
    if (campus === undefined || campus === null || campus === '') return '未知校区'
    const campusId = Number(campus)
    return Number.isNaN(campusId) ? String(campus) : CampusMap[campusId] || `校区 #${campusId}`
  }

  //单位列表
  const scoreUnit = (() => {
    switch (currentTab) {
      case 'popularity':
        return '票'
      case 'appearance':
        return '颜值分'
      case 'gluttony':
        return '贪吃值'
      case 'fight':
        return '战力值'
      default:
        return '票'
    }
  })()

  useEffect(() => {
    let active = true
    setList([])
    void catApi.getLeaderboard(currentTab, 100).then((items) => {
      if (active) setList(items)
    }).catch((error) => {
      if (active) console.error('请求失败:', error)
    })
    return () => { active = false }
  }, [currentTab])


  // 领奖台皇冠颜色
  const getCrownColor = (index: number) => {
    if (index === 1) return 'text-yellow-400 drop-shadow-md' // 金 (第1名在数组中间，index为1)
    if (index === 0) return 'text-gray-300'    // 银
    return 'text-orange-600'   // 铜
  }

  return (
    <div className="public-page mx-auto flex min-h-full w-full max-w-7xl flex-col gap-5 p-4 sm:p-6">

      {/* 1. 顶部 Banner */}
      <div className="w-full h-48 bg-gradient-to-r from-[#FF9F1C] to-[#FFB74D] rounded-2xl flex flex-col items-center justify-center text-white shadow-lg relative overflow-hidden">
        {/* 装饰背景 */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

        <div className="z-10 flex flex-col items-center">
          <Crown className="w-10 h-10 mb-2 fill-yellow-200 text-yellow-100" />
          <h1 className="text-3xl font-black tracking-widest mb-1">全校封神榜</h1>
          <p className="text-white/80 text-sm font-medium tracking-wide">人气猫咪排行榜，为你揭晓最可爱的喵星人</p>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex justify-center">
        <div className="bg-white p-1 rounded-full shadow-sm border border-gray-100 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              aria-pressed={currentTab === tab.key}
              onClick={() => setCurrentTab(tab.key)}
              className={cn(
                'px-8 py-2 rounded-full text-sm font-bold transition-all duration-300',
                currentTab === tab.key ? 'bg-white text-[#FF9F1C] shadow-md ring-1 ring-gray-100' : 'text-gray-400 hover:text-gray-600',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">

        {/* 左侧：主要内容 */}
        <div className="flex flex-col gap-8">

          {/*  领奖台 (Top 3) */}
          {topThree.length > 0 && (
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm relative">
              {/* 背景光晕 */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 bg-yellow-100/50 blur-[60px] rounded-full"></div>

              <div className="relative flex justify-center items-end gap-4 md:gap-12 pb-4">

                {/* 循环渲染 2-1-3 名 */}
                {topThree.map((cat, index) => (
                  <div
                    key={cat.id || cat.catId}
                    className={cn(
                      'flex flex-col items-center transition-transform hover:-translate-y-2 duration-300 cursor-pointer group',
                      index === 1 ? 'z-10 -mt-8' : 'z-0',
                    )}
                    onClick={() => navigate(`/cats/${cat.id || cat.catId}`)}
                  >
                    {/* 皇冠 */}
                    <Crown
                      className={cn('w-8 h-8 mb-2 animate-bounce', getCrownColor(index))}
                      style={{ animationDuration: index === 1 ? '2s' : '3s' }}
                    />

                    {/* 头像 */}
                    <div
                      className={cn(
                        'rounded-full border-4 shadow-lg overflow-hidden relative',
                        index === 1 ? 'w-28 h-28 border-[#FFD700]' : 'w-20 h-20',
                        index === 0 ? 'border-gray-300' : '',
                        index === 2 ? 'border-orange-200' : '',
                      )}
                    >
                      <img src={cat.avatar} className="w-full h-full object-cover bg-gray-100" />

                      {/* 排名角标 */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm border border-gray-100 whitespace-nowrap">
                        NO.{index === 1 ? 1 : (index === 0 ? 2 : 3)}
                      </div>
                    </div>

                    {/* 信息 */}
                    <div className="text-center mt-5">
                      <h3 className="font-bold text-gray-800 text-lg group-hover:text-[#FF9F1C] transition-colors">{cat.name}</h3>
                      <div className="text-[#FF9F1C] font-bold text-sm mt-1">
                        {cat.value} <span className="text-xs text-gray-400 font-normal">{scoreUnit}</span>
                      </div>
                    </div>
                  </div>
                ))}

              </div>
            </div>
          )}

          {/* 剩余排名列表 (4-10+) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">排行榜</h3>
              <span className="text-xs text-gray-400">实时更新</span>
            </div>

            <div className="divide-y divide-gray-50">
              {restList.map((cat, index) => (
                <div
                  key={cat.id || cat.catId}
                  className="flex items-center px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/cats/${cat.id || cat.catId}`)}
                >
                  {/* 排名序号 */}
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-4 shrink-0',
                      index < 3 ? 'bg-[#FFD700] text-white' : 'text-gray-500',
                    )}
                  >
                    {cat.rank || index + 4}
                  </div>

                  {/* 头像 */}
                  <img src={cat.avatar} className="w-12 h-12 rounded-full object-cover border border-gray-100 mr-4 bg-gray-100" />

                  {/* 信息 */}
                  <div className="flex-1">
                    <div className="font-bold text-gray-800 group-hover:text-[#FF9F1C]">{cat.name}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {campusName(cat.campus)}
                    </div>
                  </div>

                  {/* 票数 */}
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{cat.value} {scoreUnit}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* 查看更多/收起按钮 */}
            {hasMore && (
              <div className="p-4 border-t border-gray-50">
                <div className="flex flex-col items-center gap-2">
                  <Button
                    variant="ghost"
                    className="text-[#FF9F1C] hover:bg-[#FF9F1C]/10 flex items-center gap-2"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {!showAll ? (
                      <>
                        <span>查看更多</span>
                        <ChevronDown className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <span>收起</span>
                        <ChevronUp className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                  <div className="text-xs text-gray-400">
                    当前显示 {restList.length + 3}/{list.length} 只猫咪
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* 右侧：侧边栏 */}
        <div className="flex flex-col gap-6 sticky top-6">

          {/* 规则卡片 */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-[#FF9F1C]">
              <Info className="w-5 h-5" />
              <h3 className="font-bold">投票规则</h3>
            </div>
            <ul className="space-y-3 text-xs text-gray-500">
              <li className="flex gap-2 items-start">
                <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0" />
                <span>每日 00:00 统计投票数</span>
              </li>
              <li className="flex gap-2 items-start">
                <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0" />
                <span>每个用户每天最多投 3 票</span>
              </li>
              <li className="flex gap-2 items-start">
                <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0" />
                <span>系统自动剔除刷票检测</span>
              </li>
              <li className="flex gap-2 items-start">
                <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0" />
                <span>投票结果实时更新</span>
              </li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  )
}
