// 统一入口部署在站点根：不再携带 /pc 前缀，旧前缀 URL 由路由表重定向兼容。
const appBasePath: string = ''

export function withAppBasePath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${appBasePath}${normalizedPath}` || '/'
}

export function withoutAppBasePath(pathname: string): string {
  if (!appBasePath) return pathname
  if (pathname === appBasePath) return '/'
  return pathname.startsWith(`${appBasePath}/`) ? pathname.slice(appBasePath.length) : pathname
}
