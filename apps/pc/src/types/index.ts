/**
 * MeowPC 跨模块类型唯一入口。
 *
 * 这里存放领域模型、请求/响应 DTO、共享状态和纯领域映射。
 * 单组件 Props、页面内部状态、第三方库推导类型和模块增强应与实现共置。
 */

// 共享基础类型
export type UnknownRecord = Record<string, unknown>

export interface AuthTokens {
  accessToken: string
  refreshToken?: string
}

// 通用传输类型
export interface ApiResponse<T> {
  code: number;
  data: T;
  message?: string;
  msg?: string; // 兼容后端返回的 msg 字段
}

// 登录参数
export interface LoginParams {
  email: string;
  password: string;
}

export interface LoginResult{
  accessToken:string;
  userInfo:UserInfo;
  refreshToken?:string;
}

// 管理员密码登录响应（POST /admin/login）
export interface AdminLoginResult {
  accessToken: string;
  refreshToken?: string;
  email?: string;
}

export interface RefreshTokenResult {
  accessToken: string;
  refreshToken?: string;
}

// 邮箱绑定参数（POST /users/bind-email，已登录用户）
// 线上部署路径为 /users/bind-email；请求体与 Apifox bind-email 契约一致。
export interface BindEmailParams {
  password: string;
  code: string;
}

