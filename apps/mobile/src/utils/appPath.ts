const appBasePath = import.meta.env.BASE_URL.replace(/\/$/, '')

export function withAppBasePath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${appBasePath}${normalizedPath}` || '/'
}

export function isAppPath(pathname: string, path: string): boolean {
  return pathname === withAppBasePath(path)
}
