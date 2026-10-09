import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const baseURL = process.env.TEST_BASE_URL || 'http://localhost:5174'
const token = (mode = 'user') => `e30.${Buffer.from(JSON.stringify({ sub: mode, mode, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) })
const errors = []
let activePage

async function setup(width = 390) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } })
  const page = await context.newPage()
  activePage = page
  page.on('pageerror', (error) => errors.push(error.message))
  let exchanges = 0
  let checkins = 0
  let failExchange = false
  await context.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    if (!url.pathname.startsWith('/api/')) return route.continue()
    const path = url.pathname.replace('/api', '')
    if (path === '/auth/login' || path === '/auth/admin-login') {
      const mode = path === '/auth/admin-login' ? 'admin' : 'user'
      return route.fulfill({ contentType: 'text/html', body: `<script>location.replace('${baseURL}/?login_code=${mode}')</script>` })
    }
    if (path === '/auth/exchange') {
      exchanges += 1
      await new Promise((resolve) => setTimeout(resolve, 250))
      if (failExchange) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ code: 400, msg: 'exchange failed' }) })
      const mode = route.request().postDataJSON().loginCode
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ code: 200, data: { accessToken: token(mode), refreshToken: `refresh-${mode}` } }) })
    }
    if (path === '/unauthorized') return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ code: 401 }) })
    let data = { items: [], total: 0, totalPage: 1 }
    if (path === '/users/me') data = { uid: 1, nickname: '测试用户', campus: 5, currency: 20, level: 1 }
    if (path === '/users/me/checkin') {
      checkins += 1
      data = { totalDays: 8, continuousDays: 3, todayChecked: false, rewards: { currency: 5, experience: 10 } }
    }
    if (path.startsWith('/types/') || path.startsWith('/type/')) data = []
    if (path.includes('/stats')) data = {}
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ code: 200, data, msg: 'success' }) })
  })
  return { context, page, exchanges: () => exchanges, checkins: () => checkins, failExchange: () => { failExchange = true } }
}

async function dismissNotice(page, required = false) {
  const button = page.getByRole('button', { name: '知道了', exact: true })
  if (required) await button.waitFor()
  else await button.waitFor({ timeout: 1000 }).catch(() => {})
  if (await button.isVisible()) {
    await button.click()
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
  }
}

try {
  for (const width of [390, 1440]) {
    const test = await setup(width)
    const { page, context } = test
    await page.goto(`${baseURL}/publish?catId=7#draft`)
    await page.waitForURL('**/login?**')
    assert.equal(new URL(page.url()).searchParams.get('redirect'), '/publish?catId=7#draft')
    await page.setViewportSize({ width: width === 390 ? 1440 : 390, height: 1000 })
    await page.waitForFunction((device) => document.documentElement.dataset.device === device, width === 390 ? 'pc' : 'mobile')
    await dismissNotice(page)
    assert.equal(new URL(page.url()).searchParams.get('redirect'), '/publish?catId=7#draft')
    await Promise.all([
      page.waitForRequest('**/api/auth/exchange'),
      page.getByRole('button', { name: /山东大学统一认证/ }).click(),
    ])
    await page.setViewportSize({ width, height: 1000 })
    await page.waitForURL('**/publish?catId=7#draft')
    await page.locator(width === 390 ? '#content' : '#moment-content').waitFor()
    assert.equal(test.exchanges(), 1)
    assert.equal(await page.evaluate(() => localStorage.getItem('meowAuthIntent')), null)
    assert.equal(await page.evaluate(() => sessionStorage.getItem('authRedirect')), null)
    await context.close()
    console.log(`PASS ${width}px 登录前后切换视口，回到原路径、参数和锚点，令牌只交换一次`)
  }

  {
    const test = await setup()
    const { page, context } = test
    await page.goto(`${baseURL}/admin/cats?search=test#list`)
    await page.waitForURL('**/admin/login?**')
    assert.equal(new URL(page.url()).searchParams.get('redirect'), '/admin/cats?search=test#list')
    await dismissNotice(page, true)
    await page.getByRole('button', { name: /管理员登录/ }).click()
    await page.waitForURL('**/admin/cats?search=test#list')
    assert.equal(await page.evaluate(() => Boolean(localStorage.getItem('meow.session.admin.accessToken'))), true)
    assert.equal(await page.evaluate(() => localStorage.getItem('meow.session.user.accessToken')), null)
    assert.equal(test.checkins(), 0)
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.locator('input[placeholder*="搜索"]').first().waitFor()
    assert.equal(new URL(page.url()).pathname, '/admin/cats')
    await context.close()
    console.log('PASS 管理员两端共用回调、原地址和独立凭证，不调用用户签到')
  }

  {
    const test = await setup()
    const { page, context } = test
    test.failExchange()
    await page.goto(`${baseURL}/admin/login?redirect=${encodeURIComponent('/admin/cats')}`)
    await page.getByRole('button', { name: /管理员登录/ }).click()
    await page.waitForURL('**/admin/login?authError=sdu**')
    assert.equal(new URL(page.url()).searchParams.get('redirect'), '/admin/cats')
    await dismissNotice(page, true)
    assert.equal(new URL(page.url()).pathname, '/admin/login')
    assert.equal(new URL(page.url()).searchParams.get('redirect'), '/admin/cats')
    await context.close()
    console.log('PASS 管理员交换失败保留登录入口和返回地址')
  }

  {
    const test = await setup(1440)
    const { page, context } = test
    await page.goto(`${baseURL}/login`)
    await page.getByText('游客', { exact: false }).click()
    await page.waitForURL(`${baseURL}/`)
    await page.setViewportSize({ width: 390, height: 1000 })
    await page.getByPlaceholder('搜索猫咪花名、花色或地点...').waitFor()
    assert.equal(new URL(page.url()).pathname, '/')
    assert.equal(await page.evaluate(async () => { const { useAuthStore } = await import('/src/shared/auth.store.ts'); return useAuthStore.getState().role }), 'guest')
    assert.equal(test.checkins(), 0)
    await context.close()
    console.log('PASS PC游客模式切换移动端后继续访问，不触发签到')
  }

  {
    const test = await setup(1440)
    const { page, context } = test
    await page.goto(`${baseURL}/?meow_token=${encodeURIComponent(token())}`)
    await page.getByRole('button', { name: '立即签到', exact: true }).click()
    await page.getByRole('button', { name: '今日已签到', exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: '今日已签到', exact: true }).isDisabled(), true)
    await page.setViewportSize({ width: 390, height: 1000 })
    await page.getByPlaceholder('搜索猫咪花名、花色或地点...').waitFor()
    await page.goto(`${baseURL}/team`)
    // Reload starts a fresh app lifetime; test concurrent calls in that lifetime.
    const before = test.checkins()
    await page.evaluate(async () => { const { checkinOnce } = await import('/src/shared/checkin.store.ts'); await Promise.all([checkinOnce(), checkinOnce()]) })
    assert.equal(test.checkins(), before + 1)
    const result = await page.evaluate(async () => { const { useCheckinStore } = await import('/src/shared/checkin.store.ts'); return useCheckinStore.getState().result })
    assert.equal(result.totalDays, 8)
    await page.evaluate(async (accessToken) => {
      const { writeSession } = await import('/src/shared/session.ts')
      writeSession('user', { accessToken })
    }, token('other'))
    assert.equal(await page.evaluate(async () => { const { useCheckinStore } = await import('/src/shared/checkin.store.ts'); return useCheckinStore.getState().result }), null)
    await context.close()
    console.log('PASS PC首次签到立刻禁用按钮，签到并发合并，换号清除签到结果')
  }

  {
    const test = await setup()
    const { page, context } = test
    await page.goto(`${baseURL}/publish?meow_token=${encodeURIComponent(token())}&catId=7#draft`)
    await page.locator('#content').waitFor()
    await page.evaluate(async () => {
      const { apiRequest } = await import('/src/mobile/api/client.ts')
      await apiRequest({ method: 'GET', url: '/unauthorized' }).catch(() => {})
    }).catch(() => {})
    await page.waitForURL('**/login?expired=1**')
    assert.equal(new URL(page.url()).searchParams.get('redirect'), '/publish?catId=7#draft')
    await context.close()
    console.log('PASS 移动端会话失效保留原路径、参数和锚点')
  }

  assert.deepEqual(errors, [])
  console.log('PASS 认证和签到回归无浏览器运行异常')
} catch (error) {
  console.error('URL', activePage?.url(), '运行异常', errors)
  if (activePage && !activePage.isClosed()) console.error((await activePage.locator('body').innerText()).slice(0, 4000))
  throw error
} finally {
  await browser.close()
}