// 修改密码参数
export interface ChangePasswordParams {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

//用户详情（主接口）
export interface UserInfo {
  uid: number;        // 用户ID
  email?: string;     // 已绑定邮箱（部分登录方式可能暂不返回）
  nickname: string;   // 昵称
  sid: string;        // 学号
  avatar: string;
  level: number;
  title: string;      // 等级称号 "资深铲屎官"
  exp: number;        // 当前经验
  nextExp: number;    // 升级所需经验
  campus: number;     // 校区ID
  currency: number;   // 小鱼干余额 
  stats: UserStats;   // 
  settings?: UserSettings; // 
  contact?: {
    wechat: string;
    phone: string;
  }
  role?: string;
  roleName?: string;
  permission?: string;
  roles?: string[];
  permissions?: string[];

}
//用户信息更新参数
export interface UpdateProfileParams {
  nickname: string;
  avatar: string;
  campus: number;
  contact: {
    phone: string;
    wechat: string;
  };
}

export type ImageUploadType = 'jpg' | 'png'

export interface PrepareImageUploadRequest {
  types: ImageUploadType[];
}

export interface CosImageUploadCredentials {
  tmpSecretId: string;
  tmpSecretKey: string;
  sessionToken: string;
  bucket: string;
  region: string;
  keys: string[];
}

export interface FeedCatResult {
  userCurrency: number
}

export interface SearchQueryParams {
  keyword: string
  page: number
  pageSize: number
}

// Observed GET /search result categories: 0 = cat, 1 = user.
export type SearchResultType = 0 | 1

export interface CheckinHistoryQueryParams {
  month?: string
}

export interface UpdateAvatarQueryParams {
  key: string
}

export interface TypeOption {
  id: number;
  label: string;
}

export interface TagTypeOption {
  id: number;
  name: string;
}

export interface SymptomTypeOption {
  id: number;
  tag: string;
  description: string;
}

export interface UnifiedSearchItem {
  id: string;
  type: SearchResultType;
  name?: string;
  title?: string;
  content?: string;
  description?: string;
  avatar?: string;
  image?: string;
  catId?: string;
  color?: number;
  campus?: Campus;
  location?: number | null;
}

export interface BadgeDisplayItem {
  id: string;
  code?: string;
  groupCode?: string;
  groupName?: string;
  ruleType?: string;
  name: string;
  description: string;
  iconUrl?: string;
  earned: boolean;
  earnedAt?: string;
  progress?: number;
  target?: number;
  threshold?: number;
  tier?: number;
  tierName?: string;
  progressPercentage?: number;
}

//用户统计数据
export interface UserStats{
  feedCount:number;
  found:number;
  receivedLikes:number;
  momentCount:number;
}

//用户设置
export interface UserSettings{
  showBadge:boolean;//是否显示勋章
  pushNotification:boolean;//是否接受推送
}

//分页数据格式
export interface PageResult<T> {
  total: number;
  currentPage: number;
  totalPage: number;
  hasNext: boolean;
  items: T[]; 
}

export interface AdminPageResult<T> {
  size: number;
  current: number;
  items: T[];
  total: number;
  pages: number;
}

//侧边栏菜单项
export interface MenuItem {
  name: string;
  icon: string;
  path: string;
}

// 公共统计数据（/stats/public）
export interface PublicStatsData {
  totalCats: number;
  residentCats: number;
  adoptedCats: number;
  neuteredCats: number;
}

export interface DashboardCampusDistribution {
  campus: Campus;
  percentage: number;
  count: number;
}

export interface AdminDashboardStats {
  adoptApplications: number;
  totalCats: number;
  pendingSOS: number;
  campusDistribution: DashboardCampusDistribution[];
}

//首页快捷卡片数据项
export interface ShortcutItem {
  id: number;
  title: string;
  desc: string;
  path: string;
  iconColor: string;
  bgColor: string;
  iconPath: string;
}

//猫猫数据项
export type Gender = 0 | 1 | 2;
export type Status = 0 | 1 | 2 | 3 | 4;
export type HealthStatus = 0 | 1 | 2;
export type Campus = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;


export const CampusMap: Record<number, string> = {
  0: '中心校区',
  1: '趵突泉校区',
  2: '洪家楼校区',
  3: '千佛山校区',
  4: '兴隆山校区',
  5: '软件园校区',
  6: '青岛校区',
  7: '威海校区'
}

//猫咪基本信息
export interface CatBasicInfo {
  color: number;
  gender: Gender;
  campus: Campus;
  hauntLocation?: number | null;
  role: number;
  birthYear: number;
  admissionDate: string | null;
  status: Status;
  healthStatus: HealthStatus;
  lastSeenTime: string | null;
  neutered: NeuteredInfo;
}
//猫咪绝育信息
export interface NeuteredInfo {
  isNeutered: boolean;
  date?: string | null;
  type?: 0 | 1 | null;
}

//猫咪属性评分
export interface CatAttribute {
  friendliness: number; // 亲人
  gluttony: number;     // 贪吃
  fight: number;        // 战斗
  appearance: number;   // 颜值
}

// 猫际关系
export interface CatRelation {
  catId: string;
  name: string;
  relation: string; // 如 "死对头", "情侣"
  avatar: string;
}
//猫咪详细信息(主接口)
export interface CatDetail {
  id: string;
  name: string;
  aliases: string[];
  avatar: string;
  images: string[];
  basicInfo: CatBasicInfo;
  attributes: CatAttribute;
  tags: number[];//标签列表
  relationships?: CatRelation[];//猫际关系
  description: string;//猫咪描述
  popularity: number;//人气值
  locationName?: string; // 常驻地点名称

}

//猫猫列表查询参数
export interface CatListItem {
  id: string;
  name: string;
  avatar: string;
  color: number;
  campus: Campus;
  location: number | null;
  status: Status;
  tags: number[];
  isNeutered: boolean;
  popularity: number;
  lastSeenTime: string | null;
  role: number;
}

// 管理端编辑在列表 DTO 的基础上补充详情字段。
export interface AdminCatItem extends CatListItem {
  aliases?: string[];
  images?: string[];
  avatar: string;
  gender?: Gender;
  healthStatus?: HealthStatus;
  hauntLocation?: number | null;
  birthYear?: number;
  admissionDate?: string | null;
  description?: string; // 猫咪描述
  attributes?: CatAttribute;
  neuteredDate?: string | null;
  neuteredType?: number | null;
}

// 猫咪列表查询参数
export interface CatQueryParams {
  page: number;
  pageSize: number;
  campus?: Campus;
  status?: Status;
  color?: number;
  search?: string;
  sort?: string;
}

export type AdoptionStatus = 'PENDING' | 'INTERVIEW' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED'
// 后端 AdoptStatus 状态码：0 待审核、1 面试中、2 已通过、3 已拒绝、4 已完成、5 已取消。
// 与用户端字符串状态分开，避免把原始响应强行声明成另一套契约。
export type AdminAdoptionStatus = 0 | 1 | 2 | 3 | 4 | 5
export type AdoptionHousing = 'OWN_HOUSE' | 'RENT_WHOLE' | 'RENT_SHARE' | 'DORM' | 'WITH_PARENT'
export type AdoptionExperience = 'NEWBIE' | 'EXPERIENCED' | 'MULTI_CAT'

export const AdoptionStatusMap: Record<AdoptionStatus, string> = {
  PENDING: '待审核',
  INTERVIEW: '面试中',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  COMPLETED: '已完成',
  CANCELLED: '已取消'
}

export const AdminAdoptionStatusMap: Record<AdminAdoptionStatus, string> = {
  0: '待审核',
  1: '面试中',
  2: '已通过',
  3: '已拒绝',
  4: '已完成',
  5: '已取消'
}

export const AdminAdoptionStatusNameMap: Record<AdminAdoptionStatus, AdoptionStatus> = {
  0: 'PENDING',
  1: 'INTERVIEW',
  2: 'APPROVED',
  3: 'REJECTED',
  4: 'COMPLETED',
  5: 'CANCELLED'
}

// 管理端响应可能返回状态名或数字码，在边界统一解释，避免标签和操作按钮各自解释原始状态。
export const normalizeAdminAdoptionStatus = (status: unknown): AdminAdoptionStatus | undefined => {
  if (typeof status === 'string') {
    const normalized = status.trim().toUpperCase()
    const namedStatus: Record<string, AdminAdoptionStatus> = {
      PENDING: 0,
      INTERVIEW: 1,
      APPROVED: 2,
      REJECTED: 3,
      COMPLETED: 4,
      CANCELLED: 5,
    }
    if (normalized in namedStatus) return namedStatus[normalized]
    if (!/^\d+$/.test(normalized)) return undefined
    status = Number(normalized)
  }

  if (status === 0 || status === 1 || status === 2 || status === 3 || status === 4 || status === 5) return status
  return undefined
}

export const isAdminAdoptionPendingStatus = (status: unknown) =>
  normalizeAdminAdoptionStatus(status) === 0

export const toAdoptionStatusName = (status: unknown): AdoptionStatus | undefined => {
  const normalized = normalizeAdminAdoptionStatus(status)
  return normalized === undefined ? undefined : AdminAdoptionStatusNameMap[normalized]
}

export const isAdminAdoptionAuditableStatus = (status: unknown) => {
  const normalized = normalizeAdminAdoptionStatus(status)
  return normalized === 0 || normalized === 1 || normalized === 2
}

export type AdoptionAuditStatus = Exclude<AdoptionStatus, 'PENDING' | 'CANCELLED'>
export type AdoptionAuditStatusCode = 1 | 2 | 3 | 4

export const AdoptionAuditStatusCodeMap: Record<AdoptionAuditStatus, AdoptionAuditStatusCode> = {
  INTERVIEW: 1,
  APPROVED: 2,
  REJECTED: 3,
  COMPLETED: 4
}

export const AdoptionHousingMap: Record<AdoptionHousing, string> = {
  OWN_HOUSE: '自有住房',
  RENT_WHOLE: '整租',
  RENT_SHARE: '合租',
  DORM: '学生宿舍',
  WITH_PARENT: '与父母同住'
}

export const AdoptionExperienceMap: Record<AdoptionExperience, string> = {
  NEWBIE: '无经验',
  EXPERIENCED: '有养猫经验',
  MULTI_CAT: '多猫家庭'
}

//领养申请参数
export interface AdoptionParams {
  catId: string;
  info:{
    housing: AdoptionHousing;
    experience: AdoptionExperience;
    plan: string;
  };
  contact:{
    wechat: string;
    phone: string;
  }
}

export type AdoptionHousingCode = 0 | 1 | 2 | 3 | 4
export type AdoptionExperienceCode = 0 | 1 | 2

export interface AdoptionRequestBody extends Omit<AdoptionParams, 'info'> {
  info: {
    housing: AdoptionHousingCode;
    experience: AdoptionExperienceCode;
    plan: string;
  };
}

// 领养申请列表项（管理员端）
export interface AdoptionItem {
  id: string;
  userId: number;
  userName: string;
  avatar?: string; // 申请人头像（管理端响应字段）
  catId: string;
  catName: string;
  catAvatar: string;
  status: AdminAdoptionStatus;
  createTime: string;
  info: {
    plan: string;        // 喂养计划
    housing: AdoptionHousing;
    experience: AdoptionExperience;
  };
  contact: {
    phone: string;
    wechat: string;
  };
}

// 领养申请查询参数
export interface AdoptionQueryParams {
  status?: AdoptionStatus | AdminAdoptionStatus;
  page: number;
  size: number;
}

export interface AdoptionAuditRequest {
  status: AdoptionAuditStatus
  reason: string
}

// AdoptStatus uses @JsonValue on its numeric code, so the audit JSON body sends codes 1..4.
export interface AdoptionAuditRequestBody extends Omit<AdoptionAuditRequest, 'status'> {
  status: AdoptionAuditStatusCode
}

export const toAdoptionAuditRequestBody = (request: AdoptionAuditRequest): AdoptionAuditRequestBody => ({
  ...request,
  status: AdoptionAuditStatusCodeMap[request.status]
})

//sos求助参数
export interface SOSParams {
  catId?: string;
  campus: number;
  location: string | number;
  symptoms: number[];
  description: string;
  media: string[];
}

export interface SOSRequestBody extends Omit<SOSParams, 'media'> {
  medium: string[];
}

export type SOSStatus = 'PENDING' | 'PROCESSING' | 'RESOLVED' | 'CANCELLED'
export type SOSResolutionStatus = Extract<SOSStatus, 'PROCESSING' | 'RESOLVED'>
export type SOSStatusCode = 0 | 1 | 2 | 3

export const SOSStatusMap: Record<SOSStatus, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  RESOLVED: '已解决',
  CANCELLED: '已取消'
}

