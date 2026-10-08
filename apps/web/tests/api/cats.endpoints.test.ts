import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getCatDetail } from '@/api/endpoints/cats'
import { apiRequest } from '@/api/client'

vi.mock('@/api/client', () => ({ apiRequest: vi.fn() }))

describe('cat detail endpoint', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    [{ color: 1 }, 1],
    [{ color: 1, colorName: '橘白' }, '橘白'],
    [{ basicInfo: { color: 1 } }, 1],
  ])('preserves color IDs and names for display', async (colorFields, expected) => {
    vi.mocked(apiRequest).mockResolvedValue({
      data: { id: 'cat-1', ...colorFields }, code: 200, message: 'ok', raw: {},
    })
    const result = await getCatDetail('cat-1')
    expect(result.data?.basicInfo?.color).toBe(expected)
  })

  it('preserves nested zero enums and sterilization date from the PC contract', async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      data: {
        id: 'cat-1', popularity: 428,
        basicInfo: { gender: 0, campus: 0, healthStatus: 0, neutered: { isNeutered: true, date: '2024-03-12' } },
      }, code: 200, message: 'ok', raw: {},
    })
    const result = await getCatDetail('cat-1')
    expect(result.data?.basicInfo).toMatchObject({
      gender: 0, campus: 0, healthStatus: 0, neutered: { isNeutered: true, neuteredDate: '2024-03-12' },
    })
    expect(result.data?.popularity).toBe(428)
  })
})
