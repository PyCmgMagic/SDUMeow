import { UserRole, type UserRole as UserRoleType } from '@/types/enums'
import { getJwtExpiry, getJwtPayload, isJwtExpired } from '@shared/jwt'

// JWT 解析已统一到 @shared/jwt，此处转发并保留移动端原有导出签名。

export function getTokenExpiry(token: string): number | null {
  return getJwtExpiry(token)
}

export function getTokenPayload(token: string): Record<string, unknown> | null {
  return getJwtPayload(token)
}

export function isTokenExpired(token: string, nowMs = Date.now()): boolean {
  return isJwtExpired(token, nowMs)
}

export function hasValidSession(role: UserRoleType | null, token: string | null, nowMs = Date.now()): boolean {
  if (!role) {
    return false
  }

  if (role === UserRole.Guest) {
    return true
  }

  if (!token) {
    return false
  }

  return !isTokenExpired(token, nowMs)
}
