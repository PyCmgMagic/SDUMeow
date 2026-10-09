import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174'
const output = await mkdtemp(join(tmpdir(), 'meow-responsive-'))
const startedAt = Date.now()
const token = (account, expired = false) => `e30.${Buffer.from(JSON.stringify({ sub: account, exp: Math.floor(startedAt / 1000) + (expired ? -60 : 3600) })).toString('base64url')}.test`
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY1kAAAAASUVORK5CYII=', 'base64')
const cats = [{ id: '7', name: '测试猫', color: 1, campus: 5, status: 0, tags: [], avatar: `data:image/png;base64,${png.toString('base64')}`, basicInfo: { color: 1, campus: 5, status: 0, hauntLocation: 2, neutered: { isNeutered: false } } }]
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const errors = []
const consoleErrors = []
page.on('pageerror', (error) => errors.push(error.message))
page.on('console', (message) => { if (message.type() === 'error') { consoleErrors.push(message.text()); console.error('console:', message.text()) } })
page.on('requestfailed', (request) => console.error('request:', request.url(), request.failure()?.errorText))
let refreshCalls = 0
await context.route('**/api/**', async (route) => {
  if (!new URL(route.request().url()).pathname.startsWith('/api/')) return route.continue()
  const path = new URL(route.request().url()).pathname.replace('/api', '')
  if (path.startsWith('/delayed')) await new Promise((resolve) => setTimeout(resolve, 250))
  if (path === '/delayed-401') return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ code: 401, msg: 'expired' }) })
  const authorization = route.request().headers().authorization || ''
  const account = authorization.includes(token('B')) ? 'B' : 'A'
  let data = { items: [], total: 0, totalPage: 1 }
  if (path === '/users/me') data = { uid: account === 'A' ? 1 : 2, nickname: `账号${account}`, campus: 5, level: 1, currency: 20, contact: { phone: '13800000000', wechat: 'test' } }
  else if (path === '/users/me/checkin') data = { totalDays: 3, continuousDays: 2, todayChecked: true }
  else if (path === '/users/refresh') { refreshCalls += 1; data = { accessToken: token('A'), refreshToken: 'refresh-A' } }
  else if (path === '/cats') data = { items: cats, total: 60, totalPage: 3, size: 20 }
  else if (path === '/cats/7') data = cats[0]
  else if (path.startsWith('/types/') || path.startsWith('/type/')) data = [{ id: 1, label: '橘猫', name: '橘猫' }, { id: 2, label: '图书馆', name: '图书馆' }]
  else if (path === '/announcements') data = { items: [{ id: '10', title: '测试公告', content: '公告内容', createTime: new Date(startedAt - 60000).toISOString() }], total: 1, totalPage: 1 }
  else if (path.includes('/stats')) data = { totalCats: 1, residentCats: 1, adoptedCats: 0, neuteredCats: 0 }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data, msg: 'success' }) })
})
await context.addInitScript((accessToken) => {
  if (!localStorage.getItem('meow.session.user.accessToken')) {
    localStorage.setItem('meow.session.user.accessToken', accessToken)
    localStorage.setItem('meow.session.user.refreshToken', 'refresh-A')
  }
}, token('A'))
const resize = async (width) => { await page.setViewportSize({ width, height: 1000 }); await page.waitForTimeout(400) }
const navigate = async (path) => {
  await page.evaluate((target) => { window.history.pushState({}, '', target); window.dispatchEvent(new PopStateEvent('popstate')) }, path)
  await page.waitForTimeout(400)
}
const value = async (selector) => page.locator(selector).inputValue()
try {
  await page.goto(`${baseURL}/publish?catId=7`)
  await page.locator('#moment-content').fill('桌面草稿保留')
  await page.locator('#moment-title').fill('草稿标题')
  await page.locator('input[type=file]').setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: png })
  await resize(390)
  await page.locator('#content').waitFor()
  assert.equal(await value('#content'), '桌面草稿保留')
  assert.equal(await page.locator('img[alt="动态图片"]').count(), 1)
  await page.locator('#content').fill('移动草稿保留')
  await resize(1440)
  assert.equal(await value('#moment-content'), '移动草稿保留')
  assert.equal(await value('#moment-title'), '草稿标题')
  assert.equal(await page.locator('img[alt="动态图片 1"]').evaluate((img) => img.complete && img.naturalWidth > 0), true)
  console.log('PASS 发布草稿、图片双向接续')
  const revisionBefore = await page.evaluate(async () => { const { useAuthStore } = await import('/src/shared/auth.store.ts'); return useAuthStore.getState().authRevision })
  const secondTab = await context.newPage()
  await secondTab.goto(`${baseURL}/team`)
  await secondTab.evaluate(async (accessToken) => {
    const { writeSession } = await import('/src/shared/session.ts')
    writeSession('user', { accessToken, refreshToken: 'refresh-A' }, true)
  }, `${token('A')}refreshed`)
  await page.waitForTimeout(150)
  assert.equal(await value('#moment-content'), '移动草稿保留')
  assert.equal(await page.evaluate(async () => { const { useAuthStore } = await import('/src/shared/auth.store.ts'); return useAuthStore.getState().authRevision }), revisionBefore)
  await secondTab.close()
  console.log('PASS 另一标签页刷新token保留当前草稿')

  await navigate('/sos')
  await page.locator('#sos-description').fill('SOS现场草稿')
  await page.locator('#sos-location').fill('图书馆门口')
  await page.locator('input[type=file]').setInputFiles({ name: 'sos.png', mimeType: 'image/png', buffer: png })
  await resize(390)
  assert.equal(await value('#description'), 'SOS现场草稿')
  assert.equal(await value('#location'), '图书馆门口')
  await page.locator('#description').fill('移动现场草稿')
  await resize(1440)
  assert.equal(await value('#sos-description'), '移动现场草稿')
  assert.equal(await page.locator('img[alt="现场图片 1"]').evaluate((img) => img.complete && img.naturalWidth > 0), true)
  console.log('PASS SOS草稿与图片双向接续')

  await navigate('/new-cat')
  await page.locator('#new-cat-name').fill('新猫草稿')
  await page.locator('input[type=file]').setInputFiles({ name: 'cat.png', mimeType: 'image/png', buffer: png })
  await resize(390)
  assert.equal(await value('#tempName'), '新猫草稿')
  await page.locator('#tempName').fill('移动新猫草稿')
  await resize(1440)
  assert.equal(await value('#new-cat-name'), '移动新猫草稿')
  assert.equal(await page.locator('img[alt="猫咪照片 1"]').evaluate((img) => img.complete && img.naturalWidth > 0), true)
  console.log('PASS 新猫草稿与图片双向接续')

  await navigate('/adopt?catId=7')
  await page.locator('#adoption-plan').fill('领养计划草稿')
  await resize(390)
  assert.equal(await value('#plan'), '领养计划草稿')
  await page.locator('#plan').fill('移动领养计划草稿')
  await resize(1440)
  assert.equal(await value('#adoption-plan'), '移动领养计划草稿')
  console.log('PASS 领养草稿双向接续')

  await navigate('/?campus=5&color=1&search=测试&page=2')
  await resize(390)
  assert.match(page.url(), /page=2/)
  assert.equal(await value('input[placeholder="搜索猫咪花名、花色或地点..."]'), '测试')
  await resize(1440)
  assert.match(page.url(), /color=1/)
  assert.match(page.url(), /page=2/)
  console.log('PASS 首页筛选、页码与登录状态接续')

  for (const path of ['/notifications', '/my-adoptions', '/my-sos', '/checkin-history', '/announcements', '/profile', '/team']) {
    await navigate(path)
    await resize(390)
    assert.equal(new URL(page.url()).pathname, path)
    if (path === '/notifications') await page.screenshot({ path: join(output, 'notifications-mobile.png'), fullPage: true })
    await resize(1440)
    assert.equal(new URL(page.url()).pathname, path)
    if (path === '/profile') await page.screenshot({ path: join(output, 'profile-desktop.png'), fullPage: true })
  }
  console.log('PASS 单端页面切换保留业务地址')
  assert.equal(await page.evaluate(async () => {
    const { useNotificationStore } = await import('/src/pc/stores/notifications.ts')
    await useNotificationStore.getState().fetchPreview()
    return useNotificationStore.getState().badgeCount()
  }), 0)
  console.log('PASS 公告已读在两端一致')

  await navigate('/me/edit')
  await page.locator('#profile-nickname').fill('编辑草稿')
  await resize(390)
  assert.equal(await value('#nickname'), '编辑草稿')
  assert.equal(await value('#phone'), '13800000000')
  await page.locator('#nickname').fill('手机编辑草稿')
  await resize(1440)
  assert.equal(await value('#profile-nickname'), '手机编辑草稿')
  console.log('PASS 资料草稿与联系方式接续')

  await page.evaluate(async () => {
    const { queryClient } = await import('/src/shared/queryClient.ts')
    queryClient.setQueryData(['me'], { data: { nickname: '旧账号缓存' } })
    const { useAuthStore } = await import('/src/shared/auth.store.ts')
    useAuthStore.getState().logout()
  })
  assert.equal(await page.evaluate(async () => { const { readDraft } = await import('/src/shared/drafts.ts'); return Object.keys(readDraft('publish').values).length }), 0)
  assert.equal(await page.evaluate(async () => { const { queryClient } = await import('/src/shared/queryClient.ts'); return queryClient.getQueryData(['me']) }), undefined)
  console.log('PASS 登出清除草稿与账号缓存')

  await page.evaluate(async (accessToken) => {
    const { useAuthStore } = await import('/src/shared/auth.store.ts')
    useAuthStore.getState().acceptSession({ token: accessToken, role: 'user' })
  }, token('B'))
  await navigate('/publish?catId=7')
  assert.equal(await value('#moment-content'), '')
  assert.equal(await page.evaluate(async () => { const { useAuthStore } = await import('/src/shared/auth.store.ts'); return useAuthStore.getState().userInfo.nickname }), '账号B')
  console.log('PASS 换号不会显示上一账号资料或草稿')

  const lateResponse = await page.evaluate(async (accessToken) => {
    const { apiRequest } = await import('/src/mobile/api/client.ts')
    const pending = apiRequest({ method: 'GET', url: '/delayed' }).then(() => 'accepted', () => 'discarded')
    const { useAuthStore } = await import('/src/shared/auth.store.ts')
    await new Promise((resolve) => setTimeout(resolve, 50))
    useAuthStore.getState().acceptSession({ token: accessToken, role: 'user' })
    return pending
  }, token('A'))
  assert.equal(lateResponse, 'discarded')
  console.log('PASS 换号丢弃旧账号迟到响应')
  const staleFailures = await page.evaluate(async (accessToken) => {
    const { apiRequest } = await import('/src/mobile/api/client.ts')
    const { http } = await import('/src/pc/lib/https.ts')
    const pending = Promise.allSettled([apiRequest({ method: 'GET', url: '/delayed-401' }), http.get('/delayed-401')])
    await new Promise((resolve) => setTimeout(resolve, 50))
    const { useAuthStore } = await import('/src/shared/auth.store.ts')
    useAuthStore.getState().acceptSession({ token: accessToken, role: 'user' })
    const results = await pending
    return { results: results.map((item) => item.status), token: useAuthStore.getState().token }
  }, token('B'))
  assert.deepEqual(staleFailures.results, ['rejected', 'rejected'])
  assert.equal(staleFailures.token, token('B'))
  console.log('PASS 旧账号401不会清除新账号会话')

  await page.evaluate(async (accessToken) => {
    const { writeSession } = await import('/src/shared/session.ts')
    writeSession('user', { accessToken, refreshToken: 'refresh-A' })
  }, token('A', true))
  await resize(390)
  await page.locator('#content').waitFor()
  assert.equal(new URL(page.url()).pathname, '/publish')
  assert.equal(refreshCalls, 1)
  console.log('PASS 过期会话跨端自动恢复、并发刷新合并')
  await page.screenshot({ path: join(output, 'mobile.png'), fullPage: true })
  await resize(1440)
  await page.screenshot({ path: join(output, 'desktop.png'), fullPage: true })
  assert.deepEqual(errors, [])
  // rc-util's field-meta comparison warns on repeated empty-array references;
  // injected 401s are intentional regression cases, not runtime failures.
  assert.deepEqual(consoleErrors.filter((message) => !message.includes('circular references') && !message.includes('DevTools') && !message.includes('status of 401')), [])
  console.log(`PASS 无浏览器运行异常；截图 ${output}`)
} catch (error) {
  console.error('URL', page.url(), '运行异常', errors)
  console.error((await page.locator('body').innerText()).slice(0, 3000))
  console.error('会话', await page.evaluate(async () => { const { useAuthStore } = await import('/src/shared/auth.store.ts'); const state = useAuthStore.getState(); return { role: state.role, authRevision: state.authRevision, userInfo: state.userInfo, resolved: state.isSessionResolved } }))
  await page.screenshot({ path: join(output, 'failure.png'), fullPage: true })
  console.error('失败截图', output)
  throw error
} finally {
  await browser.close()
}
