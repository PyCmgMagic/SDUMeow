import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../src/pc/lib/badges.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const exports = {}
vm.runInNewContext(compiled, {
  exports,
  require: (path) => path.endsWith('.png') ? { default: path } : createRequire(import.meta.url)(path),
})
const normalize = (...args) => Array.from(exports.normalizeBadges(...args))

test('covers all mobile badge artwork without reusing images or dropping achievements', () => {
  const names = ['初次见面', '传播大使', '打榜王', '记录者', '科普达人', '领养人', '守护天使', '探索家', '发布帖子', '收到点赞', '投喂', '连续签到', '累计签到']
  const items = normalize(names.map((name, i) => ({ id: 100 + i, name })), [])
  assert.equal(items.length, names.length)
  assert.ok(items.every((item) => item.iconUrl))
  assert.equal(new Set(items.map((item) => item.iconUrl)).size, names.length)
  assert.ok(items.find((item) => item.name === '投喂').iconUrl.includes('投喂'))
})

test('gives the artwork to the most related achievement regardless of response order', () => {
  const records = [{ id: 101, name: '新手达人', description: '学习科普知识' }, { id: 102, name: '科普达人' }, { id: 103, name: '未知成就' }]
  for (const input of [records, [...records].reverse()]) {
    const items = normalize(input, [])
    assert.ok(items.find((item) => item.id === '102').iconUrl)
    assert.equal(items.find((item) => item.id === '101').iconUrl, undefined)
    assert.equal(items.find((item) => item.id === '103').iconUrl, undefined)
  }
})

test('uses mobile tier IDs and preserves every tier without repeating artwork', () => {
  const items = normalize(Array.from({ length: 24 }, (_, i) => ({ id: i + 1, name: `Lv.${i + 1}` })), [])
  assert.equal(items.length, 24)
  const images = items.filter((item) => item.iconUrl).map((item) => item.iconUrl)
  assert.equal(images.length, 5)
  assert.equal(new Set(images).size, 5)
})

test('merges sparse owned entries before matching and keeps catalogue metadata', () => {
  const items = normalize({ data: [{ id: 100, name: '探索家', description: '发现新猫咪' }] }, { data: [{ badgeId: 100 }] })
  assert.equal(items.length, 1)
  assert.equal(items[0].name, '探索家')
  assert.equal(items[0].description, '发现新猫咪')
  assert.ok(items[0].iconUrl)
  assert.equal(items[0].earned, true)
})

test('considers code, group and description, and finds an assignment for competing matches', () => {
  const items = normalize([
    { id: 100, name: '双重成就', description: '成功领养并救助猫咪' },
    { id: 101, name: '领养人' },
    { id: 102, name: '成就', code: 'CHECKIN_STREAK' },
    { id: 103, name: '成就', groupName: '收到点赞' },
  ], [])
  assert.ok(items.every((item) => item.iconUrl))
  assert.equal(new Set(items.map((item) => item.iconUrl)).size, items.length)
})

test('keeps distinct server images and prevents duplicate server image use', () => {
  const items = normalize([{ id: 100, name: '特殊成就', iconUrl: '/custom.png' }, { id: 101, name: '另一成就', iconUrl: '/custom.png' }], [])
  assert.equal(items.filter((item) => item.iconUrl === '/custom.png').length, 1)
})
