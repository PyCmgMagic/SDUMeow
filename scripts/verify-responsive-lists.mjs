import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5177'
const output = await mkdtemp(join(tmpdir(), 'meow-responsive-lists-'))
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const errors = []
const requests = []
let sosResolved = false
page.on('pageerror', (error) => errors.push(error.message))
const token = `e30.${Buffer.from(JSON.stringify({ sub: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`
await context.addInitScript((token) => {
  localStorage.setItem('meow.session.admin.accessToken', token)
}, token)
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jY1kAAAAASUVORK5CYII='
const rows = Array.from({ length: 30 }, (_, i) => ({
  id: String(i + 1), name: `测试猫${i + 1}`, avatar: image, color: 1, campus: 5, status: 0,
  basicInfo: { color: 1, campus: 5, status: 0, tags: [], neutered: { isNeutered: false } },
}))
await context.route('**/api/**', async (route) => {
  const url = new URL(route.request().url())
  if (!url.pathname.startsWith('/api/')) return route.continue()
  const path = url.pathname.slice(4)
  requests.push({ path, params: Object.fromEntries(url.searchParams) })
  const current = Number(url.searchParams.get('page') || 1)
  const status = url.searchParams.get('status')
  const paged = (items) => ({ items: items.slice((current - 1) * 10, current * 10), total: items.length, pages: Math.max(1, Math.ceil(items.length / 10)), totalPage: Math.max(1, Math.ceil(items.length / 10)), current })
  let data = { items: [], total: 0, pages: 1 }
  if (path === '/cats') data = paged(rows.map((row) => ({ ...row, status: Number(status || 0), basicInfo: { ...row.basicInfo, status: Number(status || 0) } })))
  else if (path === '/admin/adoptions') data = paged(rows.map((row, i) => ({ id: row.id, userId: i + 1, userName: i === 24 ? '跨页唯一申请人' : `测试申请人${i + 1}`, catId: row.id, catName: row.name, status: ['PENDING', 'INTERVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'].indexOf(status || 'PENDING'), contact: { phone: '13800000000', wechat: 'test' }, createTime: '2026-10-01' })))
  else if (path === '/admin/new-cats') data = paged(rows.map((row, i) => ({ id: row.id, tempName: i === 24 ? '跨页唯一线索' : row.name, status: status || 'PENDING', campus: 5, location: '图书馆', submitterName: '测试提交人', submitterId: i + 1, tags: [], photos: [], createTime: '2026-10-01' })))
  else if (path === '/admin/users') data = paged(rows.map((row, i) => ({ id: i + 1, name: `测试用户${i + 1}`, nickname: `测试用户${i + 1}`, permission: i === 24 ? undefined : i % 2, status: 1, avatar: image, level: 1, sid: '20260001' })))
  else if (/^\/admin\/users\/\d+$/.test(path)) data = { uid: Number(path.split('/').at(-1)), nickname: '跨页详情管理员', permission: 1, avatar: image, level: 1, sid: '20260001', status: 1 }
  else if (path === '/admin/sos') data = paged(rows.map((row) => ({ id: row.id, catId: row.id, catName: row.name, userName: '测试求助人', description: '测试求助', status: sosResolved ? 'RESOLVED' : status || 'PENDING', location: '图书馆', createTime: '2026-10-01' })))
  else if (path === '/admin/sos/1/resolve') { sosResolved = true; data = null }
  else if (path === '/admin/announcements') data = paged(rows.map((row) => ({ id: row.id, title: `测试公告${row.id}`, content: '公告内容', status: status || 'PUBLISHED', type: 0, createTime: '2026-10-01' })))
  else if (path.startsWith('/leaderboard/')) {
    const type = path.split('/').at(-1)
    if (type === 'gluttony') await new Promise((resolve) => setTimeout(resolve, 500))
    data = { items: rows.map((row, i) => ({ ...row, catId: row.id, name: `${type}猫${i + 1}`, catName: `${type}猫${i + 1}`, value: 100 - i, rank: i + 1 })) }
  } else if (/^\/cats\/\d+$/.test(path)) data = rows[0]
  else if (path.startsWith('/type/') || path.startsWith('/types/')) data = [{ id: 1, value: 1, name: '橘猫', label: '橘猫' }]
  else if (path === '/users/me') data = { uid: 1, nickname: '测试用户', campus: 5, contact: {} }
  else if (path.includes('/stats')) data = { totalCats: 30, totalUsers: 30 }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, data, msg: 'success' }) })
})
const navigate = async (path) => {
  await page.goto(`${baseURL}${path}`)
  await page.waitForTimeout(300)
}
const resize = async (width) => {
  await page.setViewportSize({ width, height: 1000 })
  await page.waitForFunction((device) => document.documentElement.dataset.device === device, width < 768 ? 'mobile' : 'pc')
  await page.waitForTimeout(150)
}
const selected = async (name) => {
  await page.getByRole('button', { name, exact: true }).first().waitFor()
  assert.equal(await page.getByRole('button', { name, exact: true }).first().getAttribute('aria-pressed'), 'true')
}
const query = () => new URL(page.url()).searchParams
const waitText = (text) => page.getByText(text, { exact: true }).first().waitFor()
try {
  await navigate('/admin/cats')
  await waitText('测试猫1')
  assert.equal(requests.filter((r) => r.path === '/cats').at(-1).params.status, undefined)
  console.log('PASS 默认猫咪管理不误带在校筛选')
  const cases = [
    { path: '/admin/cats', params: 'status=4&color=1&search=测试&page=2', desktop: '领养处理中', mobile: '领养处理中', text: '测试猫11', search: true, api: '/cats', status: '4' },
    { path: '/admin/adoptions', params: 'status=4&search=测试&page=2', desktop: '已完成', mobile: '已完成', text: '测试申请人11', search: true, api: '/admin/adoptions', status: 'COMPLETED' },
    { path: '/admin/new-cats', params: 'status=REJECTED&search=测试&page=2', desktop: '已驳回', mobile: '已拒绝', text: '测试猫11', search: true, api: '/admin/new-cats', status: 'REJECTED' },
    { path: '/admin/sos', params: 'status=PROCESSING&page=2', desktop: '处理中', mobile: '处理中', text: '测试猫11', api: '/admin/sos', status: 'PROCESSING' },
    { path: '/admin/announcements', params: 'status=DRAFT&page=2', text: '测试公告11', api: '/admin/announcements', status: 'DRAFT' },
    { path: '/admin/users', params: 'role=admin&search=测试&page=2', desktop: '管理员', mobile: '管理员', text: '测试用户22', search: true, api: '/admin/users' },
  ]
  for (const item of cases) {
    await resize(1440)
    await navigate(`${item.path}?${item.params}`)
    await waitText(item.text)
    if (item.desktop) await selected(item.desktop)
    const before = new URL(page.url()).search
    await resize(390)
    await waitText(item.text)
    assert.equal(new URL(page.url()).search, before)
    if (item.mobile) await selected(item.mobile)
    if (item.search) assert.equal(await page.locator('input[placeholder^="搜索"]').first().inputValue(), '测试')
    if (item.path === '/admin/cats') await page.screenshot({ path: join(output, 'cats-mobile.png'), fullPage: true })
    assert.equal(query().get('page'), '2')
    assert.match(await page.getByRole('navigation', { name: '列表分页' }).innerText(), /第 2/)
    const last = requests.filter((r) => r.path === item.api).at(-1)
    if (item.status) assert.equal(last.params.status, item.status)
    assert.ok(['10', '100'].includes(last.params.size || last.params.pageSize))
    const targetPage = item.path === '/admin/users' ? '1' : '3'
    await page.getByRole('button', { name: item.path === '/admin/users' ? '上一页' : '下一页', exact: true }).click()
    assert.equal(query().get('page'), targetPage)
    await resize(1440)
    assert.equal(query().get('page'), targetPage)
    if (item.desktop) await selected(item.desktop)
    if (item.path === '/admin/users') await page.screenshot({ path: join(output, 'users-desktop.png'), fullPage: true })
    console.log(`PASS ${item.path} 筛选与页码双向接续`)
  }
  for (const [path, keyword] of [['/admin/adoptions', '跨页唯一申请人'], ['/admin/new-cats', '跨页唯一线索']]) {
    await navigate(`${path}?search=${encodeURIComponent(keyword)}`)
    await waitText(keyword)
    await resize(390)
    await waitText(keyword)
    await resize(1440)
    await waitText(keyword)
    console.log(`PASS ${path} 搜索能找到后续服务端页的数据`)
  }
  await navigate('/admin/users?role=admin')
  await waitText('测试用户2')
  await resize(390)
  await page.getByRole('button', { name: '下一页', exact: true }).click()
  await waitText('跨页详情管理员')
  assert.match(await page.getByRole('navigation', { name: '列表分页' }).innerText(), /第 2 \/ 2 页/)
  await resize(1440)
  await waitText('跨页详情管理员')
  console.log('PASS 角色跨页筛选、详情补全及两端一致的总页数')
  await navigate('/admin/adoptions?status=5&page=2#list')
  await resize(390)
  await selected('已取消')
  await page.getByRole('button', { name: '待面谈', exact: true }).click()
  assert.equal(query().get('page'), '1')
  assert.equal(query().get('status'), '1')
  assert.equal(new URL(page.url()).hash, '#list')
  await resize(1440)
  await selected('面试中')
  console.log('PASS 移动端更新筛选同步 PC，重置页码并保留锚点')
  await navigate('/admin/new-cats?page=999')
  await page.waitForURL(/page=3/)
  await resize(390)
  assert.equal(query().get('page'), '3')
  await navigate('/admin/adoptions?status=invalid&page=-2')
  await waitText('测试申请人1')
  await selected('全部申请')
  assert.equal(requests.filter((r) => r.path === '/admin/adoptions').at(-1).params.page, '1')
  console.log('PASS 非法筛选回退与越界页码纠正')
  await navigate('/admin/sos')
  await page.getByRole('button', { name: /标记解决/ }).first().waitFor()
  await resize(1440)
  await page.evaluate(async () => {
    const { sosApi } = await import('/src/pc/lib/api.ts')
    await sosApi.resolveSOS('1', { status: 'RESOLVED', reply: '测试处理' })
  })
  await resize(390)
  await page.getByRole('button', { name: '已解决', exact: true }).last().waitFor()
  assert.equal(await page.getByRole('button', { name: /标记解决/ }).count(), 0)
  console.log('PASS PC 操作后立即回到移动端，列表缓存刷新为最新状态')
  await resize(1440)
  await navigate('/leaderboard?type=appearance&expanded=1')
  await waitText('appearance猫30')
  await resize(390)
  await selected('颜值榜')
  await waitText('appearance猫30')
  await page.screenshot({ path: join(output, 'leaderboard-mobile.png'), fullPage: true })
  await page.getByRole('button', { name: '收起', exact: true }).click()
  await page.getByText('appearance猫30', { exact: true }).waitFor({ state: 'hidden' })
  assert.equal(await page.getByText('appearance猫30', { exact: true }).count(), 0)
  await resize(1440)
  assert.equal(await page.getByText('appearance猫30', { exact: true }).count(), 0)
  await Promise.all([
    page.waitForRequest((request) => new URL(request.url()).pathname === '/api/leaderboard/gluttony'),
    page.getByRole('button', { name: '吃货榜', exact: true }).click(),
  ])
  await page.getByRole('button', { name: '战力榜', exact: true }).click()
  await waitText('fight猫1')
  await page.waitForTimeout(650)
  assert.equal(await page.getByText('gluttony猫1', { exact: true }).count(), 0)
  await resize(390)
  await selected('战力榜')
  await waitText('fight猫1')
  await page.getByRole('button', { name: '吃货榜', exact: true }).click()
  await waitText('gluttony猫1')
  await resize(1440)
  await selected('吃货榜')
  await waitText('gluttony猫1')
  await page.getByRole('button', { name: '人气榜', exact: true }).click()
  await waitText('popularity猫1')
  await page.screenshot({ path: join(output, 'leaderboard-desktop.png'), fullPage: true })
  console.log('PASS 四榜切换与展开状态接续，迟到响应不覆盖最新榜单')
  assert.deepEqual(errors, [])
  console.log(`PASS 无浏览器运行异常；截图 ${output}`)
} catch (error) {
  console.error('URL', page.url(), '异常', errors)
  console.error((await page.locator('body').innerText()).slice(0, 3500))
  await page.screenshot({ path: join(output, 'failure.png'), fullPage: true })
  console.error('失败截图', output)
  throw error
} finally {
  await browser.close()
}