export interface SOSItem {
  id: string; // SOS UUID
  catId: string | null;
  catName?: string;
  campus: number;
  location: string | number;
  symptoms: string[];
  description: string;
  imageURLs: string[]; // 从 API 返回的字段名
  create_time?: string;
  status: SOSStatus;
  adminReply?: string | null;
  reporterId?: number;
  reporterName?: string;
}

// 管理端和用户端 SOS 列表的真实响应使用 symptomTags；在 API 边界归一为 symptoms。
export interface SOSResponseItem extends Omit<SOSItem, 'symptoms' | 'status'> {
  symptoms?: string[];
  symptomTags?: string[];
  status: SOSStatus | SOSStatusCode | `${SOSStatusCode}`;
}

export interface SOSQueryParams {
  status?: SOSStatus;
  campus?: 'ZHONG_XIN' | 'BAO_TU_QUAN' | 'HONG_JIA_LOU' | 'QIAN_FO_SHAN' | 'XING_LONG_SHAN' | 'RUAN_JIAN_YUAN' | 'QING_DAO' | 'WEI_HAI';
  page: number;
  size: number;
}

export type MySOSQueryParams = Pick<SOSQueryParams, 'status' | 'page' | 'size'>

export interface SubmitSOSResult {
  id: string
  status: SOSStatus
}

