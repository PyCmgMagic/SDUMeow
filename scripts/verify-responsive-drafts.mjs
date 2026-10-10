import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5177'
const output = await mkdtemp(join(tmpdir(), 'meow-responsive-drafts-'))
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) })
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY1kAAAAASUVORK5CYII='
const errors = []
const requests = []
let errorPath = ''
let errorStatus = 404
let fed = false
let profileFails = false
const token = `e30.${Buffer.from(JSON.stringify({ sub: 'test', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`
const cat = {
  id: '1', name: '真实测试猫', avatar: image, images: [], aliases: [], tags: [],
  color: 1, campus: 5, location: 1, status: 0, gender: 1, role: 1,
  description: '原始介绍', attributes: { friendliness: 5, gluttony: 6, fight: 3, appearance: 8 },
  basicInfo: { color: 1, campus: 5, hauntLocation: 1, status: 0, gender: 1, role: 1, healthStatus: 0, neutered: { isNeutered: false, type: 1 } },
}
async function setup(scope) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.addInitScript(({ scope, token }) => localStorage.setItem(`meow.session.${scope}.accessToken`, token), { scope, token })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', (error) => errors.push(error.message))
  await context.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    if (!url.pathname.startsWith('/api/')) return route.continue()
    const path = url.pathname.slice(4)
    const method = route.request().method()
    requests.push({ path, method, params: Object.fromEntries(url.searchParams), body: route.request().postDataJSON() })
    if (path === errorPath || profileFails && path === '/users/me') return route.fulfill({ status: path === errorPath ? errorStatus : 500, contentType: 'application/json', body: JSON.stringify({ code: 500, msg: '测试接口失败' }) })
    const current = Number(url.searchParams.get('page') || 1)
    const paged = (items, total = 1) => ({ items, total, pages: Math.ceil(total / 10), totalPage: Math.ceil(total / 10), current })
    const status = url.searchParams.get('status')
    let data = paged([])
    if (path === '/cats') data = paged([cat])
    else if (path === '/cats/1') data = { ...cat, description: fed ? '投喂后更新的详情' : cat.description }
    else if (path === '/cats/1/feed') { fed = true; data = { userCurrency: 90 } }
    else if (path === '/admin/cats/1/image-keys') data = { avatar: 'meow/avatar.png', images: [] }
    else if (path === '/admin/announcements') data = paged([{ id: '1', title: '真实测试公告', content: '原始正文', type: 0, status: 'DRAFT', summary: '保留摘要', coverImage: 'meow/cover.png' }])
    else if (path === '/admin/new-cats') data = paged([{ id: '1', tempName: '真实新猫线索', campus: 5, location: 1, images: [], status: 'PENDING', tags: [], submitterId: '1', submitterName: '测试提交人' }])
    else if (path === '/admin/adoptions') data = paged([{ id: '1', catId: '1', catName: cat.name, userId: '1', userName: '真实测试申请人', status: 0, contact: { phone: '13800000000' }, info: {} }])
    else if (path === '/admin/sos') data = paged([{ id: '1', catId: '1', catName: cat.name, campus: 5, status: 'PENDING', userName: '测试求助人', symptoms: [], description: '真实求助', location: '图书馆' }])
    else if (path === '/adoptions/my') data = paged([{ id: String(current), catId: '1', catName: '个人申请', catAvatar: image, status: status || 'PENDING', createTime: '2026-10-01' }], 30)
    else if (path === '/sos/my') data = paged([{ id: String(current), catName: '个人求助', status: status || 'PENDING', campus: 5, location: '图书馆', symptoms: [], description: '真实求助' }], 30)
    else if (path === '/notifications') data = paged([{ id: '1', title: '真实通知', type: 'ADOPT', isRead: false }], 30)
    else if (path.startsWith('/type/') || path.startsWith('/types/')) data = [{ id: 1, value: 1, name: '测试类型', label: '测试类型' }]
    else if (path === '/users/me') data = { uid: 1, nickname: '测试用户', campus: 5, contact: {}, currency: fed ? 90 : 100 }
    else if (path.includes('/stats')) data = { totalCats: 1, totalUsers: 1 }
    else if (method !== 'GET') data = null
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data, msg: 'success' }) })
  })
  return { context, page }
}
async function resize(page, width) {
  await page.setViewportSize({ width, height: 1000 })
  await page.waitForFunction((device) => document.documentElement.dataset.device === device, width < 768 ? 'mobile' : 'pc')
}
async function go(page, path) { await page.goto(baseURL + path, { waitUntil: 'domcontentloaded', timeout: 30000 }) }
let fieldId = 0
async function value(locator, expected) {
  await locator.waitFor()
  const marker = `field-${++fieldId}`
  const selector = await locator.evaluate((el, marker) => { el.dataset.regressionField = marker; return `[data-regression-field="${marker}"]` }, marker)
  await locator.page().waitForFunction(({ selector, expected }) => document.querySelector(selector)?.value === expected, { selector, expected })
  assert.equal(await locator.inputValue(), expected)
}

