/**
 * 开发态 Mock API —— 依据《接口文件.openapi.yaml》的端点契约与前端消费端
 * （src/pc/types、src/mobile/api/adapters）的数据形状构造的内存后端。
 *
 * 用法：在 apps/web/.env.local 里设置 VITE_MOCK=1 后 `pnpm dev`。
 * - 示例图片使用内联 SVG data URL，社群二维码使用本地 /qq.jpg，完全离线可用；
 * - /users/login 与 /auth/login（模拟统一认证回调 302）均可用，邮箱含
 *   "admin" 即签发管理员会话；
 * - 数据在内存中可变（封禁、点赞、投喂、公告 CRUD 等都会真实生效），
 *   重启 dev server 即复位。
 */
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

const b64url = (obj: unknown) =>
  Buffer.from(JSON.stringify(obj)).toString('base64url')

// 一次性登录码（新契约 /auth/exchange）：签发后仅可消费一次。
const loginCodes = new Set<string>()
const loginCode = (role: 'user' | 'admin') => {
  const code = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}:${role}`
  loginCodes.add(code)
  return code
}

const svgAvatar = (label: string, bg: string) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" rx="24" fill="${bg}"/><text x="60" y="78" font-size="56" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="bold">${label}</text></svg>`,
  )

const jwt = (role: 'user' | 'admin') => {
  const payload = {
    sub: role === 'admin' ? 1 : 2,
    role,
    sessionType: role,
    authorities: [role],
    email: role === 'admin' ? 'admin@sdumeow.cn' : 'user@sdumeow.cn',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  }
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url(payload)}.mock-signature`
}

// 真实后端返回本地时间字符串（无时区后缀），mock 保持同一格式以免前端显示成未来时间。
const now = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

interface CatSeed {
  id: string
  name: string
  aliases: string[]
  color: number
  campus: number
  location: number | null
  status: number
  healthStatus: number
  gender: number
  role: number
  isNeutered: boolean
  neuteredDate: string | null
  birthYear: number
  admissionDate: string | null
  lastSeenTime: string | null
  tags: number[]
  attributes: { friendliness: number; gluttony: number; fight: number; appearance: number }
  description: string
  popularity: number
  hue: string
}

const CATS: CatSeed[] = [
  { id: 'cat-1', name: '橘座', aliases: ['大橘', '橘部长'], color: 1, campus: 5, location: 1, status: 0, healthStatus: 0, gender: 1, role: 1, isNeutered: true, neuteredDate: '2024-03-12', birthYear: 2021, admissionDate: '2021-09-01', lastSeenTime: '2026-10-01 17:40:00', tags: [1, 3], attributes: { friendliness: 9.2, gluttony: 9.8, fight: 6.5, appearance: 8.9 }, description: '体重管理者，见人先看手（有没有小鱼干）。', popularity: 428, hue: '#f59e0b' },
  { id: 'cat-2', name: '雪球', aliases: ['大白'], color: 2, campus: 5, location: 2, status: 0, healthStatus: 0, gender: 2, role: 2, isNeutered: true, neuteredDate: '2024-05-20', birthYear: 2022, admissionDate: '2022-03-15', lastSeenTime: '2026-10-02 09:15:00', tags: [2], attributes: { friendliness: 8.6, gluttony: 7.2, fight: 4.1, appearance: 9.6 }, description: '通体雪白，镜头感极强，是图鉴的封面常客。', popularity: 391, hue: '#94a3b8' },
  { id: 'cat-3', name: '警长', aliases: [], color: 3, campus: 0, location: 3, status: 4, healthStatus: 2, gender: 1, role: 0, isNeutered: false, neuteredDate: null, birthYear: 2023, admissionDate: '2023-06-01', lastSeenTime: '2026-09-30 21:05:00', tags: [4], attributes: { friendliness: 6.8, gluttony: 8.1, fight: 9.4, appearance: 7.7 }, description: '领养流程进行中，请勿投喂过多。', popularity: 245, hue: '#78716c' },
  { id: 'cat-4', name: '煤球', aliases: ['小黑'], color: 4, campus: 5, location: 1, status: 0, healthStatus: 1, gender: 0, role: 0, isNeutered: false, neuteredDate: null, birthYear: 2024, admissionDate: '2024-10-01', lastSeenTime: '2026-10-02 12:30:00', tags: [5], attributes: { friendliness: 7.4, gluttony: 8.8, fight: 7.9, appearance: 6.9 }, description: '近期在休养，投喂请注意温和互动。', popularity: 187, hue: '#1e293b' },
  { id: 'cat-5', name: '年年', aliases: ['年糕'], color: 5, campus: 1, location: 4, status: 1, healthStatus: 0, gender: 2, role: 3, isNeutered: true, neuteredDate: '2023-11-11', birthYear: 2020, admissionDate: '2020-11-11', lastSeenTime: '2026-08-12 10:00:00', tags: [1, 6], attributes: { friendliness: 9.9, gluttony: 6.6, fight: 5.5, appearance: 9.1 }, description: '已被爱心校友领养，定期回访中。', popularity: 356, hue: '#ec4899' },
  { id: 'cat-6', name: '豆豆', aliases: [], color: 6, campus: 5, location: 2, status: 3, healthStatus: 1, gender: 1, role: 0, isNeutered: false, neuteredDate: null, birthYear: 2024, admissionDate: '2025-04-01', lastSeenTime: '2026-10-01 08:20:00', tags: [], attributes: { friendliness: 8.1, gluttony: 7.7, fight: 3.3, appearance: 8.3 }, description: '住院观察中，祝早日康复。', popularity: 132, hue: '#22c55e' },
]

const catListItem = (c: CatSeed) => ({
  id: c.id, name: c.name, avatar: svgAvatar(c.name.slice(0, 1), c.hue), color: c.color,
  // 移动端列表适配器优先消费字符串名字字段（colorName/locationName/tagNames），
  // 数字 ID 字段供桌面端与筛选使用——两者同时提供，对齐真实后端的冗余返回。
  colorName: COLORS.find((x) => x.id === c.color)?.label,
  campus: c.campus, location: c.location,
  locationName: LOCATIONS.find((x) => x.id === c.location)?.label,
  status: c.status, tags: c.tags,
  tagNames: c.tags.map((t) => TAGS.find((x) => x.id === t)?.name).filter(Boolean),
  isNeutered: c.isNeutered,
  popularity: c.popularity, lastSeenTime: c.lastSeenTime, role: c.role,
  roleName: ROLES.find((x) => x.id === c.role)?.label,
})

const catDetail = (c: CatSeed) => ({
  ...catListItem(c),
  aliases: c.aliases,
  images: [svgAvatar(c.name.slice(0, 1), c.hue), svgAvatar(c.name.slice(0, 2) || '喵', c.hue)],
  basicInfo: {
    color: c.color, gender: c.gender, campus: c.campus, hauntLocation: c.location,
    role: c.role, birthYear: c.birthYear, admissionDate: c.admissionDate, status: c.status,
    healthStatus: c.healthStatus, lastSeenTime: c.lastSeenTime,
    neutered: { isNeutered: c.isNeutered, date: c.neuteredDate, type: c.isNeutered ? 0 : null },
  },
  attributes: c.attributes,
  description: c.description,
  relationships: [
    { catId: 'cat-2', name: '雪球', relation: '邻居', avatar: svgAvatar('雪', '#94a3b8') },
  ],
})

const userInfo = (role: 'user' | 'admin') => ({
  uid: role === 'admin' ? 1 : 2,
  email: role === 'admin' ? 'admin@sdumeow.cn' : 'user@sdumeow.cn',
  nickname: role === 'admin' ? '喵喵管理员' : '山大学生',
  sid: role === 'admin' ? '2024000001' : '2024000002',
  avatar: svgAvatar(role === 'admin' ? '喵' : '学', role === 'admin' ? '#f59e0b' : '#38bdf8'),
  level: role === 'admin' ? 9 : 4,
  title: role === 'admin' ? '资深铲屎官' : '见习铲屎官',
  exp: role === 'admin' ? 8800 : 1200,
  nextExp: role === 'admin' ? 10000 : 2000,
  campus: 5,
  currency: 520,
  stats: {
    feedCount: 128, foundNewCatCount: 3, receivedLikes: 66, momentCount: 21,
    totalDays: 88, continuousDays: 12,
  },
  settings: { notifyAnnouncement: true, notifyAdoption: true },
  role, roleName: role, permission: role, roles: [role], permissions: role === 'admin' ? ['*'] : [],
})

const POSTS = Array.from({ length: 6 }, (_, i) => {
  const cat = CATS[i % CATS.length]
  return {
    id: `post-${i + 1}`,
    content: ['今天在食堂门口偶遇了它，圆滚滚的太可爱了。', '午后阳光下的午睡时光。', '投喂成功，它冲我喵了一声！', '下雨天它躲在车棚里，提醒大家带伞。', '新建档的 小家伙 已经会主动贴贴了。', '拍到了它追蝴蝶的名场面。'][i],
    media: [],
    user: { id: String((i % 2) + 2), name: i % 2 ? '山大学生' : '喵喵管理员', avatar: svgAvatar(i % 2 ? '学' : '喵', i % 2 ? '#38bdf8' : '#f59e0b') },
    relatedCats: { id: cat.id, name: cat.name, avatar: svgAvatar(cat.name.slice(0, 1), cat.hue) },
    likeCount: 12 + i * 7,
    isLiked: i % 3 === 0,
    createTime: `2026-10-0${(i % 2) + 1} 1${i}:2${i}:00`,
  }
})

const ANNOUNCEMENTS = [
  { id: 'ann-1', title: '秋季投喂指南更新', content: '入秋后请适当提高投喂频率，注意避开变质食物。', summary: '入秋投喂注意事项', coverImage: '', type: 'FEEDING', status: 'PUBLISHED', authorName: '喵喵管理员', viewCount: 321, createTime: '2026-09-28 10:00:00', updateTime: '2026-09-28 10:00:00' },
  { id: 'ann-2', title: '警长领养进展公示', content: '警长的领养申请已进入家访阶段，感谢关注。', summary: '领养进展', coverImage: '', type: 'NEWS', status: 'PUBLISHED', authorName: '喵喵管理员', viewCount: 208, createTime: '2026-09-25 14:00:00', updateTime: '2026-09-25 14:00:00' },
  { id: 'ann-3', title: '猫咪常见病识别手册', content: '教你识别猫鼻支、口炎等常见病的早期症状。', summary: '健康知识', coverImage: '', type: 'HEALTH', status: 'PUBLISHED', authorName: '喵喵管理员', viewCount: 512, createTime: '2026-09-20 09:00:00', updateTime: '2026-09-20 09:00:00' },
  { id: 'ann-4', title: '关于豆豆的住院说明', content: '豆豆正在校医院宠物协作点住院观察。', summary: '住院说明', coverImage: '', type: 'BEHAVIOR', status: 'DRAFT', authorName: '喵喵管理员', viewCount: 0, createTime: '2026-10-01 16:00:00', updateTime: '2026-10-01 16:00:00' },
]

const NOTIFICATIONS = [
  { id: 'n1', type: 'ANNOUNCEMENT', title: '新公告：秋季投喂指南更新', content: '点击查看详情', isRead: false, payload: { announcementId: 'ann-1' }, relatedId: 'ann-1', createTime: '2026-09-28 10:00:00' },
  { id: 'n2', type: 'ADOPTION', title: '你的领养申请已通过初审', content: '请保持电话畅通', isRead: false, payload: { adoptionId: 'ad-1' }, relatedId: 'ad-1', createTime: '2026-09-26 15:00:00' },
  { id: 'n3', type: 'SYSTEM', title: '欢迎来到山大猫猫图鉴', content: '投喂与打卡都能提升猫咪亲密度', isRead: true, payload: {}, createTime: '2026-09-01 08:00:00' },
]

const ADMIN_USERS = [
  { id: 1, email: 'admin@sdumeow.cn', name: '喵喵管理员', avatar: svgAvatar('喵', '#f59e0b'), status: 0, permission: 1, sid: '2024000001', campus: 5, level: 9, levelTitle: '资深铲屎官', currency: 520, createTime: '2024-09-01 10:00:00' },
  { id: 2, email: 'user@sdumeow.cn', name: '山大学生', avatar: svgAvatar('学', '#38bdf8'), status: 0, permission: 0, sid: '2024000002', campus: 5, level: 4, levelTitle: '见习铲屎官', currency: 120, createTime: '2025-03-11 10:00:00' },
  { id: 3, email: 'wang@sdumeow.cn', name: '王同学', avatar: svgAvatar('王', '#a78bfa'), status: 0, permission: 0, sid: '2023001001', campus: 0, level: 6, levelTitle: '铲屎官', currency: 88, createTime: '2025-05-02 10:00:00' },
  { id: 4, email: 'liu@sdumeow.cn', name: '刘同学', avatar: svgAvatar('刘', '#34d399'), status: 1, permission: 0, sid: '2023001002', campus: 1, level: 2, levelTitle: '萌新', currency: 6, banReason: '恶意刷帖', createTime: '2025-06-14 10:00:00' },
  { id: 5, email: 'zhao@sdumeow.cn', name: '赵同学', avatar: svgAvatar('赵', '#fbbf24'), status: 0, permission: 0, sid: '2024001003', campus: 5, level: 3, levelTitle: '铲屎学徒', currency: 42, createTime: '2025-09-01 10:00:00' },
]

const ADOPTIONS = [
  { id: 'ad-1', userId: 3, userName: '王同学', avatar: svgAvatar('王', '#a78bfa'), catId: 'cat-3', catName: '警长', catAvatar: svgAvatar('警', '#78716c'), status: 'PENDING', createTime: '2026-09-26 11:00:00', info: { plan: '室内科学喂养，定期疫苗', housing: 'OWN_HOUSE', experience: 'EXPERIENCED' }, contact: { phone: '13800000001', wechat: 'wang_student' } },
  { id: 'ad-2', userId: 5, userName: '赵同学', avatar: svgAvatar('赵', '#fbbf24'), catId: 'cat-4', catName: '煤球', catAvatar: svgAvatar('煤', '#1e293b'), status: 'APPROVED', createTime: '2026-09-18 09:00:00', info: { plan: '合租宿舍已获房东同意', housing: 'RENT_SHARE', experience: 'NEWBIE' }, contact: { phone: '13800000002', wechat: 'zhao_student' } },
  { id: 'ad-3', userId: 2, userName: '山大学生', avatar: svgAvatar('学', '#38bdf8'), catId: 'cat-1', catName: '橘座', catAvatar: svgAvatar('橘', '#f59e0b'), status: 'REJECTED', createTime: '2026-09-10 09:00:00', info: { plan: '抱歉家里空间不足', housing: 'DORM', experience: 'NEWBIE' }, contact: { phone: '13800000003', wechat: 'xuesheng' } },
]

const SOS = [
  { id: 'sos-1', catId: 'cat-6', catName: '豆豆', campus: 5, location: '2', symptoms: ['精神萎靡'], description: '发现它一天没吃东西，蹲在角落。', imageURLs: [], status: 'PENDING', reporterId: 2, reporterName: '山大学生', create_time: '2026-10-01 20:00:00' },
  { id: 'sos-2', catId: null, campus: 0, location: '3', symptoms: ['外伤'], description: '未知橘猫后腿疑似受伤。', imageURLs: [], status: 'PROCESSING', reporterId: 3, reporterName: '王同学', create_time: '2026-09-30 12:00:00' },
  { id: 'sos-3', catId: 'cat-4', catName: '煤球', campus: 5, location: '1', symptoms: ['呕吐'], description: '吃了 unknown 的东西后呕吐。', imageURLs: [], status: 'RESOLVED', adminReply: '已送往协作医院', reporterId: 2, reporterName: '山大学生', create_time: '2026-09-22 08:00:00' },
]

const NEW_CATS = [
  { id: 'nc-1', tempName: '小橘猫', officialName: null, color: '橘白', images: [svgAvatar('橘', '#f59e0b')], campus: '软件园校区', location: '食堂北侧花坛', submitterId: '2', submitterName: '山大学生', status: 'PENDING', createTime: '2026-10-01 18:00:00', tags: [1] },
  { id: 'nc-2', tempName: '三花妹妹', officialName: null, color: '三花', images: [svgAvatar('三', '#ec4899')], campus: '中心校区', location: '图书馆南门', submitterId: '3', submitterName: '王同学', status: 'PENDING', createTime: '2026-09-30 11:00:00', tags: [2] },
  { id: 'nc-3', tempName: '黑豹', officialName: '墨墨', color: '纯黑', images: [svgAvatar('墨', '#1e293b')], campus: '软件园校区', location: '实验楼东侧', submitterId: '2', submitterName: '山大学生', status: 'APPROVED', createTime: '2026-09-20 10:00:00', tags: [] },
]

const state = {
  currency: 520,
  likedPosts: new Set(POSTS.filter((p) => p.isLiked).map((p) => p.id)),
  bannedUsers: new Set(ADMIN_USERS.filter((u) => u.status === 1).map((u) => u.id)),
  checkedinToday: false,
}

const page = (items: unknown[], query: URLSearchParams, defaultSize = 20) => {
  const page = Number(query.get('page') || 1)
  const pageSize = Number(query.get('pageSize') || query.get('size') || defaultSize)
  const start = (page - 1) * pageSize
  const slice = items.slice(start, start + pageSize)
  return {
    items: slice, total: items.length, currentPage: page, totalPage: Math.max(1, Math.ceil(items.length / pageSize)),
    pages: Math.max(1, Math.ceil(items.length / pageSize)), size: pageSize, current: page,
  }
}

const ok = (data: unknown, msg = '成功') => ({ code: 200, msg, data })
const fail = (msg: string, code = 400) => ({ code, msg, data: null })

const COLORS = [
  { id: 1, label: '橘白' }, { id: 2, label: '纯白' }, { id: 3, label: '狸花' },
  { id: 4, label: '纯黑' }, { id: 5, label: '三花' }, { id: 6, label: '奶牛' },
]
const LOCATIONS = [
  { id: 1, label: '食堂北侧花坛' }, { id: 2, label: '图书馆南门' }, { id: 3, label: '教学楼中庭' },
  { id: 4, label: '宿舍区车棚' }, { id: 5, label: '实验楼东侧' },
]
const ROLES = [
  { id: 0, label: '流浪游侠' }, { id: 1, label: '食堂部长' }, { id: 2, label: '图书馆馆长' },
  { id: 3, label: '荣誉校猫' }, { id: 4, label: '退休教授猫' },
]
const TAGS = [
  { id: 1, name: '亲人' }, { id: 2, name: '高冷' }, { id: 3, name: '贪吃' },
  { id: 4, name: '警觉' }, { id: 5, name: '粘人' }, { id: 6, name: '话痨' },
]
const SYMPTOMS = [
  { id: 1, tag: '外伤', description: '可见伤口或出血' },
  { id: 2, tag: '呕吐', description: '呕吐或干呕' },
  { id: 3, tag: '精神萎靡', description: '长时间趴卧不动' },
  { id: 4, tag: '食欲不振', description: '拒食超过一天' },
  { id: 5, tag: '跛行', description: '走路异常' },
  { id: 6, tag: '眼部感染', description: '眼睛红肿流泪' },
]

const ME = (role: 'user' | 'admin') => {
  const info = userInfo(role) as Record<string, unknown>
  return { ...info, currency: state.currency }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ctx = { url: URL; query: URLSearchParams; params: string[]; body: any; req: IncomingMessage; role: 'user' | 'admin' }

interface RouteDef {
  method: string
  pattern: RegExp
  handle: (ctx: Ctx) => unknown
}

const routes: RouteDef[] = [
  // ---- 社群 ----
  { method: 'GET', pattern: /^\/community\/group-qrcode$/, handle: () => ({ qrcodeUrl: '/qq.jpg' }) },

  // ---- 认证 ----
  { method: 'POST', pattern: /^\/users\/login$/, handle: ({ body }) => {
      const role = String(body?.email || '').includes('admin') ? 'admin' : 'user'
      return { accessToken: jwt(role), refreshToken: jwt(role), userInfo: userInfo(role) }
    } },
  { method: 'POST', pattern: /^\/admin\/login$/, handle: ({ body }) => {
      if (!body?.email || !body?.password) return fail('请输入管理员邮箱和密码')
      return { accessToken: jwt('admin'), refreshToken: jwt('admin'), email: String(body.email) }
    } },
  { method: 'POST', pattern: /^\/users\/refresh$/, handle: ({ req }) => ({ accessToken: jwt(isAdminToken(req) ? 'admin' : 'user'), refreshToken: jwt(isAdminToken(req) ? 'admin' : 'user') }) },
  { method: 'POST', pattern: /^\/users\/register$/, handle: () => ok({}, '注册成功，请登录') },
  { method: 'POST', pattern: /^\/users\/send-verification-code$/, handle: () => ok({ code: '666666' }, '验证码已发送') },
  { method: 'POST', pattern: /^\/users\/bind-email$/, handle: () => ok({}, '绑定成功') },
  { method: 'POST', pattern: /^\/users\/change-password$/, handle: () => ok({}, '密码修改成功') },
  // 统一认证（CAS）：模拟回调 302，携带会话令牌回到前端。
  // 回调地址必须保留真实端口，因此基于请求的 Host 头构造。
  // 新契约：CAS 只回传一次性 login_code，前端 POST /auth/exchange 换取令牌。
  { method: 'GET', pattern: /^\/auth\/login$/, handle: ({ req }) => ({ __redirect: `http://${req.headers.host || 'localhost:5173'}/?login_code=${loginCode('user')}` }) },
  { method: 'GET', pattern: /^\/auth\/admin-login$/, handle: ({ req }) => ({ __redirect: `http://${req.headers.host || 'localhost:5173'}/?login_code=${loginCode('admin')}` }) },
  { method: 'POST', pattern: /^\/auth\/exchange$/, handle: ({ body }) => {
      const code = String(body?.loginCode || '')
      const role = code.endsWith(':admin') ? 'admin' : 'user'
      if (!loginCodes.has(code)) return fail('登录码无效或已过期', 401)
      loginCodes.delete(code)
      return { accessToken: jwt(role), refreshToken: jwt(role), email: role === 'admin' ? 'admin@sdumeow.cn' : 'user@sdumeow.cn' }
    } },

  // ---- 用户 ----
  { method: 'GET', pattern: /^\/users\/me$/, handle: ({ role }) => ME(role) },
  { method: 'PUT', pattern: /^\/users\/me$/, handle: ({ body, role }) => ok({ ...ME(role), ...body }, '资料已更新') },
  { method: 'PUT', pattern: /^\/users\/me\/avatar$/, handle: ({ role }) => ok({ ...ME(role) }, '头像已更新') },
  { method: 'POST', pattern: /^\/users\/me\/checkin$/, handle: () => {
      state.checkedinToday = true
      return { totalDays: 89, rewards: { currency: 5, experience: 10 }, todayChecked: state.checkedinToday, continuousDays: 13 }
    } },
  { method: 'GET', pattern: /^\/users\/me\/checkin\/history$/, handle: ({ query }) => {
      const month = query.get('month') || new Date().toISOString().slice(0, 7)
      return { checkInDates: ['01', '02', '03', '05', '08'].map((d) => `${month}-${d}`), month, totalDays: 5 }
    } },
  { method: 'GET', pattern: /^\/users\/me\/followed-cats$/, handle: () => page(CATS.slice(0, 2).map(catListItem), new URLSearchParams('page=1')) },
  { method: 'GET', pattern: /^\/users\/me\/settings$/, handle: () => ({ notifyAnnouncement: true, notifyAdoption: true }) },
  { method: 'PUT', pattern: /^\/users\/me\/settings$/, handle: ({ body }) => body },

  // ---- 猫咪 ----
  { method: 'GET', pattern: /^\/cats$/, handle: ({ query }) => {
      let items = CATS.map(catListItem)
      const status = query.get('status')
      const color = query.get('color')
      const campus = query.get('campus')
      const search = query.get('search')
      if (status !== null && status !== '') items = items.filter((c) => String(c.status) === status)
      if (color) items = items.filter((c) => String(c.color) === color)
      if (campus) items = items.filter((c) => String(c.campus) === campus)
      if (search) items = items.filter((c) => c.name.includes(search))
      return page(items, query, 10)
    } },
  { method: 'GET', pattern: /^\/cats\/([^/]+)$/, handle: ({ params }) => {
      const cat = CATS.find((c) => c.id === params[0])
      return cat ? catDetail(cat) : fail('猫咪不存在', 404)
    } },
  { method: 'POST', pattern: /^\/cats\/([^/]+)\/feed$/, handle: ({ role }) => {
      if (state.currency < 1) return fail('小鱼干不足')
      state.currency -= 1
      return { userCurrency: state.currency, me: ME(role) }
    } },
  { method: 'POST', pattern: /^\/cats\/([^/]+)\/follow$/, handle: () => ok({}, '已关注') },
  { method: 'DELETE', pattern: /^\/cats\/([^/]+)\/follow$/, handle: () => ok({}, '已取消关注') },

  // ---- 类型选项 ----
  { method: 'GET', pattern: /^\/type\/colors$/, handle: () => COLORS },
  { method: 'GET', pattern: /^\/type\/locations$/, handle: () => LOCATIONS },
  { method: 'GET', pattern: /^\/type\/roles$/, handle: () => ROLES },
  { method: 'GET', pattern: /^\/type\/tags$/, handle: () => TAGS },
  { method: 'GET', pattern: /^\/type\/symptoms$/, handle: () => SYMPTOMS },
  { method: 'GET', pattern: /^\/type\/announcement-types$/, handle: () => [
      { id: 0, label: '健康知识' }, { id: 1, label: '喂养指南' }, { id: 2, label: '行为解读' }, { id: 3, label: '校园资讯' },
    ] },

  // ---- 动态 ----
  { method: 'GET', pattern: /^\/posts$/, handle: ({ query }) => {
      const catId = query.get('catId')
      let items = POSTS
      if (catId) items = items.filter((p) => p.relatedCats?.id === catId)
      return page(items, query, 20)
    } },
  { method: 'POST', pattern: /^\/posts$/, handle: ({ body, role }) => {
      const cat = CATS.find((c) => c.id === body?.catId) || CATS[0]
      const post = {
        id: `post-${Date.now()}`, content: body?.content || '', media: [],
        user: { id: role === 'admin' ? '1' : '2', name: role === 'admin' ? '喵喵管理员' : '山大学生', avatar: svgAvatar(role === 'admin' ? '喵' : '学', '#f59e0b') },
        relatedCats: { id: cat.id, name: cat.name, avatar: svgAvatar(cat.name.slice(0, 1), cat.hue) },
        likeCount: 0, isLiked: false, createTime: now(),
      }
      POSTS.unshift(post)
      return post
    } },
  { method: 'POST', pattern: /^\/posts\/([^/]+)\/like$/, handle: ({ params }) => {
      const post = POSTS.find((p) => p.id === params[0])
      if (!post) return fail('动态不存在', 404)
      state.likedPosts.add(post.id)
      post.isLiked = true
      post.likeCount += 1
      return { isLiked: true, likeCount: post.likeCount }
    } },
  { method: 'DELETE', pattern: /^\/posts\/([^/]+)\/like$/, handle: ({ params }) => {
      const post = POSTS.find((p) => p.id === params[0])
      if (!post) return fail('动态不存在', 404)
      state.likedPosts.delete(post.id)
      post.isLiked = false
      post.likeCount = Math.max(0, post.likeCount - 1)
      return { isLiked: false, likeCount: post.likeCount }
    } },
  { method: 'DELETE', pattern: /^\/posts\/([^/]+)$/, handle: ({ params }) => {
      const idx = POSTS.findIndex((p) => p.id === params[0])
      if (idx >= 0) POSTS.splice(idx, 1)
      return null
    } },

  // ---- 公告与通知 ----
  { method: 'GET', pattern: /^\/announcements$/, handle: ({ query }) => {
      let items = ANNOUNCEMENTS.filter((a) => a.status === 'PUBLISHED')
      const type = query.get('type')
      if (type) items = items.filter((a) => String(a.type) === type)
      return page(items, query, 20)
    } },
  { method: 'GET', pattern: /^\/announcements\/([^/]+)$/, handle: ({ params }) => {
      const a = ANNOUNCEMENTS.find((x) => x.id === params[0])
      return a || fail('公告不存在', 404)
    } },
  { method: 'GET', pattern: /^\/notifications$/, handle: ({ query }) => {
      let items = NOTIFICATIONS
      if (query.get('isRead') === 'false') items = items.filter((n) => !n.isRead)
      const result = page(items, query, 20)
      if (query.get('isRead') === 'false') result.total = items.length
      return result
    } },
  { method: 'POST', pattern: /^\/notifications\/([^/]+)\/read$/, handle: ({ params }) => {
      const n = NOTIFICATIONS.find((x) => x.id === params[0])
      if (n) n.isRead = true
      return null
    } },
  { method: 'POST', pattern: /^\/notifications\/read-all$/, handle: () => {
      NOTIFICATIONS.forEach((n) => { n.isRead = true })
      return null
    } },

  // ---- 排行榜 / 统计 / 徽章 / 搜索 ----
  { method: 'GET', pattern: /^\/leaderboard\/([^/]+)$/, handle: ({ params }) => {
      const key = params[0] as 'popularity' | 'appearance' | 'gluttony' | 'fight'
      const items = CATS
        .map((c) => ({ catId: c.id, name: c.name, avatar: svgAvatar(c.name.slice(0, 1), c.hue), campus: c.campus, value: (c.attributes as Record<string, number>)[key] ?? c.popularity, rank: 0 }))
        .sort((a, b) => b.value - a.value)
        .map((item, idx) => ({ ...item, rank: idx + 1 }))
      return { items }
    } },
  { method: 'GET', pattern: /^\/stats\/public$/, handle: () => ({
      totalCats: 42, residentCats: 28, adoptedCats: 11, neuteredCats: 19,
    }) },
  { method: 'GET', pattern: /^\/badges$/, handle: () => page([
      { id: 'b1', name: '初次见面', description: '完成第一次投喂', iconUrl: '', earned: true, earnedAt: '2026-09-01', tier: 1, tierName: '铜' },
      { id: 'b2', name: '记录者', description: '发布 10 条动态', iconUrl: '', earned: true, tier: 1, tierName: '铜' },
      { id: 'b3', name: '打榜王', description: '登上人气榜首', iconUrl: '', earned: false, progress: 428, target: 500, progressPercentage: 85 },
      { id: 'b4', name: '守护天使', description: '参与 5 次 SOS 救援', iconUrl: '', earned: false, progress: 2, target: 5, progressPercentage: 40 },
    ], new URLSearchParams('page=1')) },
  { method: 'GET', pattern: /^\/badges\/mine$/, handle: () => [
      { id: 'b1', name: '初次见面', earned: true },
      { id: 'b2', name: '记录者', earned: true },
    ] },
  { method: 'GET', pattern: /^\/badges\/progress$/, handle: () => [
      { id: 'b3', name: '打榜王', progress: 428, target: 500 },
      { id: 'b4', name: '守护天使', progress: 2, target: 5 },
    ] },
  { method: 'GET', pattern: /^\/search$/, handle: ({ query }) => {
      const keyword = query.get('keyword') || ''
      const cats = CATS.filter((c) => c.name.includes(keyword) || c.aliases.some((a) => a.includes(keyword)))
        .map((c) => ({ id: c.id, type: 0, name: c.name, avatar: svgAvatar(c.name.slice(0, 1), c.hue), color: c.color, campus: c.campus, location: c.location }))
      const users = ADMIN_USERS.filter((u) => u.name.includes(keyword))
        .map((u) => ({ id: String(u.id), type: 1, name: u.name, avatar: u.avatar, description: `学号 ${u.sid}` }))
      return { cats: [...cats, ...users], items: [...cats, ...users], users }
    } },

  // ---- SOS ----
  { method: 'GET', pattern: /^\/sos$/, handle: ({ query }) => page(SOS, query, 10) },
  { method: 'GET', pattern: /^\/sos\/my$/, handle: ({ query }) => {
      const status = query.get('status')
      const items = SOS.filter((s) => s.reporterId === 2 && (!status || s.status === status))
      return page(items, query, 10)
    } },
  { method: 'POST', pattern: /^\/sos$/, handle: ({ body }) => {
      const item = {
        id: `sos-${Date.now()}`, catId: body?.catId || null, campus: body?.campus ?? 5,
        location: body?.location ?? '', symptoms: [], description: body?.description || '',
        imageURLs: [], status: 'PENDING', reporterId: 2, reporterName: '山学生', create_time: now(),
      }
      SOS.unshift(item)
      return { id: item.id, status: item.status }
    } },
  { method: 'POST', pattern: /^\/sos\/([^/]+)\/cancel$/, handle: ({ params }) => {
      const s = SOS.find((x) => x.id === params[0])
      if (s) s.status = 'CANCELLED'
      return null
    } },

  // ---- 领养 ----
  { method: 'GET', pattern: /^\/adoptions$/, handle: ({ query }) => page(ADOPTIONS, query, 10) },
  { method: 'GET', pattern: /^\/adoptions\/my$/, handle: ({ query }) => {
      const status = query.get('status')
      const items = ADOPTIONS.filter((a) => a.userId === 2 && (!status || a.status === status))
      return page(items, query, 10)
    } },
  { method: 'POST', pattern: /^\/adoptions$/, handle: ({ body, role }) => {
      const item = {
        id: `ad-${Date.now()}`, userId: role === 'admin' ? 1 : 2, userName: role === 'admin' ? '喵喵管理员' : '山学生',
        catId: String(body?.catId || ''), catName: CATS.find((c) => c.id === body?.catId)?.name || '',
        catAvatar: '', avatar: svgAvatar('申', '#94a3b8'), status: 'PENDING', createTime: now(),
        info: { plan: String(body?.plan || ''), housing: String(body?.housing || 'OWN_HOUSE'), experience: String(body?.experience || 'NEWBIE') },
        contact: { phone: String(body?.contact?.phone || ''), wechat: String(body?.contact?.wechat || '') },
      }
      ADOPTIONS.unshift(item)
      return item
    } },
  { method: 'POST', pattern: /^\/adoptions\/([^/]+)\/audit$/, handle: ({ params, body }) => {
      const a = ADOPTIONS.find((x) => x.id === params[0])
      if (a && body?.status) a.status = body.status
      return a || null
    } },

  // ---- 新喵线索 ----
  { method: 'GET', pattern: /^\/new-cats$/, handle: ({ query }) => {
      let items = NEW_CATS
      const status = query.get('status')
      if (status) items = items.filter((n) => n.status === status)
      return page(items, query, 10)
    } },
  { method: 'POST', pattern: /^\/new-cats$/, handle: ({ body, role }) => {
      const item = {
        id: `nc-${Date.now()}`, tempName: body?.tempName || null, officialName: null,
        color: body?.color || '未知', images: body?.images || [], campus: body?.campus || '软件园校区',
        location: body?.location || '', submitterId: '2', submitterName: role === 'admin' ? '喵喵管理员' : '山学生',
        status: 'PENDING', createTime: now(), tags: body?.tags || [],
      }
      NEW_CATS.unshift(item)
      return item
    } },
  { method: 'POST', pattern: /^\/new-cats\/([^/]+)\/approve$/, handle: ({ params, body }) => {
      const n = NEW_CATS.find((x) => x.id === params[0])
      if (n) { n.status = 'APPROVED'; n.officialName = body?.name || n.tempName }
      return n || null
    } },
  { method: 'POST', pattern: /^\/new-cats\/([^/]+)\/reject$/, handle: ({ params }) => {
      const n = NEW_CATS.find((x) => x.id === params[0])
      if (n) n.status = 'REJECTED'
      return n || null
    } },

  // ---- 管理端 ----
  { method: 'GET', pattern: /^\/admin\/dashboard\/stats$/, handle: () => ({
      adoptApplications: ADOPTIONS.filter((a) => a.status === 'PENDING').length,
      totalCats: 42,
      pendingSOS: SOS.filter((s) => s.status === 'PENDING').length,
      campusDistribution: [
        { campus: 5, percentage: 46, count: 13 }, { campus: 0, percentage: 22, count: 6 },
        { campus: 1, percentage: 18, count: 5 }, { campus: 2, percentage: 14, count: 4 },
      ],
    }) },
  { method: 'GET', pattern: /^\/admin\/users$/, handle: ({ query }) => {
      let items = ADMIN_USERS.map((u) => ({ ...u, status: state.bannedUsers.has(u.id) ? 1 : 0 }))
      const search = query.get('search')
      if (search) items = items.filter((u) => u.name.includes(search) || String(u.email || '').includes(search) || String(u.id) === search)
      return page(items, query, 10)
    } },
  { method: 'GET', pattern: /^\/admin\/users\/([^/]+)$/, handle: ({ params }) => {
      const u = ADMIN_USERS.find((x) => String(x.id) === params[0])
      if (!u) return fail('用户不存在', 404)
      return {
        uid: u.id, nickname: u.name, sid: u.sid, avatar: u.avatar, level: u.level, title: u.levelTitle,
        exp: 2200, nextExp: 3000, campus: u.campus, currency: u.currency, permission: u.permission,
        status: state.bannedUsers.has(u.id) ? 1 : 0,
        stats: { feedCount: 30, found: 1, receivedLikes: 18, postCount: 7 },
      }
    } },
  { method: 'POST', pattern: /^\/admin\/users\/([^/]+)\/ban$/, handle: ({ params }) => {
      // 文档：自动判断当前状态然后取反（无请求体）
      const id = Number(params[0])
      if (state.bannedUsers.has(id)) state.bannedUsers.delete(id)
      else state.bannedUsers.add(id)
      return null
    } },
  { method: 'GET', pattern: /^\/admin\/cats$/, handle: ({ query }) => {
      let items = CATS.map(catListItem)
      const status = query.get('status')
      const color = query.get('color')
      const search = query.get('search')
      if (status !== null && status !== '') items = items.filter((c) => String(c.status) === status)
      if (color) items = items.filter((c) => String(c.color) === color)
      if (search) items = items.filter((c) => c.name.includes(search))
      return page(items, query, 10)
    } },
  { method: 'POST', pattern: /^\/admin\/cats$/, handle: ({ body }) => {
      const cat: CatSeed = {
        id: `cat-${Date.now()}`, name: body?.name || '未命名', aliases: body?.aliases || [],
        color: body?.color ?? 1, campus: body?.campus ?? 5, location: body?.hauntLocation ?? null,
        status: body?.status ?? 0, healthStatus: body?.healthStatus ?? 0, gender: body?.gender ?? 0,
        role: body?.role ?? 0, isNeutered: Boolean(body?.isNeutered), neuteredDate: body?.neuteredDate || null,
        birthYear: body?.birthYear || 2025, admissionDate: body?.admissionDate || null,
        lastSeenTime: null, tags: body?.tags || [],
        attributes: { friendliness: 5, gluttony: 5, fight: 5, appearance: 5 },
        description: body?.description || '', popularity: 0, hue: '#f59e0b',
      }
      CATS.push(cat)
      return catDetail(cat)
    } },
  { method: 'GET', pattern: /^\/admin\/cats\/([^/]+)\/image-keys$/, handle: ({ params }) => {
      const cat = CATS.find((c) => c.id === params[0])
      return (cat ? catDetail(cat).images : []).map((url, i) => ({ key: `mock/${params[0]}/${i}.jpg`, url }))
    } },
  { method: 'PUT', pattern: /^\/admin\/cats\/([^/]+)$/, handle: ({ params, body }) => {
      const cat = CATS.find((c) => c.id === params[0])
      if (!cat) return fail('猫咪不存在', 404)
      Object.assign(cat, {
        name: body?.name ?? cat.name, color: body?.color ?? cat.color, campus: body?.campus ?? cat.campus,
        status: body?.status ?? cat.status, healthStatus: body?.healthStatus ?? cat.healthStatus,
        gender: body?.gender ?? cat.gender, role: body?.role ?? cat.role,
        hauntLocation: body?.hauntLocation, description: body?.description ?? cat.description,
        attributes: body?.attributes ?? cat.attributes, tags: body?.tags ?? cat.tags,
      })
      return catDetail(cat)
    } },
  { method: 'DELETE', pattern: /^\/admin\/cats\/([^/]+)$/, handle: ({ params }) => {
      const idx = CATS.findIndex((c) => c.id === params[0])
      if (idx >= 0) CATS.splice(idx, 1)
      return null
    } },
  { method: 'GET', pattern: /^\/admin\/announcements$/, handle: ({ query }) => {
      let items = ANNOUNCEMENTS
      const status = query.get('status')
      if (status) items = items.filter((a) => a.status === status)
      return page(items, query, 10)
    } },
  { method: 'POST', pattern: /^\/admin\/announcements$/, handle: ({ body }) => {
      const item = {
        id: `ann-${Date.now()}`, title: body?.title || '', content: body?.content || '',
        summary: body?.summary || '', coverImage: body?.coverImage || '', type: body?.type || 'NEWS',
        status: body?.status || 'DRAFT', authorName: '喵喵管理员', viewCount: 0, createTime: now(), updateTime: now(),
      }
      ANNOUNCEMENTS.unshift(item)
      return item
    } },
  { method: 'PUT', pattern: /^\/admin\/announcements\/([^/]+)$/, handle: ({ params, body }) => {
      const a = ANNOUNCEMENTS.find((x) => x.id === params[0])
      if (a) Object.assign(a, body || {}, { updateTime: now() })
      return a || null
    } },
  { method: 'DELETE', pattern: /^\/admin\/announcements\/([^/]+)$/, handle: ({ params }) => {
      const idx = ANNOUNCEMENTS.findIndex((a) => a.id === params[0])
      if (idx >= 0) ANNOUNCEMENTS.splice(idx, 1)
      return null
    } },
  { method: 'GET', pattern: /^\/admin\/adoptions$/, handle: ({ query }) => {
      let items = ADOPTIONS
      const status = query.get('status')
      if (status) items = items.filter((a) => a.status === status)
      return page(items, query, 10)
    } },
  { method: 'GET', pattern: /^\/admin\/sos$/, handle: ({ query }) => {
      let items = SOS
      const status = query.get('status')
      if (status) items = items.filter((s) => s.status === status)
      return page(items, query, 10)
    } },
  { method: 'POST', pattern: /^\/admin\/sos\/([^/]+)\/resolve$/, handle: ({ params, body }) => {
      const s = SOS.find((x) => x.id === params[0])
      if (s) {
        const rawStatus = String(body?.status ?? '').toUpperCase()
        const resolved = body?.status === 2 || rawStatus === 'RESOLVED' || rawStatus === 'DONE'
        s.status = resolved ? 'RESOLVED' : 'PROCESSING'
        s.adminReply = body?.reply || null
      }
      return s || null
    } },
  { method: 'GET', pattern: /^\/admin\/new-cats$/, handle: ({ query }) => {
      let items = NEW_CATS
      const status = query.get('status')
      if (status) items = items.filter((n) => n.status === status)
      return page(items, query, 10)
    } },
  { method: 'GET', pattern: /^\/admin\/audit(?:\/([^/]+))?$/, handle: ({ params, query }) => {
      if (params[0]) {
        const item = { id: params[0], type: 'NEW_CAT', payload: {} }
        return item
      }
      return page(NEW_CATS.filter((n) => n.status === 'PENDING').map((n) => ({ id: n.id, tempName: n.tempName, status: n.status, createTime: n.createTime })), query, 10)
    } },

  // ---- COS 上传（返回假的直传凭证；URL 直接可用） ----
  { method: 'POST', pattern: /^\/cos\/upload-image$/, handle: () => ({
      tmpSecretId: 'mock-secret-id', tmpSecretKey: 'mock-secret-key', sessionToken: 'mock-token',
      bucket: 'mock-bucket', region: 'ap-nanjing', keys: [`mock/upload-${Date.now()}.jpg`],
    }) },

  // ---- 流水（移动端钱包页） ----
  { method: 'GET', pattern: /^\/statement\/(feed-log|asset-log|stat-log)$/, handle: ({ query }) => page(
      Array.from({ length: 8 }, (_, i) => ({ id: `st-${i}`, amount: i % 2 ? 5 : -1, description: i % 2 ? '每日签到' : '投喂消耗', createTime: `2026-09-2${i} 10:00:00` })),
      query, 20,
    ) },
]

