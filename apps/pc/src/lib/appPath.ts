const appBasePath = import.meta.env.BASE_URL.replace(/\/$/, '')

export function withAppBasePath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${appBasePath}${normalizedPath}` || '/'
}

export function withoutAppBasePath(pathname: string): string {
  if (!appBasePath) return pathname
  if (pathname === appBasePath) return '/'
  return pathname.startsWith(`${appBasePath}/`) ? pathname.slice(appBasePath.length) : pathname
}
