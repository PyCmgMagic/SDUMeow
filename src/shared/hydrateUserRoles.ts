import { adminUserRole } from './adminUserRole'

export async function hydrateUserRoles<T>(items: T[], detail: (item: T) => Promise<T>): Promise<T[]> {
  const result = [...items]
  // Older list responses omit roles; bound detail requests while resolving them.
  for (let start = 0; start < items.length; start += 3) {
    await Promise.all(items.slice(start, start + 3).map(async (item, offset) => {
      if (adminUserRole(item) === 'unknown') result[start + offset] = await detail(item)
    }))
  }
  return result
}
