import type { BadgeDisplayItem, UnknownRecord } from '@/types'

import firstMeetingIcon from '@/assets/badges/first-meeting.png'
import sharingAmbassadorIcon from '@/assets/badges/sharing-ambassador.png'
import leaderboardKingIcon from '@/assets/badges/leaderboard-king.png'
import recorderIcon from '@/assets/badges/recorder.png'
import scienceExpertIcon from '@/assets/badges/science-expert.png'
import adopterIcon from '@/assets/badges/adopter.png'
import guardianAngelIcon from '@/assets/badges/guardian-angel.png'
import explorerIcon from '@/assets/badges/explorer.png'

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

const localIcon = (name: string, code: string) => {
  const value = `${name} ${code}`
  if (/初次|见面|首次|投喂.?10/.test(value)) return firstMeetingIcon
  if (/传播|分享|大使/.test(value)) return sharingAmbassadorIcon
  if (/打榜|榜王|排行榜/.test(value)) return leaderboardKingIcon
  if (/记录|记录者/.test(value)) return recorderIcon
  if (/科普|知识|达人/.test(value)) return scienceExpertIcon
  if (/领养|领养人/.test(value)) return adopterIcon
  if (/守护|天使/.test(value)) return guardianAngelIcon
  if (/探索|探索家/.test(value)) return explorerIcon
  return undefined
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
    iconUrl: localIcon(name, code) || explicitIcon(source),
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
    if (groupProgress && merged.progress === undefined) merged.progress = groupProgress.currentValue
    if (groupProgress && merged.target === undefined) merged.target = groupProgress.target
    if (merged.earned) merged.progressPercentage = 100
    else if (merged.progressPercentage === undefined && merged.progress !== undefined && merged.target) {
      merged.progressPercentage = Math.min(Math.max(merged.progress / merged.target * 100, 0), 100)
    }
    byId.set(key, merged)
    if (item.code) idByCode.set(item.code, key)
  }
  return [...byId.values()]
}
