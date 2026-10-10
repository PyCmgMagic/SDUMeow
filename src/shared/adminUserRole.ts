import { asRecord } from '@/utils/format'

export function adminUserRole(value: unknown): 'admin' | 'user' | 'unknown' {
  const row = asRecord(value)
  const sources = [row, asRecord(row.profile), asRecord(row.userInfo)]
  const first = (keys: string[]) => sources.flatMap((source) => keys.map((key) => source[key]))
    .find((value) => value !== null && value !== undefined && value !== '')
  const text = (value: unknown): string => {
    if (Array.isArray(value)) return value.map(text).join(' ')
    if (typeof value === 'object' && value) {
      const record = asRecord(value)
      return text(record.name ?? record.role ?? record.authority ?? record.permission ?? record.value)
    }
    return String(value ?? '').trim().toLowerCase()
  }
  const permission = text(first(['permission', 'permissions', 'auth', 'authority', 'authorities', 'permissionLevel']))
  const role = text(first(['roleName', 'role', 'userRole', 'userType', 'accountRole']))
  const flag = text(first(['isAdmin', 'admin', 'adminFlag', 'isManager', 'manager', 'superAdmin']))
  const combined = `${permission} ${role}`
  if (['true', '1', 'yes', 'y', 'admin'].includes(flag) || /admin|manager|root|super|管理员/.test(combined)) return 'admin'
  if (/user|student|normal|member|普通用户/.test(combined)) return 'user'
  for (const candidate of [permission, role]) {
    if (/^\d+$/.test(candidate)) return Number(candidate) > 0 ? 'admin' : 'user'
  }
  if (['false', '0', 'no', 'n', 'user', 'normal'].includes(flag)) return 'user'
  return 'unknown'
}