export interface ResolveSOSRequest {
  status: SOSResolutionStatus
  reply: string
}

export interface ResolveSOSRequestBody {
  status: 1 | 2
  reply: string
}


//排行榜类型枚举
export type LeaderboardType = 'popularity' | 'appearance' | 'gluttony' | 'fight';

// 排行榜单项数据 (继承自猫咪列表项，增加票数字段)
export interface LeaderboardItem {
  id?: string;
  catId: string;
  name: string;
  avatar: string;
  campus?: number | string;
  value: number;  // 票数/分数
  rank: number;
  tags?: number[];
}

export interface LeaderboardResponse {
  items: LeaderboardItem[];
}
// 发布动态参数（POST /posts，图片字段只提交 COS key）
export interface CreatePostParams {
  content?: string;
  media?: string[];
  catId: string;
  location?: string;
}

// 动态发布者
export interface PostUser {
  id: string;   // JSON里是 string "6"
  name: string; // JSON里是 name
  avatar: string;
}

// 关联猫咪简略信息
export interface PostRelatedCat {
  id: string;
  name: string;
  avatar: string;
}

// 动态单项结构 
export interface PostItem {
  id: string;
  content?: string;     // 动态内容（可选）
  media?: string[];     // 图片数组（可选）
  user: PostUser;     // 发布者对象
  relatedCats: PostRelatedCat; // 关联猫咪对象
  likeCount: number;    // 点赞数
  isLiked: boolean;     // 当前用户是否点赞
  createTime: string;   // 时间
}

