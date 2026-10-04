import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { userApi } from '@pc/lib/api'
import { cn } from '@pc/lib/utils'
import type { CheckinHistory } from '@pc/types'
import { Button } from '@pc/components/ui/button'
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, CheckCircle2 } from 'lucide-react'

export function DesktopLayout() {
  const navigate = useNavigate()

  // 状态
  const [loading, setLoading] = useState(false)
  const [historyData, setHistoryData] = useState<CheckinHistory | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)) // 格式: 2026-03

  // 获取签到历史
  const fetchHistory = async (month: string) => {
    setLoading(true)
    try {
      const res = await userApi.getCheckinHistory(month)
      setHistoryData(res)
    } catch (error) {
      console.error('获取签到历史失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 切换月份
  const changeMonth = (delta: number) => {
    const parts = currentMonth.split('-').map(Number)
    const year = parts[0] || new Date().getFullYear()
    const month = parts[1] || 1
    const date = new Date(year, month - 1 + delta, 1)
    const nextMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    setCurrentMonth(nextMonth)
    void fetchHistory(nextMonth)
  }

  // 格式化月份显示
  const [year, month] = currentMonth.split('-')
  const displayMonth = `${year}年${month}月`

  // 生成日历数据
  const calendarDays = (() => {
    const parts = currentMonth.split('-').map(Number)
    const year = parts[0] || new Date().getFullYear()
    const month = parts[1] || 1
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const daysInMonth = lastDay.getDate()
    const startWeekday = firstDay.getDay() // 0-6, 0=周日

    const days: { date: string; day: number; isCurrentMonth: boolean; isCheckedIn: boolean }[] = []

    // 上月填充
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
    for (let i = startWeekday - 1; i >= 0; i--) {
      days.push({
        date: '',
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        isCheckedIn: false
      })
    }

    // 本月日期
    const checkedDates = historyData?.checkInDates || []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentMonth}-${String(d).padStart(2, '0')}`
      days.push({
        date: dateStr,
        day: d,
        isCurrentMonth: true,
        isCheckedIn: checkedDates.includes(dateStr)
      })
    }

    // 下月填充（补满6行）
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: '',
        day: i,
        isCurrentMonth: false,
        isCheckedIn: false
      })
    }

    return days
  })()

  // 返回
  const goBack = () => {
    navigate('/')
  }

  useEffect(() => {
    void fetchHistory(currentMonth)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 意图为仅挂载执行 / 模拟 Vue watch
  }, [])

  return (
    <div className="min-h-full bg-gray-50 rounded-xl shadow-sm p-6">
      <div className="max-w-2xl mx-auto p-6">
        {/* 顶部返回 */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={goBack} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Button>
          <h1 className="text-2xl font-bold text-gray-800">签到记录</h1>
        </div>

        {/* 统计卡片 */}
        <div className="bg-gradient-to-br from-[#FFB347] to-[#FFCC33] rounded-2xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/80 text-sm mb-1">本月签到天数</div>
              <div className="text-4xl font-bold">{historyData?.totalDays || 0} <span className="text-lg font-normal">天</span></div>
            </div>
            <Calendar className="w-12 h-12 opacity-50" />
          </div>
        </div>

        {/* 日历卡片 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          {/* 月份切换 */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="sm" onClick={() => changeMonth(-1)} className="flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" />
              上月
            </Button>
            <span className="text-lg font-bold text-gray-800">{displayMonth}</span>
            <Button variant="ghost" size="sm" onClick={() => changeMonth(1)} className="flex items-center gap-1">
              下月
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* 加载中 */}
          {loading && (
            <div className="py-12 text-center text-gray-400">
              加载中...
            </div>
          )}

          {/* 日历 */}
          {!loading && (
            <div>
              {/* 星期头 */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['日', '一', '二', '三', '四', '五', '六'].map((week) => (
                  <div key={week}
                    className="text-center text-sm text-gray-400 py-2">
                    {week}
                  </div>
                ))}
              </div>

              {/* 日期格子 */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={cn(
                      'relative aspect-square flex items-center justify-center rounded-lg text-sm transition-colors',
                      day.isCurrentMonth
                        ? (day.isCheckedIn
                          ? 'bg-orange-100 text-orange-600 font-bold'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100')
                        : 'text-gray-300'
                    )}
                  >
                    {day.day}
                    {/* 签到标记 */}
                    {day.isCheckedIn && (
                      <CheckCircle2
                        className="absolute -top-1 -right-1 w-4 h-4 text-orange-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 图例 */}
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-100 flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-orange-500" />
              </div>
              <span>已签到</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-50"></div>
              <span>未签到</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
