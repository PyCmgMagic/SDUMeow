import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5177'
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) })
const token = `e30.${Buffer.from(JSON.stringify({ sub: 'test', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`
const errors = []
const cat = {
  id: '1', name: '真实猫咪', avatar: '', images: [], aliases: [], tags: [], description: '真实介绍', popularity: 0,
  basicInfo: { campus: 5, color: 1, hauntLocation: 1, role: 1, gender: 1, status: 0, healthStatus: 0, neutered: { isNeutered: false } },
  attributes: { friendliness: 5, gluttony: 5, appearance: 5, fight: 5 },
}
async function setup(scope) {
  const context = await browser.newContext({ viewport: { width: 390, height: 1000 } })
  await context.addInitScript(({ scope, token }) => localStorage.setItem(`meow.session.${scope}.accessToken`, token), { scope, token })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', (error) => errors.push(error.message))
  const state = { userStatus: 1, banFails: false, banGate: null, catError: 0, catEmpty: false, noticeErrorPage: 0, noticeCap: 100, notices: [], liked: false, adoptions: [], posts: [] }
    const requests = []
  const notices = Array.from({ length: 205 }, (_, i) => ({ id: String(i + 1), title: `公告${i + 1}`, content: `原始正文${i + 1}`, summary: `摘要${i + 1}`, coverImage: `meow/cover-${i + 1}.png`, type: 0, status: 'DRAFT', pinned: true }))
  state.notices = notices
  state.posts = [{ id: 'p1', catId: '1', content: '原始动态', relatedCats: { id: '1', name: cat.name }, user: { id: '1', name: '测试用户' }, likeCount: 0, isLiked: false, media: [], createTime: '2026-10-09' }]
  await context.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    if (!url.pathname.startsWith('/api/')) return route.continue()
    const path = url.pathname.slice(4), method = route.request().method()
    requests.push({ path, method, params: Object.fromEntries(url.searchParams), body: route.request().postDataJSON() })
    const respond = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ code: status, data, msg: status === 200 ? 'success' : '测试接口失败' }) })
    const pageNumber = Number(url.searchParams.get('page') || 1)
    const paged = (items) => ({ items, total: items.length, pages: 1, current: pageNumber })
    let data = paged([])
    if (path === '/admin/users/1') data = { uid: 1, nickname: '真实用户', status: state.userStatus, permission: 0 }
    else if (path === '/admin/users/1/ban') {
      if (state.banGate) await state.banGate
      if (state.banFails) return respond(null, 403)
      state.userStatus = state.userStatus === 0 ? 1 : 0
      data = null
    }
    else if (path === '/admin/announcements') {
      if (pageNumber === state.noticeErrorPage) return respond(null, 500)
      const size = Math.min(state.noticeCap, Number(url.searchParams.get('pageSize') || url.searchParams.get('size') || 100))
      data = { items: state.notices.slice((pageNumber - 1) * size, pageNumber * size), total: state.notices.length, ...(state.noticeCap === 100 ? { pages: Math.ceil(state.notices.length / size) } : {}) }
    }
    else if (path.startsWith('/admin/announcements/') && method === 'PUT') data = null
    else if (path === '/cats/1') {
      if (state.catError) return respond(null, state.catError)
      data = state.catEmpty ? null : cat
    }
    else if (path === '/cats') data = paged([{ ...cat, campus: 5, status: 0, color: 1 }])
    else if (path === '/posts' && method === 'GET') data = paged(state.posts.map((p) => ({ ...p, likeCount: state.liked ? 1 : 0, isLiked: state.liked })))
    else if (path === '/posts' && method === 'POST') {
      state.posts.push({ ...state.posts[0], ...route.request().postDataJSON(), id: `p${state.posts.length + 1}` })
      data = null
    }
    else if (path === '/posts/p1/like') { state.liked = method === 'POST'; data = null }
    else if (path === '/adoptions' && method === 'POST') {
      state.adoptions.push({ id: String(state.adoptions.length + 1), catId: '1', catName: cat.name, status: 'PENDING', createTime: '2026-10-09' })
      data = null
    }
    else if (path === '/adoptions/my') data = paged(state.adoptions)
    else if (path === '/users/me') data = { uid: 1, nickname: '测试用户', campus: 5, currency: 100, stats: { receivedLikes: state.liked ? 1 : 0, postCount: state.posts.length } }
    else if (path.startsWith('/type/') || path.startsWith('/types/')) data = [{ id: 1, value: 1, name: '类型', label: '类型' }]
    else if (path.includes('/stats')) data = {}
    return respond(data)
  })
  return { context, page, state, requests }
}
async function go(page, path) { await page.goto(baseURL + path, { waitUntil: 'domcontentloaded' }) }
async function spaGo(page, path) {
  await page.evaluate((path) => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')) }, path)
}
async function resize(page, width) {
  await page.setViewportSize({ width, height: 1000 })
  await page.waitForFunction((device) => document.documentElement.dataset.device === device, width < 768 ? 'mobile' : 'pc')
}
async function value(locator, expected) {
  await locator.waitFor()
  const selector = await locator.evaluate((el) => { el.dataset.verifyValue = 'yes'; return '[data-verify-value="yes"]' })
  await locator.page().waitForFunction(({ selector, expected }) => document.querySelector(selector)?.value === expected, { selector, expected })
  await locator.evaluate((el) => delete el.dataset.verifyValue)
}
async function seed(page, keys) {
  await page.evaluate(async (keys) => {
    const { queryClient } = await import('/src/shared/queryClient.ts')
    for (const key of keys) queryClient.setQueryData(key, { data: { marker: 'old' }, code: 200 })
  }, keys)
}
async function invalidated(page, keys) {
  const states = await page.evaluate(async (keys) => {
    const { queryClient } = await import('/src/shared/queryClient.ts')
    return keys.map((key) => {
      const state = queryClient.getQueryState(key)
      return Boolean(state?.isInvalidated || (state?.data !== undefined && state.data?.data?.marker !== 'old'))
    })
  }, keys)
  assert.ok(states.every(Boolean), `缓存未失效或刷新：${JSON.stringify(states)}`)
}
try {
  {
    const { context, page, state, requests } = await setup('admin')
    for (const status of [1, '1', 'BANNED', 'DISABLED', 0, '0', 'ACTIVE']) {
      state.userStatus = status
      await go(page, '/admin/users/1')
      await page.getByRole('button', { name: [0, '0', 'ACTIVE'].includes(status) ? /禁用此账号/ : /解封此账号/ }).waitFor()
      assert.equal(await page.getByText('202200301234', { exact: true }).count(), 0)
    }
    state.userStatus = 1
    await go(page, '/admin/users/1')
    const button = page.getByRole('button', { name: /解封此账号/ })
    await button.waitFor()
    let release
    state.banGate = new Promise((resolve) => { release = resolve })
    await button.evaluate((el) => { el.click(); el.click(); el.click() })
    await page.getByRole('button', { name: /处理中.../ }).waitFor()
    assert.equal(await page.getByRole('button', { name: /处理中.../ }).isDisabled(), true)
    release()
    await page.getByRole('button', { name: /禁用此账号/ }).waitFor()
    assert.equal(requests.filter((r) => r.path.endsWith('/ban')).length, 1)
    assert.equal(state.userStatus, 0)
    await page.reload()
    await page.getByRole('button', { name: /禁用此账号/ }).waitFor()
    state.banFails = true
    await page.getByRole('button', { name: /禁用此账号/ }).click()
    await page.getByRole('dialog').waitFor()
    assert.equal(state.userStatus, 0)
    console.log('PASS 用户封禁状态数字/字符串解析、连点去重、刷新和失败状态')
    await context.close()
  }
  {
    const { context, page, state, requests } = await setup('admin')
    await go(page, '/admin/announcements/205/edit')
    await value(page.locator('#title'), '公告205')
    await value(page.locator('#content'), '原始正文205')
    assert.ok(requests.some((r) => r.path === '/admin/announcements' && r.params.page === '3'))
    await page.getByRole('button', { name: '立即发布公告', exact: true }).click()
    await page.getByText('公告已发布', { exact: true }).waitFor()
    const saved = requests.find((r) => r.method === 'PUT')
    assert.equal(saved.path, '/admin/announcements/205')
    assert.equal(saved.body.summary, '摘要205')
    assert.equal(saved.body.coverImage, 'meow/cover-205.png')
    assert.equal(saved.body.pinned, true)
    state.noticeCap = 20
    await go(page, '/admin/announcements/205/edit')
    await value(page.locator('#title'), '公告205')
    assert.ok(requests.some((r) => r.params.page === '11'))
    await spaGo(page, '/admin/announcements/204/edit')
    await value(page.locator('#title'), '公告204')
    await value(page.locator('#content'), '原始正文204')
    state.noticeErrorPage = 2
    await go(page, '/admin/announcements/205/edit')
    await page.getByText('加载失败', { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: '立即发布公告', exact: true }).isDisabled(), true)
    state.noticeErrorPage = 0
    await go(page, '/admin/announcements/999/edit')
    await page.getByText('未找到此公告，可能已被删除，请返回公告列表确认', { exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: '立即发布公告', exact: true }).isDisabled(), true)
    assert.equal(requests.filter((r) => r.method === 'PUT').length, 1)
    console.log('PASS 第205条公告加载、服务端限页大小、字段保留、失败/不存在时禁止保存')
    await context.close()
  }
  {
    const { context, page, state } = await setup('admin')
    for (const status of [404, 500]) {
      state.catError = status
      await go(page, '/admin/cats/1')
      await page.getByText('加载失败', { exact: true }).waitFor()
      assert.equal(await page.getByText('麻薯', { exact: true }).count(), 0)
      assert.equal(await page.getByRole('link', { name: /编辑详情档案/ }).count(), 0)
      assert.equal(await page.getByRole('button', { name: /标记毕业/ }).count(), 0)
    }
    state.catError = 0; state.catEmpty = true
    await go(page, '/admin/cats/1')
    await page.getByText('暂无猫咪详情', { exact: true }).waitFor()
    state.catEmpty = false
    await go(page, '/admin/cats/1')
    await page.getByRole('link', { name: /编辑详情档案/ }).waitFor()
    state.catError = 500
    await page.evaluate(async () => {
      const { queryClient } = await import('/src/shared/queryClient.ts')
      await queryClient.invalidateQueries({ queryKey: ['cat-detail', '1'] })
    })
    await page.getByText('加载失败', { exact: true }).waitFor()
    assert.equal(await page.getByRole('link', { name: /编辑详情档案/ }).count(), 0)
    console.log('PASS 管理猫咪404/500/空详情不显示假数据或管理操作，正常详情不受影响')
    await context.close()
  }
  {
    const { context, page, state } = await setup('user')
    await go(page, '/cats/1')
    await page.getByText('原始动态', { exact: true }).waitFor()
    await resize(page, 1440)
    const pcMoment = page.locator('article').filter({ hasText: '原始动态' })
    await pcMoment.waitFor()
    await pcMoment.locator('button').last().click()
    await page.waitForFunction(() => document.querySelector('article .fill-red-500'))
    assert.equal(state.liked, true)
    await resize(page, 390)
    const mobileLike = page.getByRole('button', { name: '取消点赞', exact: true })
    await mobileLike.waitFor()
    assert.match(await mobileLike.innerText(), /1/)
    await mobileLike.click()
    await page.getByRole('button', { name: '点赞', exact: true }).waitFor()
    await resize(page, 1440)
    await pcMoment.waitFor()
    assert.equal(await pcMoment.locator('.fill-red-500').count(), 0)
    const keys = [['cat-moments', '1'], ['moments'], ['me']]
    await spaGo(page, '/publish?catId=1')
    await page.locator('#moment-content').fill('PC新动态')
    await seed(page, keys)
    await page.getByRole('button', { name: '发布动态', exact: true }).click()
    await page.waitForURL(baseURL + '/')
    await invalidated(page, keys)
    await resize(page, 390)
    await spaGo(page, '/cats/1')
    await page.getByText('PC新动态', { exact: true }).waitFor()
    await spaGo(page, '/publish?catId=1')
    await page.locator('#content').fill('移动端新动态')
    await seed(page, keys)
    await page.getByRole('button', { name: /立即发布/ }).click()
    await page.waitForURL('**/cats/1')
    await page.getByText('移动端新动态', { exact: true }).waitFor()
    await invalidated(page, [['moments'], ['me']])
    console.log('PASS 点赞状态双向接续、两端发布后动态和个人统计缓存刷新')
    await context.close()
  }
  {
    const { context, page, state } = await setup('user')
    const keys = [['my-adoptions', 'me-summary'], ['my-adoptions', 'PENDING'], ['admin-adoptions']]
    for (const width of [1440, 390]) {
      await go(page, '/adopt?catId=1')
      await resize(page, width)
      await page.getByRole('button', { name: '提交领养申请', exact: true }).waitFor()
      if (width === 1440) {
        await page.getByRole('button', { name: '自有住房', exact: true }).click()
        await page.getByRole('button', { name: '无经验', exact: true }).click()
        await page.locator('textarea').fill('会认真照顾猫咪并且长期负责，准备好封窗和医疗。')
        await page.locator('#adoption-phone').fill('13800000000')
        await page.locator('#adoption-wechat').fill('test-wechat')
      } else {
        await page.getByText('自有住房', { exact: true }).click()
        await page.getByText('新手', { exact: true }).click()
        await page.locator('#plan').fill('会认真照顾猫咪并且长期负责，准备好封窗和医疗。')
        await page.locator('#phone').fill('13800000000')
        await page.locator('#wechat').fill('test-wechat')
      }
      await page.getByRole('checkbox').check()
      await seed(page, keys)
      await page.getByRole('button', { name: '提交领养申请', exact: true }).click()
      await page.waitForURL('**/my-adoptions')
      await invalidated(page, keys)
      await resize(page, 390)
      await spaGo(page, '/me')
      await page.getByText(cat.name, { exact: true }).first().waitFor()
    }
    assert.equal(state.adoptions.length, 2)
    console.log('PASS 两端提交领养后个人申请摘要与管理列表缓存刷新')
    await context.close()
  }
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
}
