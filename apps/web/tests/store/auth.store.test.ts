import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/store'
import { UserRole } from '@/types/enums'

// 构造未过期的 JWT（签名无所谓，客户端只解析 payload）。
const b64url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
const makeToken = (payload: object) =>
  `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.sig`

describe('auth store', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, role: null, profile: null, hydrated: true })
    localStorage.clear()
  })

  it('enters guest mode', () => {
    useAuthStore.getState().enterGuest()
    const state = useAuthStore.getState()

    expect(state.role).toBe(UserRole.Guest)
    expect(state.token).toBeNull()
  })

  it('clears session on logout', () => {
    useAuthStore.getState().login({ token: 'mock-token', role: UserRole.User, profile: { nickname: 'demo' } })
    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.role).toBeNull()
    expect(state.token).toBeNull()
    expect(state.profile).toBeNull()
  })

  describe('unified session boot sync', () => {
    it('adopts a shared-session token written by the other end', async () => {
      const token = makeToken({ role: 'user', sub: 'cross-end', exp: 1893456000 })
      localStorage.setItem('meow.session.user.accessToken', token)

      vi.resetModules()
      const { useAuthStore: freshStore } = await import('@/store')
      const state = freshStore.getState()

      expect(state.token).toBe(token)
      expect(state.role).toBe(UserRole.User)

      localStorage.clear()
    })

    it('keeps the persisted role when the shared token is unchanged', async () => {
      const token = makeToken({ role: 'user', sub: 'same', exp: 1893456000 })
      localStorage.setItem('meow.session.user.accessToken', token)
      localStorage.setItem(
        'sdu_meow_auth',
        JSON.stringify({ state: { token, role: 'user', profile: { nickname: 'demo' } }, version: 0 }),
      )

      vi.resetModules()
      const { useAuthStore: freshStore } = await import('@/store')
      const state = freshStore.getState()

      expect(state.token).toBe(token)
      expect(state.role).toBe(UserRole.User)
      expect(state.profile).toEqual({ nickname: 'demo' })

      localStorage.clear()
    })

    it('clears a stale persisted copy when the shared session is gone', async () => {
      localStorage.setItem(
        'sdu_meow_auth',
        JSON.stringify({ state: { token: 'old-token', role: 'user', profile: null }, version: 0 }),
      )

      vi.resetModules()
      const { useAuthStore: freshStore } = await import('@/store')
      const state = freshStore.getState()

      expect(state.token).toBeNull()
      expect(state.role).toBeNull()

      localStorage.clear()
    })
  })
})
