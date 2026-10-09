import { create } from 'zustand'
import { userApi } from '@pc/lib/api'
import type { CheckinResult } from '@pc/types'
import { useAuthStore } from './auth.store'
import { queryClient } from './queryClient'
import { getSessionRevision, readAccessToken, subscribeSession } from './session'

const today = () => new Date().toLocaleDateString('en-CA')
export const useCheckinStore = create<{
  result: CheckinResult | null
  completedOn: string
  loading: boolean
}>(() => ({ result: null, completedOn: '', loading: false }))

let pending: { revision: number; promise: Promise<CheckinResult> } | null = null
let revision = getSessionRevision('user')
subscribeSession((scope) => {
  if (scope !== 'user' || revision === getSessionRevision('user')) return
  revision = getSessionRevision('user')
  pending = null
  useCheckinStore.setState({ result: null, completedOn: '', loading: false })
})

/** One successful check-in per account/day, shared by both layouts. */
export function checkinOnce(): Promise<CheckinResult> {
  const currentRevision = getSessionRevision('user')
  if (!readAccessToken('user')) return Promise.reject(new Error('请先登录后再签到'))
  if (pending?.revision === currentRevision) return pending.promise
  const state = useCheckinStore.getState()
  const day = today()
  if (state.completedOn === day && state.result) {
    return Promise.resolve({ ...state.result, todayChecked: true })
  }

  useCheckinStore.setState({ loading: true })
  const promise = userApi.checkin().then(async (result) => {
    if (currentRevision !== getSessionRevision('user')) throw new Error('登录会话已变更')
    useCheckinStore.setState({ result, completedOn: day })
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: ['me'] }),
      useAuthStore.getState().fetchUserInfo(),
    ])
    if (currentRevision !== getSessionRevision('user')) throw new Error('登录会话已变更')
    return result
  }).finally(() => {
    if (pending?.promise === promise) {
      pending = null
      useCheckinStore.setState({ loading: false })
    }
  })
  pending = { revision: currentRevision, promise }
  return promise
}
