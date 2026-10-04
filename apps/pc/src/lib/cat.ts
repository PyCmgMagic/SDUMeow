import { CatStatusMap, type CatDetail, type CatListItem, type Status } from '@/types'

const NON_ADOPTABLE_STATUSES = new Set<Status>([1, 2, 4])

export const isCatAdoptable = (status: Status) => !NON_ADOPTABLE_STATUSES.has(status)

export const getCatAdoptionUnavailableReason = (status: Status) => {
  if (isCatAdoptable(status)) return ''
  return `${CatStatusMap[status]}，暂不可申请领养`
}

export const catDetailToListItem = (cat: CatDetail): CatListItem => ({
  id: cat.id,
  name: cat.name,
  avatar: cat.avatar,
  color: cat.basicInfo.color,
  campus: cat.basicInfo.campus,
  location: cat.basicInfo.hauntLocation ?? null,
  status: cat.basicInfo.status,
  tags: cat.tags,
  isNeutered: cat.basicInfo.neutered.isNeutered,
  popularity: cat.popularity,
  lastSeenTime: cat.basicInfo.lastSeenTime,
  role: cat.basicInfo.role
})
