<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { userApi } from '@/lib/api'
import type { CheckinHistory } from '@/types'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, CheckCircle2 } from 'lucide-vue-next'

const router = useRouter()

// 状态
const loading = ref(false)
const historyData = ref<CheckinHistory | null>(null)
const currentMonth = ref(new Date().toISOString().slice(0, 7)) // 格式: 2026-03

// 获取签到历史
const fetchHistory = async () => {
  loading.value = true
  try {
    const res = await userApi.getCheckinHistory(currentMonth.value)
    historyData.value = res
  } catch (error) {
    console.error('获取签到历史失败:', error)
  } finally {
    loading.value = false
  }
}

// 切换月份
const changeMonth = (delta: number) => {
  const parts = currentMonth.value.split('-').map(Number)
  const year = parts[0] || new Date().getFullYear()
  const month = parts[1] || 1
  const date = new Date(year, month - 1 + delta, 1)
  currentMonth.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  fetchHistory()
}

// 格式化月份显示
const displayMonth = computed(() => {
  const [year, month] = currentMonth.value.split('-')
  return `${year}年${month}月`
})

// 生成日历数据
const calendarDays = computed(() => {
  const parts = currentMonth.value.split('-').map(Number)
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
  const checkedDates = historyData.value?.checkInDates || []
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentMonth.value}-${String(d).padStart(2, '0')}`
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
})

// 返回
const goBack = () => {
  router.push('/')
}

onMounted(() => {
  fetchHistory()
})
</script>

<template>
  <div class="min-h-full bg-gray-50 rounded-xl shadow-sm p-6">
    <div class="max-w-2xl mx-auto p-6">
      <!-- 顶部返回 -->
      <div class="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" @click="goBack" class="flex items-center gap-2">
          <ArrowLeft class="w-4 h-4" />
          返回首页
        </Button>
        <h1 class="text-2xl font-bold text-gray-800">签到记录</h1>
      </div>

      <!-- 统计卡片 -->
      <div class="bg-gradient-to-br from-[#FFB347] to-[#FFCC33] rounded-2xl p-6 mb-6 text-white">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-white/80 text-sm mb-1">本月签到天数</div>
            <div class="text-4xl font-bold">{{ historyData?.totalDays || 0 }} <span class="text-lg font-normal">天</span></div>
          </div>
          <Calendar class="w-12 h-12 opacity-50" />
        </div>
      </div>

      <!-- 日历卡片 -->
      <div class="bg-white rounded-2xl shadow-sm p-6">
        <!-- 月份切换 -->
        <div class="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" @click="changeMonth(-1)" class="flex items-center gap-1">
            <ChevronLeft class="w-4 h-4" />
            上月
          </Button>
          <span class="text-lg font-bold text-gray-800">{{ displayMonth }}</span>
          <Button variant="ghost" size="sm" @click="changeMonth(1)" class="flex items-center gap-1">
            下月
            <ChevronRight class="w-4 h-4" />
          </Button>
        </div>

        <!-- 加载中 -->
        <div v-if="loading" class="py-12 text-center text-gray-400">
          加载中...
        </div>

        <!-- 日历 -->
        <div v-else>
          <!-- 星期头 -->
          <div class="grid grid-cols-7 gap-1 mb-2">
            <div v-for="week in ['日', '一', '二', '三', '四', '五', '六']" :key="week" 
              class="text-center text-sm text-gray-400 py-2">
              {{ week }}
            </div>
          </div>

          <!-- 日期格子 -->
          <div class="grid grid-cols-7 gap-1">
            <div
              v-for="(day, index) in calendarDays"
              :key="index"
              :class="[
                'relative aspect-square flex items-center justify-center rounded-lg text-sm transition-colors',
                day.isCurrentMonth 
                  ? (day.isCheckedIn 
                      ? 'bg-orange-100 text-orange-600 font-bold' 
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100')
                  : 'text-gray-300'
              ]"
            >
              {{ day.day }}
              <!-- 签到标记 -->
              <CheckCircle2 
                v-if="day.isCheckedIn" 
                class="absolute -top-1 -right-1 w-4 h-4 text-orange-500" 
              />
            </div>
          </div>
        </div>

        <!-- 图例 -->
        <div class="mt-6 flex items-center justify-center gap-6 text-sm text-gray-500">
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 rounded bg-orange-100 flex items-center justify-center">
              <CheckCircle2 class="w-3 h-3 text-orange-500" />
            </div>
            <span>已签到</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 rounded bg-gray-50"></div>
            <span>未签到</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
