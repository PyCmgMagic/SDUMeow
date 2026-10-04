# SDU Meow 整合文档

记录两个原始仓库如何融合为现在的统一项目：原仓库在哪、新项目在哪、整合步骤与产物。

## 一、原仓库在哪

| 来源 | 原始地址 | 说明 |
| --- | --- | --- |
| 桌面端 | https://github.com/MissingYoung/MeowPC | Vue 3 + TypeScript + Vite + shadcn-vue |
| 移动端 | https://github.com/Selena14111/sdumeow_web | React 19 + antd + react-query + Vite |

本仓库里的保留位置（过渡期对照用，确认统一应用稳定后可整体删除）：

- `apps/pc/` —— 桌面端原仓库的完整副本（Vue 3，保留用于对照构建）
- `apps/mobile/` —— 移动端原仓库的完整副本（React，保留用于回归测试）
- 两者保留是为了逐页对照验证；确认新版无差异后可删除这两个目录（仓库其余部分不依赖它们）

## 二、新项目在哪

融合后的主前端应用：**`apps/web/`**。当前 pnpm workspace 仍包含 3 个应用包：
`apps/web`（统一主应用）、`apps/pc`（Vue 版 legacy 对照工程）和
`apps/mobile`（React 版 legacy 对照工程）。后两个包属于过渡期保留项，删除前仍由根脚本显式执行
构建或回归测试。

```
apps/web/
├── index.html               # 唯一入口（站点根部署）
├── src/
│   ├── app/                 # 统一路由树（规范路径 + 旧 URL 重定向）
│   ├── pages/<页面>/        # 当前 41 个页面/路由模块：index + DesktopLayout + MobileLayout
│   ├── pc/                  # 桌面端壳与组件库（侧栏/顶栏/管理布局、shadcn/ui）
│   ├── mobile/              # 移动端壳与组件库（根布局/底部导航、antd）
│   ├── shared/              # 跨端共享：会话存储 / JWT 解析 / 设备判定
│   └── main.tsx             # 唯一启动文件
├── mock/api.ts              # 开发态 Mock 后端（VITE_MOCK=1 时启用）
└── tests/                   # 主应用单元测试（49 个）
```

## 三、怎么整合的（按实际执行顺序）

### 第 1 步：原仓库导入

两个原始仓库整体复制为 `apps/pc` 与 `apps/mobile`，用根目录脚本统一安装、构建，先做成一个 pnpm monorepo（构建产物 `/pc/` 与 `/mobile/` 并存，根入口按屏幕宽度跳转）。这是过渡形态，URL 仍带 `/pc`、`/mobile` 前缀。

### 第 2 步：桌面端 Vue → React 移植

把 `apps/pc` 的 Vue 3 实现**逐文件忠实转写**为 React（现位于 `apps/web/src/pc`）：

- 视图与组件：30 个视图 + 10 个业务组件，所有 class、文案、注释原样保留
- shadcn-vue（reka-ui）→ shadcn/ui（radix-ui），reka 的分页组件按其源码算法复刻
- Pinia stores → zustand（`src/pc/stores`，字段与方法一一对应）
- vue-sonner → sonner（Toast 图标与样式类一致）
- 界面渲染结果与原版逐页对比验证过

### 第 3 步：统一构建与路由（去掉 /pc、/mobile 前缀）

- 单 Vite 入口（`index.html` + `src/main.tsx`），构建产物一个 `dist`
- 一套规范 URL（`/`、`/cats/:id`、`/admin/*`…），每个页面组件内部按视口宽度（≤767px，与原部署判定一致）渲染桌面或移动布局
- 旧链接全部兼容：`/pc/*`、`/mobile/*` 前缀自动剥离；两端旧路径（`/cat/:id`、`/userCenter`、`/user/home` 等）重定向到规范路径
- 移动端登录守卫（含游客模式）与桌面端登录/管理员守卫按端保留在各页面组件内

### 第 4 步：统一数据层（`src/shared`）

- `session.ts`：统一会话存储，token 迁移到 `meow.session.*` 并自动兼容两端的旧 key；用户会话在两端共享，管理员会话使用独立的 `admin` scope，避免跨视口误用权限
- `jwt.ts`：统一 JWT 解析（原先两端各一份）
- `device.ts`：统一设备判定

### 第 5 步：契约审查与本地 Mock

- 以《接口文件.openapi.yaml》逐字段核对两端客户端的请求与响应处理（结论见下方"契约风险"）
- `mock/api.ts`：依据接口文档构造的内存后端，`apps/web/.env.local` 设 `VITE_MOCK=1` 启用——无需真实账号即可联调全部页面（邮箱含 `admin` 即管理员，数据内存可变，重启复位）

## 四、旧 URL → 新 URL 速查

| 旧地址（任一端） | 新地址 |
| --- | --- |
| `/pc/` 或 `/`（桌面） | `/` |
| `/mobile/` 或 `/mobile/user/home` | `/` |
| `/pc/cat/:id`、`/mobile/user/cats/:id` | `/cats/:id` |
| `/pc/userCenter`、`/mobile/user/me-center` | `/me` |
| `/pc/post`、`/mobile/user/publish` | `/publish` |
| `/pc/ranking/:type`、`/mobile/user/leaderboard` | `/leaderboard` |
| `/pc/editProfile`、`/mobile/user/me/edit` | `/me/edit` |
| `/mobile/user/kepu|rewards|announcements|articles/:id` | 去掉 `/user` 前缀 |
| `/pc/admin/*`、`/mobile/admin/*` | `/admin/*`（按设备渲染对应后台） |

## 五、契约风险备忘（需与后端确认）

接口文档与前端实际调用存在几处分歧，**前端以真实联调行为为准，未按文档改动**：

1. 猫咪"写接口"（create/update）文档用字符串枚举（ORANGE/TABBY…），前端用数字 ID + `/type/*` 选项接口（文档中无此系列端点）；而"读接口"查询参数文档又是数字——文档自身不一致
2. SOS 处理与领养审核的 `status`：文档为字符串枚举，前端注释记录真实后端收数字码
3. `PUT /users/me` 文档示例里 `campus` 是中文名，前端发数字 ID
4. 前端调用的 `/articles/:id`、`/users/me/settings` 等端点文档未收录

## 六、验证状态

- `pnpm typecheck` / `pnpm lint` / `pnpm test`（Web 49/49 + legacy Mobile 40/40）/ `pnpm build` 全部通过
- `pnpm test` 现在执行 `test:all`：先运行主应用 Web 测试，再运行 legacy Mobile 测试；
  也可分别使用 `pnpm test:web` 和 `pnpm test:legacy-mobile`。legacy PC 没有单元测试脚本，
  以 `pnpm --filter @sdumeow/pc typecheck` 与 `pnpm build:legacy-pc` 作为回归门槛
- 浏览器双视口全路由扫描通过；登录态下桌面 10 页、管理后台 9 页、移动端 16 页均用 Mock 数据实测渲染
- 部署：静态托管把所有路径回退到 `index.html` 即可（如 Nginx `try_files $uri /index.html`）
