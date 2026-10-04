import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { loadEnv } from 'vite'
import { defineConfig, type Plugin } from 'vite'
import { mockApiPlugin } from './mock/api'

// 单一 SPA 入口：一套规范路由同时服务桌面端与移动端（按视口宽度渲染对应变体）。
// 旧的 /pc/*、/mobile/* 前缀 URL 由路由表内的重定向规则兼容。
const rootHtml = fileURLToPath(new URL('./index.html', import.meta.url))

// Dev-server history fallback。白名单式改写：Vite 的无扩展名虚拟模块
// （/@vite/client、/@react-refresh 等）与带扩展名的资源请求必须放行给
// Vite 自身中间件，否则模块运行时会被误改写到 index.html 而白屏。
// 生产静态服务器做同样的 SPA 回退即可（见 README）。
function spaFallback(): Plugin {
  return {
    name: 'spa-fallback',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? '/'
        const pathname = url.split('?')[0]!.split('#')[0]!
        if (
          pathname.startsWith('/@')
          || pathname.startsWith('/node_modules')
          || pathname.startsWith('/src')
          || pathname.startsWith('/api')
          || /\.[a-zA-Z0-9]+$/u.test(pathname)
        ) {
          next()
          return
        }
        req.url = '/index.html'
        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'https://meow.sduonline.cn'

  return {
    base: '/',
    // 'mpa' 关闭 Vite 内置的 SPA 回退（它会把 404 也重写到 index.html），
    // 由上面的 spaFallback 中间件全权负责。
    appType: 'mpa',
    plugins: [react(), spaFallback(), ...(env.VITE_MOCK === '1' ? [mockApiPlugin()] : [])],
    resolve: {
      alias: {
        // `@` keeps pointing at the mobile subtree so the imported mobile app
        // sources stay byte-identical; the desktop port uses `@pc`.
        '@': fileURLToPath(new URL('./src/mobile', import.meta.url)),
        '@pc': fileURLToPath(new URL('./src/pc', import.meta.url)),
        '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      },
    },
    server: {
      strictPort: true,
      port: 5173,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
          // The deployed backend is served below /api. Preserve the prefix so
          // /api/users/login is not rewritten to the frontend SPA fallback.
        },
      },
    },
    build: {
      outDir: fileURLToPath(new URL('../../dist', import.meta.url)),
      emptyOutDir: true,
      // Ant Design is kept as one cacheable vendor boundary; application
      // routes are split below this threshold.
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        input: { index: rootHtml },
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-antd': ['antd', '@ant-design/icons'],
            'vendor-data': ['@tanstack/react-query', 'zustand', 'axios'],
            'vendor-ui': ['lucide-react', 'sonner'],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        // Include the unified app instead of only the mobile API/store subset.
        // This keeps the report honest about shared, desktop and route code.
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.d.ts', 'src/**/assets/**'],
      },
    },
  }
})
