# SDU Meow 移动端

这是统一项目中的移动端 workspace（React + TypeScript + Vite），部署路径为 `/mobile/`。

请在仓库根目录执行依赖安装、开发和构建：

```bash
pnpm install
pnpm dev:mobile
pnpm build
```

移动端开发服务器默认使用 `http://localhost:5174/mobile/`，生产产物由根目录构建脚本写入 `dist/mobile`。

## 功能与技术栈

移动端包含用户端和管理端路由，使用 Ant Design、TailwindCSS、Axios、Zustand、React Query 和 Vitest。
