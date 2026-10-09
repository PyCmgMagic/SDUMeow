import type { UnifiedSearchItem, UnknownRecord } from '@pc/types'

const asRecord = (value: unknown): UnknownRecord | null => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : null
)

const firstString = (source: UnknownRecord, fields: string[]) => {
  for (const field of fields) {
    const value = source[field]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return undefined
}

const firstNumber = (source: UnknownRecord, fields: string[]) => {
  for (const field of fields) {
    const value = source[field]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return undefined
}

const collection = (raw: unknown): unknown[] => {
  if (Array.isArray(raw)) return raw
  const source = asRecord(raw)
  if (!source) return []
  for (const field of ['items', 'records', 'list', 'results']) {
    if (Array.isArray(source[field])) return source[field]
  }
  return []
}

const normalizeSearchItem = (raw: unknown): UnifiedSearchItem | null => {
  const source = asRecord(raw)
  if (!source) return null
  const id = firstString(source, ['id', 'targetId', 'resultId', 'catId'])
  const rawType = firstNumber(source, ['type'])
  if (!id || (rawType !== 0 && rawType !== 1)) return null

  return {
    id,
    type: rawType,
    name: firstString(source, ['name']),
    title: firstString(source, ['title']),
    content: firstString(source, ['content']),
    description: firstString(source, ['description', 'summary']),
    avatar: firstString(source, ['avatar', 'avatarUrl']),
    image: firstString(source, ['image', 'imageUrl', 'cover']),
    catId: firstString(source, ['catId']),
    color: firstNumber(source, ['color']),
    campus: firstNumber(source, ['campus']) as UnifiedSearchItem['campus'],
    location: firstNumber(source, ['location', 'locationId'])
  }
}

export const normalizeSearchItems = (raw: unknown): UnifiedSearchItem[] => (
  collection(raw)
    .map(normalizeSearchItem)
    .filter((item): item is UnifiedSearchItem => Boolean(item))
)
