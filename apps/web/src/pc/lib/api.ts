import {http}from '@pc/lib/https';
import type{ 
    PublicStatsData,
    AdminDashboardStats,
    CatDetail,
    PageResult,
    UserInfo,
    LoginParams,
    LoginResult,
    AdminLoginResult,
    BindEmailParams,
    UpdateProfileParams,
    ChangePasswordParams,
    AdoptionParams,
    AdoptionRequestBody,
    AdoptionAuditRequest,
    AdoptionAuditRequestBody,
    AdoptionItem,
    AdoptionStatus,
    AdminAdoptionStatus,
    AdoptionQueryParams,
    MyAdoptionQueryParams,
    MyAdoptionPageResult,
    CheckinResult,
    CheckinHistory,
    CheckinHistoryQueryParams,
    UpdateAvatarQueryParams,
    SOSParams,
    SOSRequestBody,
    SubmitSOSResult,
    ResolveSOSRequest,
    ResolveSOSRequestBody,
    MySOSQueryParams,
    LeaderboardType,
    LeaderboardItem,
    LeaderboardResponse,
    CreatePostParams,
    PostItem,
    PostQueryParams,
    SOSItem,
    SOSResponseItem,
    SOSStatus,
    SOSQueryParams,
    CatListItem,
    CatQueryParams,
    CreateCatParams,
    UpdateCatParams,
    CatImageKeysResult,
    FeedCatResult,
    AdminPageResult,
    AdminUserListResponse,
    AdminUserDetail,
    AdminUserDetailResponse,
    UserQueryParams,
    NewCatItem,
    NewCatQueryParams,
    NewCatResponse,
    ApproveNewCatRequest,
    RejectNewCatRequest,
    ApproveNewCatResult,
    Announcement,
    AnnouncementInput,
    PublicAnnouncementQueryParams,
    AdminAnnouncementQueryParams,
    AnnouncementTypeOption,
    NotificationItem,
    NotificationQueryParams,
    FlexiblePageResult,
    PrepareImageUploadRequest,
    CosImageUploadCredentials,
    SubmitNewCatParams,
    TypeOption,
    TagTypeOption,
    SymptomTypeOption,
    SearchQueryParams
} from '@pc/types';
import { normalizeAdminAdoptionStatus, toAdoptionAuditRequestBody, toAdoptionStatusName } from '@pc/types';

const normalizeAdminUserDetail = (detail: AdminUserDetailResponse): AdminUserDetail => ({
    id: detail.uid,
    name: detail.nickname,
    nickname: detail.nickname,
    avatar: detail.avatar || undefined,
    sid: detail.sid,
    level: detail.level,
    levelTitle: detail.title,
    exp: detail.exp,
    nextExp: detail.nextExp,
    campus: detail.campus,
    currency: detail.currency,
    permission: detail.permission,
    banReason: detail.banReason,
    stats: detail.stats ? {
        feedCount: detail.stats.feedCount ?? 0,
        found: detail.stats.found,
        receivedLikes: detail.stats.receivedLikes ?? 0,
        momentCount: detail.stats.postCount ?? 0
    } : undefined
})

const normalizeSOSItem = (item: SOSResponseItem): SOSItem => {
    const { symptomTags, symptoms, status: rawStatus, ...rest } = item
    const numericStatus = typeof rawStatus === 'number' || /^\d+$/.test(String(rawStatus))
        ? Number(rawStatus)
        : null
    const status = numericStatus === null
        ? rawStatus as SOSStatus
        : ({ 0: 'PENDING', 1: 'PROCESSING', 2: 'RESOLVED', 3: 'CANCELLED' } as const)[numericStatus as 0 | 1 | 2 | 3]

    return {
        ...rest,
        symptoms: symptomTags ?? symptoms ?? [],
        status
    }
}

const normalizeSOSPage = (page: AdminPageResult<SOSResponseItem>): AdminPageResult<SOSItem> => ({
    ...page,
    items: (page.items || []).map(normalizeSOSItem)
})

