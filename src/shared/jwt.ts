/**
 * 统一 JWT 解析 —— 原桌面端 lib/auth.ts 与移动端 utils/session.ts 各有一份
 * 等价实现，合并为一份。
 */

export function getJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payloadSegment = token.split('.')[1]
    if (!payloadSegment) return null

    const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const payloadJson = atob(padded)
    if (!payloadJson) return null

    const payload = JSON.parse(payloadJson)
    return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export function getJwtExpiry(token: string): number | null {
  const payload = getJwtPayload(token) as { exp?: unknown } | null
  if (!payload || typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
    return null
  }
  return payload.exp
}

export function isJwtExpired(token: string, nowMs = Date.now()): boolean {
  const expiry = getJwtExpiry(token)
  if (expiry === null) {
    return false
  }
  return expiry * 1000 <= nowMs
}
