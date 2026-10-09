// 统一入口部署在站点根：不再携带 /mobile 前缀，旧前缀 URL 由路由表重定向兼容。
const appBasePath: string = ''

export function withAppBasePath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${appBasePath}${normalizedPath}` || '/'
}

export function isAppPath(pathname: string, path: string): boolean {
  return pathname === withAppBasePath(path)
}
