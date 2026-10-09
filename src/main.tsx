import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@ant-design/v5-patch-for-react-19'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntdApp, ConfigProvider } from 'antd'
import { RouterProvider } from 'react-router-dom'

import { router } from './app/router'
import { antdTheme } from '@/styles/antd-theme'
import { isMobileViewport } from '@shared/device'

import 'antd/dist/reset.css'
import '@pc/assets/index.css'
import '@/styles/tailwind.css'

// 首帧前同步标记设备类型：两端各自的 body 样式按 html[data-device] 隔离，
// 避免"上一端"的 body 背景在本次会话里残留。
document.documentElement.dataset.device = isMobileViewport() ? 'mobile' : 'pc'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    },
  },
})

// Static message/modal calls are still used by legacy mobile pages. Route
// their holders through the same theme and App context so React 19 does not
// emit Ant Design's static-context warning.
ConfigProvider.config({
  holderRender: (children) => (
    <ConfigProvider theme={antdTheme}>
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  ),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider theme={antdTheme}>
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
)
