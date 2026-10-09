import { queryClient } from './queryClient'

type MutationKind = 'cat' | 'feed' | 'moment' | 'announcement' | 'adoption' | 'new-cat' | 'sos' | 'user'

/** PC 的本地列表和移动端的 Query 缓存必须在同一次操作后同步刷新。 */
export function invalidateRelatedQueries(kind: MutationKind, id?: string) {
  const keys: Record<MutationKind, readonly (readonly string[])[]> = {
    cat: [['cat-detail', ...(id ? [id] : [])], ['cats'], ['admin-cats'], ['leaderboard'], ['admin-dashboard']],
    feed: [['cat-detail', ...(id ? [id] : [])], ['cats'], ['leaderboard'], ['me']],
    moment: [['cat-moments', ...(id ? [id] : [])], ['moments'], ['me']],
    announcement: [['admin-announcements'], ['announcements'], ['announcement-detail'], ['notifications']],
    adoption: [['admin-adoptions'], ['my-adoptions'], ['cat-detail'], ['cats'], ['admin-cats'], ['admin-dashboard'], ['notifications']],
    'new-cat': [['admin-new-cats'], ['cats'], ['admin-cats'], ['admin-dashboard']],
    sos: [['admin-sos'], ['my-sos'], ['admin-dashboard'], ['notifications']],
    user: [['admin-users'], ['admin-user'], ['admin-dashboard'], ['me']],
  }
  for (const queryKey of keys[kind]) void queryClient.invalidateQueries({ queryKey })
}