const isAdminToken = (req: IncomingMessage) => {
  const auth = String(req.headers.authorization || '')
  const token = auth.replace(/^Bearer /, '')
  const payload = token.split('.')[1]
  if (!payload) return false
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sessionType?: string; role?: string }
    return parsed.sessionType === 'admin' || parsed.role === 'admin'
  } catch {
    return false
  }
}

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk: Buffer) => { data += chunk.toString() })
    req.on('end', () => resolve(data))
    req.on('error', () => resolve(''))
  })

function resolveRole(req: IncomingMessage): 'user' | 'admin' {
  return isAdminToken(req) ? 'admin' : 'user'
}

export function mockApiPlugin(): Plugin {
  return {
    name: 'sdumeow-mock-api',
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const rawUrl = req.url || '/'
        if (!rawUrl.startsWith('/api/')) {
          next()
          return
        }
        void (async () => {
          const url = new URL(rawUrl, 'http://localhost')
          const path = url.pathname.slice('/api'.length)
          const method = (req.method || 'GET').toUpperCase()

          for (const route of routes) {
            if (route.method !== method) continue
            const match = path.match(route.pattern)
            if (!match) continue

            const bodyText = method === 'GET' || method === 'DELETE' ? '' : await readBody(req)
            let body: unknown = null
            try { body = bodyText ? JSON.parse(bodyText) : null } catch { body = bodyText }

            let payload: unknown
            try {
              payload = route.handle({
                url, query: url.searchParams, params: match.slice(1), body, req, role: resolveRole(req),
              })
            } catch (error) {
              payload = fail(error instanceof Error ? error.message : 'mock 处理失败', 500)
            }

            // 模拟统一认证：302 回到前端并携带会话令牌
            if (payload && typeof payload === 'object' && '__redirect' in payload) {
              res.statusCode = 302
              res.setHeader('Location', String((payload as { __redirect: string }).__redirect))
              res.end()
              return
            }

            // 统一信封：路由处理函数可以只返回业务数据；已有 code 的（fail/手动 ok）
            // 保持原样，其余自动包一层成功信封。两端客户端的拦截器都依赖信封结构。
            const isEnvelope = (value: unknown): value is { code: number } =>
              Boolean(value) && typeof value === 'object' && typeof (value as { code?: unknown }).code === 'number'
            const envelope = isEnvelope(payload) ? payload : ok(payload)

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(envelope))
            return
          }

          // 未覆盖的端点：返回空成功 envelope，便于发现遗漏而不是直接报 404
          console.warn(`[mock] 未覆盖的端点: ${method} ${path}`)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(ok(null)))
        })()
      })
    },
  }
}