type AdminAdoptionResponseItem = Omit<AdoptionItem, 'status'> & {
    status: AdminAdoptionStatus | AdoptionStatus | string | number
}

const normalizeAdminAdoptionPage = (
    page: FlexiblePageResult<AdminAdoptionResponseItem> | AdminAdoptionResponseItem[],
): AdminPageResult<AdoptionItem> => {
    const source = Array.isArray(page) ? { items: page } : page
    const items = source.items || source.records || source.list || source.content || []
    const total = Number(source.total ?? items.length)
    const size = Math.max(Number(source.size ?? 10), 1)
    const current = Math.max(Number(source.current ?? source.currentPage ?? 1), 1)
    const pages = Math.max(Number(source.pages ?? source.totalPage ?? (Math.ceil(total / size) || 1)), 1)

    return {
        size,
        current,
        pages,
        total,
        items: items.map((item) => ({
            ...item,
            status: normalizeAdminAdoptionStatus(item.status) ?? 0,
            avatar: item.avatar || undefined,
        })),
    }
}

const normalizeMyAdoptionStatus = (status: unknown): AdoptionStatus => {
    if (typeof status === 'string') {
        const normalized = status.trim().toUpperCase()
        if (['PENDING', 'INTERVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'].includes(normalized)) {
            return normalized as AdoptionStatus
        }
    }

    return toAdoptionStatusName(status) ?? 'PENDING'
}

const normalizeMyAdoptionPage = (page: MyAdoptionPageResult): MyAdoptionPageResult => ({
    ...page,
    items: (page.items || []).map((item) => ({
        ...item,
        status: normalizeMyAdoptionStatus(item.status),
    })),
})

const ADOPTION_HOUSING_CODES = {
    OWN_HOUSE: 0,
    RENT_WHOLE: 1,
    RENT_SHARE: 2,
    DORM: 3,
    WITH_PARENT: 4,
} as const

const ADOPTION_EXPERIENCE_CODES = {
    NEWBIE: 0,
    EXPERIENCED: 1,
    MULTI_CAT: 2,
} as const


export const statsApi={
    // 获取公共统计数据
    getPublicStats(){
        return http.get<PublicStatsData>('/stats/public');
    },
    // 管理路由使用该只读接口校验后端权限，同时供仪表盘后续迁移复用
    getAdminDashboardStats(options: { silent?: boolean } = {}){
        return http.get<AdminDashboardStats>('/admin/dashboard/stats', options);
    }
}

export const catApi={
    //获取猫咪详细信息
    getCatDetail(id:number|string){
        return http.get<CatDetail>(`/cats/${id}`);
    }
    ,
    // 公共和管理页面共用文档定义的服务端分页列表。
    getCatList(params: CatQueryParams = { page: 1, pageSize: 20 }){
        return http.get<PageResult<CatListItem>>('/cats',{params});
    },
    // 管理员新增/编辑猫咪均使用 JSON，图片字段只接收 COS key。
    addCat:(data: CreateCatParams) => http.post<null>('/admin/cats', data),
    editCat:(id:string, data: UpdateCatParams) => http.put<null>(`/admin/cats/${id}`, data),
    getImageKeys:(id:string) => http.get<CatImageKeysResult>(`/admin/cats/${id}/image-keys`),
    //提交领养申请
    submitAdoption(data:AdoptionParams){
        return http.post('/adoptions', {
            ...data,
            info: {
                ...data.info,
                housing: ADOPTION_HOUSING_CODES[data.info.housing],
                experience: ADOPTION_EXPERIENCE_CODES[data.info.experience],
            },
        } satisfies AdoptionRequestBody);
    },
    // 投喂猫咪
    feedCat(id: number | string) {
        return http.post<FeedCatResult>(`/cats/${id}/feed`);
    },
    // 删除猫咪（管理员）
    deleteCat(id: string) {
        return http.delete(`/admin/cats/${id}`);
    },
    //封神榜

    getLeaderboard: async (type: LeaderboardType, limit: number = 20): Promise<LeaderboardItem[]> => {
      const response = await http.get<LeaderboardResponse>(`/leaderboard/${type}`, { params: { limit } })
      return response.items || []
    }
}

