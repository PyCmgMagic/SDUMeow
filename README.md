# SDU Meow 猫猫图鉴（统一 React 版）

> 原仓库来源、整合步骤与契约风险备忘见 **[INTEGRATION.md](./INTEGRATION.md)**。

本项目把原来的两个前端仓库（Vue 桌面端 + React 移动端）**重构融合为一个统一的 React 项目**：

- **统一技术栈**：React 19 + TypeScript + Vite（桌面端由 Vue 完整移植，移动端原样迁入）
- **统一路由**：一套规范 URL，桌面与移动端共用同一地址，按视口宽度渲染对应界面对应变体
- **统一会话**：一端登录，两端通用；一端登出，两端同时失效
- **UI 不变**：两端界面、交互、文案与各自原版保持一致

- `apps/web`：统一后的 React 应用（本项目的主体）
  - `src/pages/<页面>/` — **所有页面**：`index.tsx` 按视口宽度分发，`DesktopLayout.tsx` / `MobileLayout.tsx` 为两端布局（守卫语义也按端保留在页面内），`shared.ts` 为该页两端共用逻辑
  - `src/pages/shared/wrappers.tsx` — 页面级守卫/布局包装（桌面 `PcUser`、移动 `MbUser`/`MbAdmin`、跨端重定向）
  - `src/app` — 统一路由树（规范路径 + 旧 URL 兼容重定向）
  - `src/pc` — 桌面端壳与组件库（侧栏/顶栏/管理布局、shadcn/ui + radix-ui + zustand）
  - `src/mobile` — 移动端壳与组件库（根布局/底部导航、antd + @tanstack/react-query + zustand）
  - `src/shared` — 共享层（会话存储、JWT 解析、设备判定）

## 路由结构（统一后）

| 规范路径 | 桌面端渲染 | 移动端渲染 |
| --- | --- | --- |
| `/` | 桌面首页（侧栏壳） | 移动首页（底部导航壳） |
| `/login`、`/admin/login` | 桌面登录页 | 移动登录页 |
| `/cats/:id` | 桌面猫猫详情 | 移动猫猫详情 |
| `/publish`、`/new-cat`、`/sos`、`/adopt`、`/me`、`/me/edit` | 桌面对应页 | 移动对应页 |
| `/leaderboard`、`/announcements/:id` | 桌面对应页 | 移动对应页 |
| `/notifications`、`/my-adoptions`、`/my-sos`、`/checkin-history` | 仅桌面端 | 弹回首页 |
| `/kepu`、`/rewards`、`/profile`、`/home-alt`、`/announcements`、`/articles/:id` | 弹回首页 | 仅移动端 |
| `/admin/*` | 桌面管理后台（线条风） | 移动管理后台 |

设备判定与原部署一致：视口 ≤767px 为移动端。每个页面组件内部按设备渲染对应布局，两端各自的登录守卫语义（桌面 `RequirePcUser`/`RequirePcAdmin`，移动 `RequireRole` 含游客模式）按页保留。

**旧链接全部兼容**（重定向，可安全替换线上部署）：`/pc/*` 与 `/mobile/*` 前缀自动剥离；两端旧路径（如 `/cat/:id`、`/userCenter`、`/post`、`/ranking/:type`、`/user/home`、`/user/cats/:id`、`/admin/home` 等）映射到对应规范路径。

统一认证按新接口契约实现：前端跳转 `/auth/login`（带 `platform`），CAS 回调携带一次性 `login_code`，前端 `POST /auth/exchange` 换取令牌后落库到共享会话；同时兼容旧后端直接回传 `?meow_token=` 的行为。

## 开发

```bash
pnpm install
pnpm dev          # http://localhost:5173/  （单端口单入口，改窗口宽度即可切换两端界面）
```

### 本地 Mock 模式（无需真实账号）

`apps/web/.env.local` 中设置 `VITE_MOCK=1` 后，dev server 会启用 `mock/api.ts` —— 一个依据《接口文件.openapi.yaml》契约构造的内存后端：

- **登录**：桌面端点"山东大学统一认证"或邮箱密码登录均可；**邮箱含 `admin` 即为管理员**（如 `admin@sdumeow.cn`）；移动端登录后与桌面端共享会话
- **数据**：内存可变（投喂、点赞、封禁、公告 CRUD 均真实生效），重启 dev server 复位
- **图片**：内联 SVG，完全离线可用
- 关闭 Mock（`VITE_MOCK=0` 或删除变量）即恢复 `/api` → 线上的 Vite 代理

### 线上 API 代理

如需联调真实后端，在 `apps/web` 下创建 `.env.local`（参考 `apps/web/.env.example`）：

```dotenv
VITE_API_PROXY_TARGET=https://meow.sduonline.cn
```

## 检查和构建

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

`pnpm build` 输出到根目录 `dist`（单入口 SPA）。部署时把所有非资源路径回退到 `index.html` 即可（例如 Nginx `try_files $uri /index.html`）。

## 统一数据层（`src/shared`）

- `session.ts` — 统一会话存储：token 权威存储在 `meow.session.{user|admin}.*`，读取时自动兼容迁移旧 key（桌面端 `token`/`adminToken`、移动端 `sdu_meow_token`）；升级前已登录的用户不掉线。用户会话跨端共享，管理员会话使用独立的 `admin` scope，避免跨视口误用权限
- `jwt.ts` — 统一 JWT 解析（原两端各一份等价实现）
- `device.ts` — 统一设备判定（`useIsMobile` / `isMobileViewport`）

移动端启动时（`auth.store` 水合回调）与共享会话对账：他端新登录则采纳 token 并从 JWT 推断角色；他端已登出则清除本地残留副本。

两端的 HTTP 客户端（`@pc/lib/https`、`@/api/client`）暂保持各自实现：报错提示（toast vs 类型化错误）、响应拆包、token 刷新传输、登录跳转方式都是既有产品行为，强行合并需要大量行为开关，回归风险大于收益。

## 样式共存

两端样式表在统一入口同时加载，`body` 等全局规则按 `html[data-device]`（`pc` / `mobile`，由入口脚本与路由根同步标记）隔离，互不覆盖。两端组件层的 Tailwind 类名本就使用不同命名空间（shadcn token vs `brand-*` / 原子类），合并不产生冲突。

## 桌面端移植说明（Vue → React）

- 视觉与交互 1:1 移植：所有 class、文案、注释、接口调用保持原样
- Pinia stores → zustand（`src/pc/stores`，字段与方法一一对应）
- shadcn-vue（reka-ui）→ shadcn/ui（radix-ui）；reka-ui 的分页组件按其源码算法复刻
- `vue-sonner` → `sonner`，Toast 样式类与图标完全一致
- 未使用的脚手架文件未迁入

## 来源仓库

- 桌面端原版：<https://github.com/MissingYoung/MeowPC>
- 移动端原版：<https://github.com/Selena14111/sdumeow_web>