export interface PostQueryParams {
  page: number;
  pageSize: number;
  catId?: string; // 关联猫咪ID
}

// 编辑猫咪参数
export interface CatImageActions {
  keep: string[];
  delete: string[];
  add: string[];
}

export const CatStatusMap: Record<Status, string> = {
  0: '在校',
  1: '已领养',
  2: '喵星',
  3: '住院',
  4: '领养处理中'
}

export const GenderMap: Record<Gender, string> = {
  0: '未知',
  1: '公猫',
  2: '母猫'
}

export const HealthStatusMap: Record<HealthStatus, string> = {
  0: '健康',
  1: '生病',
  2: '恢复中'
}

export interface CreateCatParams {
  name: string;
  aliases?: string[];
  color: number;
  avatar: string;
  images?: string[];
  gender?: number;
  campus?: number;
  hauntLocation?: number;
  role?: number;
  birthYear?: number;
  admissionDate?: string;
  status?: number;
  healthStatus?: number;
  attributes: Record<string, number>;
  isNeutered: boolean;
  neuteredDate?: string;
  neuteredType?: number;
  description?: string;
  tags?: number[];
}

export interface UpdateCatParams extends Omit<Partial<CreateCatParams>, 'images'> {
  imageActions?: CatImageActions;
  aliases?: string[];
  neuteredDate?: string;
  neuteredType?: number;
  tags?: number[];
}

export interface CatImageKeyItem {
  key: string;
  url: string;
}

export interface CatImageKeysResult {
  avatar?: CatImageKeyItem;
  images: CatImageKeyItem[];
}

export interface SubmitNewCatParams {
  tempName?: string;
  color: number;
  images: string[];
  campus: number;
  location: string;
  tags?: number[];
}

export interface NewCatResponse {
  id: string
  // OpenAPI 的 data schema 尚未声明状态枚举；PENDING 目前仅为示例值。
  status: string
  experience: number
  currency: number
}

export interface ApproveNewCatRequest {
  officialName: string
}

export interface RejectNewCatRequest {
  reason?: string
}

export interface ApproveNewCatResult {
  catId: string
  newCatId: string
}

// 管理端用户列表项
export interface AdminUserItem {
  id: number;
  email?: string;
  name: string;
  avatar?: string;
  status?: string | number | null;
  role?: string | number | null;
  roleName?: string | number | null;
  permission?: string | number | null; // 某些接口返回权限而非角色
  banReason?: string | null;
  studentId?: string; // 兼容部分接口返回 studentId
  sid?: string;
  campus?: number | string;
  level?: number;
  levelTitle?: string;
  experience?: number;
  currency?: number;
  phone?: string;
  wechat?: string;
  createTime?: string;
  lastLoginTime?: string;
}

export interface AdminUserListResponse {
  size: number;
  current: number;
  total: number;
  pages: number;
  items: AdminUserItem[];
}

// 管理端用户详情
export interface AdminUserDetail extends AdminUserItem {
  nickname?: string;
  exp?: number;
  nextExp?: number;
  stats?: {
    feedCount: number;
    foundNewCatCount?: number;
    found?: number;
    receivedLikes: number;
    momentCount: number;
  };
}

// Raw response returned by GET /admin/users/{id}.
export interface AdminUserDetailResponse {
  uid: number;
  nickname: string;
  sid?: string;
  avatar?: string | null;
  level?: number;
  title?: string;
  exp?: number;
  nextExp?: number;
  campus?: number | string;
  currency?: number;
  permission?: string | number | null;
  banReason?: string | null;
  stats?: {
    feedCount?: number;
    found?: number;
    receivedLikes?: number;
    postCount?: number;
  };
}

// 用户列表查询参数
export interface UserQueryParams {
  page: number;
  size: number;
  campus?: number;
  search?: string; // 支持邮箱或UID查找
}