export const userApi={
    login:(data:LoginParams)=>http.post<LoginResult>('/users/login',data),
    getUserInfo:()=>http.get<UserInfo>('/users/me'),
    // 已登录用户绑定邮箱：验证码由当前会话对应的邮箱发送，接口不接收 email 字段。
    sendVerificationCodeForCurrentUser:()=>http.get<unknown>('/users/send-verification-code'),
    bindEmail:(data:BindEmailParams)=>http.post<null>('/users/bind-email', data, { authScope: 'user' }),
    // 每日签到
    checkin:()=>http.post<CheckinResult>('/users/me/checkin'),
    // 获取签到历史记录
    getCheckinHistory:(month?: string)=>http.get<CheckinHistory>('/users/me/checkin/history', { params: { month } satisfies CheckinHistoryQueryParams }),
    updateUserInfo:(data: UpdateProfileParams)=>http.put<null>('/users/me', data),
    updateAvatar:(key: string)=>http.put<null>('/users/me/avatar', undefined, { params: { key } satisfies UpdateAvatarQueryParams }),
    // 修改密码。管理员登录只持有独立的 admin token，调用方可显式选择该会话。
    changePassword:(data: ChangePasswordParams, authScope: 'user' | 'admin' = 'user') =>
      http.post('/users/change-password', data, { authScope })
}

export const adminAuthApi = {
    login: (data: LoginParams) => http.post<AdminLoginResult>('/admin/login', data),
}

export const sosApi={
    //获取SOS求助列表(管理员)
    getSOSList:async(params: SOSQueryParams)=>normalizeSOSPage(await http.get<AdminPageResult<SOSResponseItem>>('/admin/sos',{params})),
    // 获取当前用户提交的 SOS 记录
    getMySOS:async(params: MySOSQueryParams)=>normalizeSOSPage(await http.get<AdminPageResult<SOSResponseItem>>('/sos/my',{params})),
    //提交求助信息
    submitSOS:({ media, ...data }: SOSParams) => http.post<SubmitSOSResult>('/sos', {
      ...data,
      // The backend request DTO currently exposes this field as `medium`.
      medium: media,
    } satisfies SOSRequestBody),
    // 取消当前用户尚未处理的 SOS 请求
    cancelSOS:(id:string)=>http.post<null>(`/sos/${id}/cancel`),
    //处理SOS请求（管理员）
    resolveSOS:(id:string,data:ResolveSOSRequest)=>http.post<null>(`/admin/sos/${id}/resolve`, {
      ...data,
      status: data.status === 'PROCESSING' ? 1 : 2,
    } satisfies ResolveSOSRequestBody)
}

export const adoptionApi={
    //获取领养申请列表(管理员)
    getAdoptionList:async (params: AdoptionQueryParams)=>normalizeAdminAdoptionPage(await http.get<FlexiblePageResult<AdminAdoptionResponseItem>>('/admin/adoptions',{
      params: {
        ...params,
        // The admin response uses numeric codes, but the list query binds to
        // the backend AdoptStatus enum and therefore requires its name.
        status: toAdoptionStatusName(params.status),
      },
    })),
    //审核领养申请（管理员）
    auditAdoption:(id:string,data:AdoptionAuditRequest)=>http.post(
      `/admin/adoptions/${id}/audit`,
      toAdoptionAuditRequestBody(data) satisfies AdoptionAuditRequestBody,
    ),
    //获取我的领养记录(用户端)
    getMyAdoptions:async (params?: MyAdoptionQueryParams) =>
      normalizeMyAdoptionPage(await http.get<MyAdoptionPageResult>('/adoptions/my',{params}))
}