try {
  const { context, page } = await setup('admin')
  await go(page, '/admin/cats')
  await page.getByRole('button', { name: '编辑', exact: true }).first().click()
  const pcName = page.getByPlaceholder('输入猫咪名称')
  await value(pcName, cat.name)
  await pcName.fill('跨端猫咪草稿')
  await page.getByPlaceholder('输入别名，用英文逗号分隔').count().then(async (count) => { if (count) await page.getByPlaceholder('输入别名，用英文逗号分隔').fill('桌面别名') })
  await page.locator('input[type="file"]').first().setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from(image.split(',')[1], 'base64') })
  await resize(page, 390)
  await page.waitForURL('**/admin/cats/1/edit')
  await value(page.locator('#name'), '跨端猫咪草稿')
  assert.match(await page.getByAltText('猫咪头像').getAttribute('src'), /^(blob:|data:)/)
  await page.locator('#name').fill('移动端继续编辑')
  await resize(page, 1440)
  await value(page.locator('#name'), '移动端继续编辑')
  await resize(page, 390)
  await value(page.locator('#name'), '移动端继续编辑')
  console.log('PASS 猫咪编辑名称、头像文件在断点切换后接续')

  await resize(page, 1440)
  await go(page, '/admin/announcements')
  await page.getByRole('button', { name: '编辑', exact: true }).first().click()
  await page.locator('#announcement-title').fill('公告草稿标题')
  await page.locator('#announcement-content').fill('跨端正文草稿')
  await page.locator('#announcement-summary').fill('桌面摘要草稿')
  await resize(page, 390)
  await page.waitForURL('**/admin/announcements/1/edit')
  await value(page.locator('#title'), '公告草稿标题')
  await value(page.locator('#content'), '跨端正文草稿')
  await page.locator('#content').fill('移动端继续公告正文')
  await resize(page, 1440)
  await value(page.locator('#content'), '移动端继续公告正文')
  const noticeSaved = page.waitForResponse((response) => response.url().endsWith('/api/admin/announcements/1') && response.request().method() === 'PUT')
  await page.getByRole('button', { name: '立即发布公告', exact: true }).click()
  await noticeSaved
  const savedNotice = requests.filter((r) => r.path === '/admin/announcements/1' && r.method !== 'GET').at(-1)
  assert.equal(savedNotice.body.summary, '桌面摘要草稿')
  assert.equal(savedNotice.body.coverImage, 'meow/cover.png')
  console.log('PASS 公告标题正文接续，保存时保留桌面摘要和封面')

  await go(page, '/admin/new-cats')
  await page.getByRole('button', { name: '审核', exact: true }).first().click()
  await page.getByPlaceholder('请输入正式名称').fill('正式名称草稿')
  await resize(page, 390)
  await value(page.getByPlaceholder('请输入正式名称'), '正式名称草稿')
  await page.getByPlaceholder('请输入正式名称').fill('移动端正式名称')
  await resize(page, 1440)
  await value(page.getByPlaceholder('请输入正式名称'), '移动端正式名称')
  await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click()
  await page.getByRole('button', { name: '驳回', exact: true }).first().click()
  await page.locator('textarea').fill('跨端拒绝原因')
  await resize(page, 390)
  await value(page.getByPlaceholder('例如：重复'), '跨端拒绝原因')
  await resize(page, 1440)
  await value(page.locator('textarea'), '跨端拒绝原因')
  await resize(page, 390)
  const rejected = page.waitForResponse((response) => response.url().endsWith('/api/admin/new-cats/1/reject'))
  await page.getByRole('button', { name: '确认拒绝', exact: true }).click()
  await rejected
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  await resize(page, 1440)
  assert.equal(await page.getByRole('dialog').count(), 0)
  console.log('PASS 新猫审核弹窗、正式名称与拒绝原因双向接续')

  for (const item of [
    { path: '/admin/adoptions', button: '审核', field: '说明处理条件或拒绝原因' },
    { path: '/admin/sos', button: '处理救援', field: '说明已采取的救援措施、后续安排或处理结果' },
  ]) {
    await go(page, item.path)
    await page.getByRole('button', { name: item.button, exact: true }).first().click()
    await page.getByPlaceholder(item.field).fill('待提交的处理说明')
    await resize(page, 390)
    await page.getByRole('heading', { name: item.path.endsWith('sos') ? 'SOS 救援管理' : '领养申请审批', exact: true }).count()
    await resize(page, 1440)
    await value(page.getByPlaceholder(item.field), '待提交的处理说明')
    await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click()
    console.log(`PASS ${item.path} 待提交审核说明切换后保留`)
  }
  await resize(page, 390)
  for (const path of ['/cats', '/admin/adoptions']) {
    for (const status of [404, 500]) {
      errorPath = path; errorStatus = status
      await go(page, path === '/cats' ? '/admin/cats' : path)
      await page.getByText('加载失败', { exact: true }).waitFor()
      assert.equal(await page.locator('article').count(), 0)
      await page.screenshot({ path: join(output, `error-${status}-${path.includes('adoptions') ? 'adoptions' : 'cats'}.png`), fullPage: true })
    }
  }
  errorPath = ''
  await go(page, '/admin/sos/missing')
  await page.getByText('未找到该救援记录', { exact: true }).waitFor()
  assert.equal(await page.getByText('张子涵', { exact: true }).count(), 0)
  console.log('PASS 404、500 和不存在的 SOS 详情均不展示虚构记录')
  await resize(page, 1440)
  await go(page, '/admin/new-cats')
  await page.getByRole('button', { name: '审核', exact: true }).first().click()
  await page.getByPlaceholder('请输入正式名称').fill('需要隔离的管理员草稿')
  const isolated = await page.evaluate(async () => {
    const { readDraft } = await import('/src/shared/drafts.ts')
    const { useAuthStore } = await import('/src/shared/auth.store.ts')
    const before = readDraft('admin-new-cats-dialog').values.approveForm.officialName
    useAuthStore.getState().logoutActive()
    return { before, after: readDraft('admin-new-cats-dialog').values }
  })
  assert.equal(isolated.before, '需要隔离的管理员草稿')
  assert.deepEqual(isolated.after, {})
  console.log('PASS 退出账号清空管理草稿，已提交审核不会在切换后重新打开')
  await context.close()

  const user = await setup('user')
  for (const item of [
    { path: '/my-adoptions?status=INTERVIEW&page=2', label: '面试中', api: '/adoptions/my' },
    { path: '/my-sos?status=PROCESSING&page=2', label: '处理中', api: '/sos/my' },
    { path: '/notifications?tab=adoption&page=2', api: '/notifications' },
  ]) {
    await go(user.page, item.path)
    await user.page.getByRole('button', { name: item.path.startsWith('/notifications') ? '领养进度' : item.label }).first().waitFor()
    const url = user.page.url()
    await resize(user.page, 390)
    assert.equal(user.page.url(), url)
    await resize(user.page, 1440)
    assert.equal(user.page.url(), url)
    await user.page.waitForTimeout(200)
    assert.equal(requests.filter((r) => r.path === item.api && (r.params.pageSize === '10' || r.params.size === '10')).at(-1).params.page, '2')
    console.log(`PASS ${item.path} 个人筛选及页码双向接续`)
  }
  await resize(user.page, 390)
  await go(user.page, '/cats/1')
  await user.page.getByText(cat.name, { exact: true }).first().waitFor()
  await resize(user.page, 1440)
  await user.page.getByRole('button', { name: '投喂', exact: true }).waitFor()
  profileFails = true
  const detailsBefore = requests.filter((r) => r.path === '/cats/1').length
  const feedResponse = user.page.waitForResponse((response) => response.url().endsWith('/api/cats/1/feed'))
  await user.page.getByRole('button', { name: '投喂', exact: true }).click()
  await feedResponse
  await user.page.getByText(/投喂成功/).first().waitFor()
  await user.page.getByText('投喂后更新的详情', { exact: true }).waitFor()
  assert.ok(requests.some((r) => r.path === '/cats/1/feed' && r.method === 'POST'))
  await resize(user.page, 390)
  await user.page.waitForFunction(async () => {
    const { queryClient } = await import('/src/shared/queryClient.ts')
    return queryClient.getQueryData(['cat-detail', '1'])?.data?.description === '投喂后更新的详情'
  })
  assert.ok(requests.filter((r) => r.path === '/cats/1').length >= detailsBefore + 2)
  console.log('PASS PC 投喂刷新本端及移动端缓存，个人信息刷新失败不误报投喂失败')
  profileFails = false
  await user.context.close()
  assert.deepEqual(errors, [])
  console.log(`PASS 无运行时异常；截图目录 ${output}`)
} catch (error) {
  console.error(error)
  console.error('Last requests:', requests.slice(-12))
  throw error
} finally {
  await browser.close()
}