// 新喵线索列表项（管理员端）
export interface NewCatItem {
  id: string;
  tempName: string | null;  // 临时名称
  officialName?: string;    // 正式名称（审核通过后）
  color: string | number;   // 毛色名称或类型 ID
  images: string[];         // 图片数组
  campus: string | number;  // 校区名称或枚举值
  location: string | number;// 详细位置文本或位置 ID
  submitterId: string;      // 提交者ID
  submitterName: string;    // 提交者名称
  status: string;           // PENDING, APPROVED, REJECTED
  createTime: string;       // 创建时间
  tags?: Array<number | string>; // 真实响应可能返回标签 ID，也兼容已返回标签名称的旧数据
}

// 新喵线索查询参数
export interface NewCatQueryParams {
  status?: string;
  page?: number;
  pageSize?: number;
}

// 用户端我的领养申请列表项
export interface MyAdoptionItem {
  id: string;
  catId: string;
  catName: string;
  catAvatar: string;
  status: AdoptionStatus;
  createTime: string;
  reason: string | null; // 拒绝原因
}

// 用户端我的领养申请查询参数
export interface MyAdoptionQueryParams {
  status?: AdoptionStatus;
  page?: number;
  size?: number;
}

// 用户端我的领养申请分页结果
export interface MyAdoptionPageResult {
  items: MyAdoptionItem[];
  total: number;
  pages: number;
  size: number;
  current: number;
}

// 每日签到结果
export interface CheckinResult {
  totalDays: number;        // 总签到天数
  rewards: {
    currency: number;       // 获得小鱼干
    experience: number;     // 获得经验
  };
  todayChecked: boolean;    // 今天是否已签到（操作前）
  continuousDays: number;   // 连续签到天数
}

// 签到历史记录
export interface CheckinHistory {
  checkInDates: string[];   // 签到日期数组
  month: string;            // 查询月份
  totalDays: number;        // 本月签到天数
}

export type AnnouncementType = 'HEALTH' | 'FEEDING' | 'BEHAVIOR' | 'NEWS';
export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  summary?: string | null;
  coverImage?: string | null;
  type: AnnouncementType | number | string;
  status: AnnouncementStatus | number | string;
  authorId?: string;
  authorName?: string;
  viewCount?: number;
  createTime: string;
  updateTime?: string;
}

export interface AnnouncementQueryParams {
  page: number;
  pageSize: number;
  type?: AnnouncementType;
  status?: AnnouncementStatus;
}

export type PublicAnnouncementQueryParams = Pick<AnnouncementQueryParams, 'page' | 'pageSize' | 'type'>
export type AdminAnnouncementQueryParams = Pick<AnnouncementQueryParams, 'page' | 'pageSize' | 'status'>

export interface AnnouncementInput {
  title: string;
  content: string;
  summary?: string;
  coverImage?: string;
  type: AnnouncementType;
  status: AnnouncementStatus;
}

export const AnnouncementTypeMap: Record<string, string> = {
  '0': '健康知识',
  '1': '喂养指南',
  '2': '行为解读',
  '3': '校园资讯',
  HEALTH: '健康知识',
  FEEDING: '喂养指南',
  BEHAVIOR: '行为解读',
  NEWS: '校园资讯'
}

export const AnnouncementLegacyTypeMap: Record<string, AnnouncementType> = {
  '0': 'HEALTH',
  '1': 'FEEDING',
  '2': 'BEHAVIOR',
  '3': 'NEWS'
}

export interface NotificationItem {
  id: string;
  type: string | number;
  title: string;
  content?: string;
  isRead: boolean;
  payload?: NotificationPayload;
  relatedId?: string;
  relatedType?: string;
  targetUrl?: string;
  createTime: string;
}

export interface NotificationPayload {
  announcementId?: string;
  sosId?: string;
  adoptionId?: string;
  catId?: string;
  clueId?: string;
  status?: string | number;
  targetUrl?: string;
}

export interface NotificationQueryParams {
  type?: string;
  isRead?: boolean;
  page?: number;
  pageSize?: number;
}

export interface FlexiblePageResult<T> {
  items?: T[];
  records?: T[];
  list?: T[];
  content?: T[];
  total?: number;
  currentPage?: number;
  totalPage?: number;
  hasNext?: boolean;
  current?: number;
  pages?: number;
  size?: number;
}

export interface AnnouncementTypeOption {
  id: number;
  label: string;
}
