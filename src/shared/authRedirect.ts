export function safeAuthRedirect(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')
    || value.includes('\\') || Array.from(value).some((character) => character.charCodeAt(0) < 32)) {
    return fallback
  }
  return value
}