export const postApi = {
  createPost: (data: CreatePostParams) => http.post<null>('/posts', data),
  getPosts: (params: PostQueryParams) => http.get<PageResult<PostItem>>('/posts', { params }),
  likePost: (id: string) => http.post<null>(`/posts/${id}/like`, {}),
  unlikePost: (id: string) => http.delete<null>(`/posts/${id}/like`),
  deletePost: (id: string) => http.delete<null>(`/posts/${id}`)
}

export const adminUserApi = {
  // 获取用户列表（管理员）
    getUserList: (params: UserQueryParams) => http.get<AdminUserListResponse>('/admin/users', { params }),
    // 获取用户详情（管理员）
        getUserDetail: async (id: string | number) => normalizeAdminUserDetail(
            await http.get<AdminUserDetailResponse>(`/admin/users/${id}`)
        ),
        // 封禁/解封用户（状态取反）
        toggleBan: (id: string | number) => http.post<null>(`/admin/users/${id}/ban`)
}

export const newCatApi = {
  // 提交发现新猫线索
  submitNewCat: (data: SubmitNewCatParams) => http.post<NewCatResponse>('/new-cats', data)
}

export const cosApi = {
  prepareImageUploads: (data: PrepareImageUploadRequest, authScope: 'user' | 'admin' = 'user') =>
    http.post<CosImageUploadCredentials>('/cos/upload-image', data, { authScope })
}

export const typeApi = {
  getColors: () => http.get<TypeOption[]>('/type/colors'),
  getTags: () => http.get<TagTypeOption[]>('/type/tags'),
  getSymptoms: () => http.get<SymptomTypeOption[]>('/type/symptoms'),
  getLocations: () => http.get<TypeOption[]>('/type/locations'),
  getRoles: () => http.get<TypeOption[]>('/type/roles')
}

export const searchApi = {
  search: (params: SearchQueryParams) =>
    http.get<unknown>('/search', { params })
}

export const badgeApi = {
  getAllBadges: () => http.get<unknown>('/badges'),
  getMyBadges: () => http.get<unknown>('/badges/mine'),
  getBadgeProgress: () => http.get<unknown>('/badges/progress')
}

export const adminNewCatApi = {
  // 获取新喵线索列表
  getNewCatList: (params: NewCatQueryParams) => 
    http.get<PageResult<NewCatItem>>('/admin/new-cats', { params }),
  // 审核/转正新猫
  approveNewCat: (id: string, data: ApproveNewCatRequest) =>
    http.post<ApproveNewCatResult>(`/admin/new-cats/${id}/approve`, data)
  ,
  rejectNewCat: (id: string, data: RejectNewCatRequest = {}) =>
    http.post<null>(`/admin/new-cats/${id}/reject`, data)
}

export const announcementApi = {
  getAnnouncements: (params: PublicAnnouncementQueryParams) =>
    http.get<FlexiblePageResult<Announcement>>('/announcements', { params }),
  getAnnouncement: (id: string) => http.get<Announcement>(`/announcements/${id}`),
  getTypes: () => http.get<AnnouncementTypeOption[]>('/type/announcement-types')
}

export const adminAnnouncementApi = {
  getAnnouncements: (params: AdminAnnouncementQueryParams) =>
    http.get<FlexiblePageResult<Announcement>>('/admin/announcements', { params }),
  createAnnouncement: (data: AnnouncementInput) => http.post<Announcement>('/admin/announcements', data),
  updateAnnouncement: (id: string, data: AnnouncementInput) =>
    http.put<Announcement>(`/admin/announcements/${id}`, data),
  deleteAnnouncement: (id: string) => http.delete<null>(`/admin/announcements/${id}`)
}

export const notificationApi = {
  getNotifications: (params?: NotificationQueryParams) =>
    http.get<FlexiblePageResult<NotificationItem>>('/notifications', { params }),
  markAsRead: (id: string) => http.post<null>(`/notifications/${id}/read`),
  markAllAsRead: () => http.post<null>('/notifications/read-all')
}
