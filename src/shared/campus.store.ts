import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const campusOptions = [
  { label: '济南中心校区', value: 'CENTRAL', code: '0' },
  { label: '趵突泉校区', value: 'BAOTUQUAN', code: '1' },
  { label: '洪家楼校区', value: 'HONGJIALOU', code: '2' },
  { label: '千佛山校区', value: 'QIANFOSHAN', code: '3' },
  { label: '兴隆山校区', value: 'XINGLONGSHAN', code: '4' },
  { label: '软件园校区', value: 'SOFTWARE_PARK', code: '5' },
  { label: '青岛校区', value: 'QINGDAO', code: '6' },
  { label: '威海校区', value: 'WEIHAI', code: '7' },
]

export function campusCode(value: string): string {
  return campusOptions.find((item) => item.value === value || item.code === value)?.code ?? '5'
}

export const useCampusStore = create<{ campus: string; setCampus: (campus: string) => void }>()(
  persist((set) => ({
    campus: 'SOFTWARE_PARK',
    setCampus: (value) => set({ campus: campusOptions.find((item) => item.code === campusCode(value))!.value }),
  }), { name: 'sdu_meow_campus' }),
)
