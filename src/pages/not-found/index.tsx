import { useIsMobile } from '@shared/device'

import { MobileLayout } from './MobileLayout'

/** 未匹配路由：移动端渲染 404 页，桌面端与原 vue-router 未匹配行为一致（空白内容区）。 */
export default function NotFoundPage() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileLayout /> : null
}
