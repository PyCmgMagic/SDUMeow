import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { httpClient } from '@/api/client'
import { getGroupQrcode } from '@/api/endpoints/community'

describe('community endpoints', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(httpClient)
  })

  afterEach(() => {
    mock.restore()
  })

  it('loads the group QR code URL', async () => {
    mock.onGet('/community/group-qrcode').reply(200, {
      code: 200,
      msg: 'ok',
      data: { qrcodeUrl: 'https://example.com/group.png' },
    })

    const result = await getGroupQrcode()

    expect(result.data?.qrcodeUrl).toBe('https://example.com/group.png')
  })
})
