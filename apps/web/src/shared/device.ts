import { useEffect, useState } from 'react'

// 与原根入口跳转脚本一致的设备断点：≤767px 视为移动端。
const MOBILE_QUERY = '(max-width: 767px)'

export function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
}

/** 响应式设备判定：同一 URL 下按视口宽度选择桌面端或移动端变体。 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(isMobileViewport)

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY)
    const update = () => setIsMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return isMobile
}
