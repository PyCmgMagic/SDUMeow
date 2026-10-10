import type { BadgeDisplayItem, UnknownRecord } from '@pc/types'

import firstMeetingIcon from '@/assets/徽章-初次见面.png'
import sharingAmbassadorIcon from '@/assets/徽章-传播大使.png'
import leaderboardKingIcon from '@/assets/徽章-打榜王.png'
import recorderIcon from '@/assets/徽章-记录者.png'
import scienceExpertIcon from '@/assets/徽章-科普达人.png'
import adopterIcon from '@/assets/徽章-领养人.png'
import guardianAngelIcon from '@/assets/徽章-守护天使.png'
import explorerIcon from '@/assets/徽章-探索家.png'
import postsIcon from '@/assets/发布帖子.png'
import likesIcon from '@/assets/收到点赞.png'
import feedIcon from '@/assets/投喂.png'
import streakCheckinIcon from '@/assets/连续签到.png'
import totalCheckinIcon from '@/assets/累计签到.png'

const asRecord = (value: unknown): UnknownRecord | null => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : null
)

const firstString = (source: UnknownRecord, fields: string[]) => {
  for (const field of fields) {
    const value = source[field]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

const numberValue = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return undefined
}

const firstNumber = (source: UnknownRecord, fields: string[]) => {
  for (const field of fields) {
    const value = numberValue(source[field])
    if (value !== undefined) return value
  }
  return undefined
}

const unwrap = (raw: unknown): unknown => {
  const source = asRecord(raw)
  if (!source) return raw
  return source.data !== undefined && (Array.isArray(source.data) || asRecord(source.data))
    ? source.data
    : raw
}

const explicitIcon = (source: UnknownRecord) => {
  const icon = firstString(source, ['iconUrl', 'icon_url', 'icon', 'imageUrl', 'image'])
  return icon && icon !== '暂无' && !icon.includes('暂无') ? icon : undefined
}

const artwork = [
  { name: '初次见面', icon: firstMeetingIcon, pattern: /初次见面|初次相遇|first[_ -]?meet(?:ing)?/i },
  { name: '传播大使', icon: sharingAmbassadorIcon, pattern: /传播|分享|sharing|share|ambassador/i },
  { name: '打榜王', icon: leaderboardKingIcon, pattern: /打榜|榜王|排行榜|leaderboard|ranking/i },
  { name: '记录者', icon: recorderIcon, pattern: /记录者|记录|recorder/i },
  { name: '科普达人', icon: scienceExpertIcon, pattern: /科普|知识|science|knowledge/i },
  { name: '领养人', icon: adopterIcon, pattern: /领养|adopt/i },
  { name: '守护天使', icon: guardianAngelIcon, pattern: /守护|天使|救助|救援|guardian|rescue|sos/i },
  { name: '探索家', icon: explorerIcon, pattern: /探索|发现.*猫|新猫|explor|discover|found[_ -]?(?:new[_ -]?)?cat/i },
  { name: '发布帖子', icon: postsIcon, pattern: /发(?:布)?帖|发布动态|post|moment/i, ids: [1, 4] },
  { name: '收到点赞', icon: likesIcon, pattern: /点赞|获赞|收到.*赞|like/i, ids: [5, 9] },
  { name: '投喂', icon: feedIcon, pattern: /投喂|喂养|feed/i, ids: [10, 14] },
  { name: '连续签到', icon: streakCheckinIcon, pattern: /连续签到|签到.*连续|streak|continuous[_ -]?check[_ -]?in|check[_ -]?in[_ -]?continuous/i, ids: [15, 19] },
  { name: '累计签到', icon: totalCheckinIcon, pattern: /累计签到|签到.*累计|total[_ -]?check[_ -]?in|check[_ -]?in[_ -]?total/i, ids: [20, 24] },
]

const relevance = (item: BadgeDisplayItem, asset: typeof artwork[number]): number => {
  if (item.name === asset.name) return 1200
  if (asset.pattern.test(item.code || '')) return 1000
  if (asset.pattern.test(item.name)) return 900
  if (asset.pattern.test(`${item.groupCode || ''} ${item.ruleType || ''} ${item.groupName || ''}`)) return 700
  if (asset.pattern.test(item.description)) return 400
  return 0
}

// Maximum-weight one-to-one assignment. Dummy columns leave unrelated artwork unused.
const assignArtwork = (items: BadgeDisplayItem[]) => {
  const ordered = [...items].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
  const scores = artwork.map((asset) => ordered.map((item) => relevance(item, asset)))
  for (let column = 0; column < ordered.length; column++) {
    if (scores.some((row) => row[column] > 0)) continue
    const id = Number(ordered[column].id)
    artwork.forEach((asset, row) => {
      if (asset.ids && id >= asset.ids[0]! && id <= asset.ids[1]!) scores[row]![column] = 250
    })
  }
  const columns = ordered.length + artwork.length
  const rowPotential = Array(artwork.length + 1).fill(0) as number[]
  const columnPotential = Array(columns + 1).fill(0) as number[]
  const matchedRow = Array(columns + 1).fill(0) as number[]
  const previous = Array(columns + 1).fill(0) as number[]
  for (let row = 1; row <= artwork.length; row++) {
    matchedRow[0] = row
    let column = 0
    const distance = Array(columns + 1).fill(Infinity) as number[]
    const visited = Array(columns + 1).fill(false) as boolean[]
    do {
      visited[column] = true
      const currentRow = matchedRow[column]!
      let delta = Infinity
      let nextColumn = 0
      for (let candidate = 1; candidate <= columns; candidate++) {
        if (visited[candidate]) continue
        const cost = -(scores[currentRow - 1]![candidate - 1] || 0) - rowPotential[currentRow]! - columnPotential[candidate]!
        if (cost < distance[candidate]!) {
          distance[candidate] = cost
          previous[candidate] = column
        }
        if (distance[candidate]! < delta) {
          delta = distance[candidate]!
          nextColumn = candidate
        }
      }
      for (let candidate = 0; candidate <= columns; candidate++) {
        if (visited[candidate]) {
          rowPotential[matchedRow[candidate]!]! += delta
          columnPotential[candidate]! -= delta
        } else distance[candidate]! -= delta
      }
      column = nextColumn
    } while (matchedRow[column] !== 0)
    do {
      const predecessor = previous[column]!
      matchedRow[column] = matchedRow[predecessor]!
      column = predecessor
    } while (column !== 0)
  }
  const assigned = new Map<string, string>()
  for (let column = 1; column <= ordered.length; column++) {
    const row = matchedRow[column]! - 1
    if (row >= 0 && scores[row]![column - 1]! > 0) assigned.set(ordered[column - 1]!.id, artwork[row]!.icon)
  }
  const used = new Set(assigned.values())
  // Keep explicit server artwork only when it is not already used by another achievement.
  for (const item of ordered) {
    if (!assigned.has(item.id) && item.iconUrl && !used.has(item.iconUrl)) {
      assigned.set(item.id, item.iconUrl)
      used.add(item.iconUrl)
    }
  }
  return items.map((item) => ({ ...item, iconUrl: assigned.get(item.id) }))
}

type ProgressContext = {
  currentValue?: number
  target?: number
  percentage?: number
  currentBadgeCode?: string
  nextBadgeCode?: string
}

const progressContext = (value: unknown): ProgressContext | undefined => {
  const source = asRecord(value)
  if (!source) return undefined
  const progress = asRecord(source.progress)
  return {
    currentValue: firstNumber(source, ['currentValue', 'current', 'value']) ?? (progress ? firstNumber(progress, ['completed']) : undefined),
    target: firstNumber(source, ['target', 'threshold']) ?? (progress ? firstNumber(progress, ['target', 'required']) : undefined),
    percentage: firstNumber(source, ['percentage', 'progressPercentage']) ?? (progress ? firstNumber(progress, ['percentage']) : undefined),
    currentBadgeCode: firstString(source, ['currentBadgeCode']),
    nextBadgeCode: firstString(source, ['nextBadgeCode']),
  }
}

const normalizeBadge = (raw: unknown, earnedDefault: boolean, group?: UnknownRecord, groupProgress?: ProgressContext): BadgeDisplayItem | null => {
  const wrapper = asRecord(raw)
  if (!wrapper) return null
  const nested = asRecord(wrapper.badge)
  const source = nested ? { ...nested, ...wrapper } : wrapper
  const rawId = source.id ?? source.badgeId ?? source.badge_id ?? source.code ?? source.badgeCode
  if (typeof rawId !== 'string' && typeof rawId !== 'number') return null

  const code = firstString(source, ['code', 'badgeCode', 'badge_code']) || String(rawId)
  const ownProgress = progressContext(source.progress) || progressContext(source)
  const context = ownProgress || groupProgress
  const earnedValue = source.earned ?? source.unlocked ?? source.owned ?? source.obtained ?? source.isEarned ?? source.is_earned
  const earned = typeof earnedValue === 'boolean'
    ? earnedValue
    : typeof earnedValue === 'number'
      ? earnedValue > 0
      : earnedDefault
  const threshold = firstNumber(source, ['threshold', 'target', 'required', 'targetValue']) ?? context?.target
  const progress = firstNumber(source, ['progress', 'current', 'currentValue', 'progressValue']) ?? context?.currentValue
  const progressPercentage = earned
    ? 100
    : firstNumber(source, ['percentage', 'progressPercentage'])
      ?? context?.percentage
      ?? (progress !== undefined && threshold ? Math.min(Math.max(progress / threshold * 100, 0), 100) : undefined)

  const name = firstString(source, ['name', 'badgeName', 'title']) || `徽章 #${rawId}`
  const groupSource = group || {}
  return {
    id: String(rawId),
    code,
    groupCode: firstString(source, ['groupCode']) || firstString(groupSource, ['groupCode']),
    groupName: firstString(source, ['groupName']) || firstString(groupSource, ['groupName']),
    ruleType: firstString(source, ['ruleType']) || firstString(groupSource, ['ruleType']),
    name,
    description: firstString(source, ['description', 'desc', 'condition']),
    iconUrl: explicitIcon(source),
    earned,
    earnedAt: firstString(source, ['earnedAt', 'earned_at', 'obtainedAt', 'unlockTime', 'acquiredAt']) || undefined,
    progress,
    target: threshold,
    threshold,
    tier: firstNumber(source, ['tier', 'level']),
    tierName: firstString(source, ['tierName', 'levelName']),
    progressPercentage,
  }
}

type NormalizedSource = { items: BadgeDisplayItem[]; groups: Map<string, ProgressContext> }

const collect = (raw: unknown, earnedDefault: boolean): NormalizedSource => {
  const root = unwrap(raw)
  const groups = new Map<string, ProgressContext>()
  const items: BadgeDisplayItem[] = []
  const addGroup = (group: UnknownRecord, fallbackCode = '') => {
    const groupCode = firstString(group, ['groupCode', 'code']) || fallbackCode
    const progress = progressContext(group)
    if (groupCode && progress) groups.set(groupCode, progress)
    const badges = Array.isArray(group.badges) ? group.badges : []
    if (badges.length) {
      for (const badge of badges) {
        const item = normalizeBadge(badge, earnedDefault, { ...group, groupCode }, progress)
        if (item) items.push(item)
      }
      return true
    }
    return false
  }

  if (Array.isArray(root)) {
    for (const entry of root) {
      const record = asRecord(entry)
      if (!record || addGroup(record)) continue
      const item = normalizeBadge(entry, earnedDefault)
      if (item) items.push(item)
    }
  } else {
    const source = asRecord(root)
    if (!source) return { items, groups }
    const direct = ['items', 'badges', 'list', 'records'].find((field) => Array.isArray(source[field]))
    if (direct) {
      for (const entry of source[direct] as unknown[]) {
        const record = asRecord(entry)
        if (!record || addGroup(record)) continue
        const item = normalizeBadge(entry, earnedDefault)
        if (item) items.push(item)
      }
    }
    for (const [category, value] of Object.entries(source)) {
      if (!Array.isArray(value) || ['items', 'badges', 'list', 'records'].includes(category)) continue
      for (const entry of value) {
        const record = asRecord(entry)
        if (!record) continue
        if (!addGroup(record, category)) {
          const item = normalizeBadge(record, earnedDefault, { groupCode: category, ruleType: category })
          if (item) items.push(item)
        }
      }
    }
  }
  return { items, groups }
}

export const hasBadgeEntries = (raw: unknown) => {
  const source = collect(raw, false)
  return source.items.length > 0 || source.groups.size > 0
}

export const normalizeBadges = (allRaw: unknown, mineRaw: unknown, progressRaw?: unknown): BadgeDisplayItem[] => {
  const all = collect(allRaw, false)
  const mine = collect(mineRaw, true)
  const progress = collect(progressRaw, false)
  const progressByCode = new Map<string, ProgressContext>()
  for (const [key, value] of [...all.groups, ...progress.groups]) progressByCode.set(key, value)

  const byId = new Map<string, BadgeDisplayItem>()
  const idByCode = new Map<string, string>()
  for (const item of [...all.items, ...progress.items, ...mine.items]) {
    const existingId = byId.has(item.id) ? item.id : (item.code ? idByCode.get(item.code) : undefined)
    const key = existingId || item.id
    const existing = byId.get(key)
    const groupProgress = item.groupCode ? progressByCode.get(item.groupCode) : undefined
    const merged = { ...existing, ...item, earned: item.earned || existing?.earned || false }
    if (existing) {
      if (item.name === `徽章 #${item.id}`) merged.name = existing.name
      for (const field of ['description', 'groupCode', 'groupName', 'ruleType', 'iconUrl', 'earnedAt', 'progress', 'target', 'threshold', 'tier', 'tierName', 'progressPercentage'] as const) {
        if (item[field] === undefined || item[field] === '') Object.assign(merged, { [field]: existing[field] })
      }
      if (item.code === item.id) merged.code = existing.code
    }
    if (groupProgress && merged.progress === undefined) merged.progress = groupProgress.currentValue
    if (groupProgress && merged.target === undefined) merged.target = groupProgress.target
    if (merged.earned) merged.progressPercentage = 100
    else if (merged.progressPercentage === undefined && merged.progress !== undefined && merged.target) {
      merged.progressPercentage = Math.min(Math.max(merged.progress / merged.target * 100, 0), 100)
    }
    byId.set(key, merged)
    if (item.code) idByCode.set(item.code, key)
  }
  return assignArtwork([...byId.values()])
}
