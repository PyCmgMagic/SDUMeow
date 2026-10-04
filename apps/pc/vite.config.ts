import path from 'node:path'
import https from 'node:https'
import { defineConfig, loadEnv } from 'vite'

import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE_PATH || '/pc/'
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'https://meow.sduonline.cn'
  // Node 22 may try the host's IPv6 addresses first. Some campus and local
  // network policies allow the IPv4 route only, which otherwise makes Vite
  // surface a generic proxy 500 for every /api request.
  const apiProxyAgent = new https.Agent({ family: 4 })

  return {
    base,
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // Fail clearly when the default port is occupied instead of silently
      // switching ports and leaving the user on another local application.
      strictPort: true,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
          agent: apiProxyAgent,
          // The deployed backend is served below /api. Preserve the prefix so
          // /api/users/login is not rewritten to the frontend SPA fallback.
        },
      },
    },
    build: {
      outDir: path.resolve(__dirname, '../../dist/pc'),
      emptyOutDir: true,
    },
  }
})
