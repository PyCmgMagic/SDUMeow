# SDU Meow · 山大猫猫图鉴

面向山东大学校园猫咪的记录与关爱平台。查看猫咪档案、分享校园日常、申请领养、上报救援线索，让每一只校园猫咪都能被看见、被照顾。

本仓库是平台的前端应用，使用 **React + TypeScript + Vite**，在同一套地址和构建产物中提供 PC、移动端及管理后台。

## 功能

- **猫咪图鉴**：猫咪列表、档案、相册、标签与人气排行。
- **校园互动**：动态发布、点赞、投喂、签到、个人资料与徽章。
- **领养与救援**：领养申请、新猫线索、SOS 上报及相关管理流程。
- **内容与社群**：公告、科普内容、团队介绍和社群入口。
- **管理后台**：猫咪档案、领养审核、救援处理、用户及公告管理。

PC 与移动端按视口宽度自动切换：**≤767px 为移动端**。部分功能为单端页面，访问时会按页面配置跳转；两端使用同一个认证 store，登录、退出及 token 刷新即时共享，调整窗口宽度不需要重新登录。管理员会话与普通用户会话独立保存。

## 快速开始

建议使用 **Node.js 22.12 或更高版本**；pnpm 版本以根目录 `package.json` 的 `packageManager` 为准（当前为 `11.19.0`）。

```bash
git clone https://github.com/PyCmgMagic/SDUMeow.git
cd SDUMeow
pnpm install --frozen-lockfile
```

将根目录的 [.env.example](.env.example) 复制为 `.env.local`，按后端环境填写配置。随后在仓库根目录运行：

```bash
pnpm dev
```

访问 <http://localhost:5173/>。开发服务固定使用 `5173` 端口，端口被占用时需先释放。调整浏览器宽度即可查看两端布局。

应用连接真实后端，登录与业务操作需要对应账号和接口服务。仓库不提供演示账号或内置 Mock 后端。

## 环境配置

配置文件放在仓库根目录，本地使用 `.env.local`，生产构建可使用 `.env.production`。

```dotenv
# 开发服务器将 /api 请求代理到此地址，并保留 /api 前缀。
VITE_API_PROXY_TARGET=

# 移动端使用当前站点的 /api 接口。
VITE_API_BASE_URL=/api
```

| 变量 | 用途 |
| --- | --- |
| `VITE_API_PROXY_TARGET` | 开发时的 API 代理目标，需要在本地配置中填写；为空时不启用开发代理。也作为 PC 统一认证地址的回退值。 |
| `VITE_API_BASE_URL` | 移动端 API 与统一认证基地址；可设为 `/api` 或完整 API 地址，默认 `/api`。 |
| `VITE_AUTH_ORIGIN` | PC 统一认证服务地址；未配置时使用代理目标或当前站点。 |
| `VITE_IMAGE_BASE_URL` | 移动端图片资源基地址，可选。 |
| `VITE_FRONTEND_BASE_URL` | 移动端分享链接的站点基地址，可选；未配置时使用当前站点。 |

将实际后端地址填写在被 Git 忽略的 `.env.local` 或 `.env.production` 中。PC 业务请求固定使用同源 `/api`，`VITE_API_BASE_URL` 仅影响移动端。部署时需为 PC 配置对应的 `/api` 服务或反向代理。

`VITE_*` 变量会写入前端构建产物，请只填写公开配置。修改环境变量后需重启开发服务或重新构建。

## 项目结构

```text
SDUMeow/
├── src/                    # 应用源码
│   ├── app/                # 路由与旧地址兼容
│   ├── pages/              # 页面入口及 PC / 移动端布局
│   ├── pc/                 # PC 组件、样式、状态与接口客户端
│   ├── mobile/             # 移动端组件、样式、状态与接口客户端
│   ├── shared/             # 共享认证状态、设备判定、会话与 JWT 工具
│   └── main.tsx            # 应用入口
├── public/                 # 直接发布的静态资源
├── scripts/                # 构建清理等辅助脚本
├── index.html              # 单一 HTML 入口
├── package.json            # 依赖与开发、构建命令
├── .env.example            # 环境配置示例
├── vite.config.ts          # 开发代理与构建配置
└── tsconfig*.json          # TypeScript 配置
```

页面通常由 `index.tsx` 选择 `DesktopLayout.tsx` 或 `MobileLayout.tsx`，部分页面仅有单端实现。PC 使用 Radix UI / shadcn 风格组件，移动端使用 Ant Design；共享 Tailwind 配置，按设备标记隔离全局样式。

项目按单应用组织，源码与配置直接位于根目录，无需进入子包运行命令。`pnpm-workspace.yaml` 仅保留依赖安装时的构建许可配置。

路径别名：`@pc` 指向 `src/pc`，`@` 指向 `src/mobile`，`@shared` 指向 `src/shared`。状态管理使用 Zustand，认证状态统一由 `src/shared/auth.store.ts` 管理；原 PC 与移动端 store 文件仅保留兼容导出，不再创建独立认证状态。移动端请求缓存使用 TanStack Query。

## 常用命令

在仓库根目录执行：

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动开发服务。 |
| `pnpm typecheck` | 检查 TypeScript 类型。 |
| `pnpm lint` | 执行 ESLint 检查。 |
| `pnpm build` | 清理旧产物并构建，输出到根目录 `dist/`。 |
| `pnpm preview` | 本地预览构建产物。 |
| `pnpm clean` | 清理根目录构建产物。 |

## 部署

执行 `pnpm build` 后，将根目录 `dist/` 发布到静态服务器。当前构建使用 `base: '/'`，按站点根路径部署。

这是使用浏览器路由的 SPA。静态服务器需要将页面路径回退到 `index.html`，同时将 `/api` 请求单独交给后端。Nginx 配置示例：

```nginx
location /api/ {
    # 替换为实际后端地址；不加路径后缀，以保留请求中的 /api/。
    proxy_pass http://your-api-upstream;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    try_files $uri $uri/ /index.html;
}
```

Vite 开发代理不包含在构建产物中，生产环境需单独配置 API 转发。统一认证还需后端配置正确的前端回调地址；前端支持一次性 `login_code` 换取会话，也兼容旧版 `meow_token` 回调。

## 仓库约定

根目录 README 随源码维护。接口文件和内部说明集中在本地 `docs/`。仓库仅保留应用源码与必要配置，不包含 Mock、测试、覆盖率报告或迁移备份；本地环境文件、内部文档和构建产物由 `.gitignore` 排除，不提交到远端。

## 项目来源

项目由原 PC 与移动端前端整合而来，PC 实现已迁移到 React：

- PC 原仓库：[MissingYoung/MeowPC](https://github.com/MissingYoung/MeowPC)
- 移动端原仓库：[Selena14111/sdumeow_web](https://github.com/Selena14111/sdumeow_web)
