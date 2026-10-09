import { useMatches } from 'react-router-dom'

/**
 * The former Vue app keyed several behaviors off vue-router route names
 * (`route.name === 'sos'`, page titles, …). The React router config stores
 * those names on each route's `handle`, and this hook returns the name of the
 * deepest matched route ('' when unset).
 */
export function useRouteName(): string {
  const matches = useMatches()
  const last = matches[matches.length - 1]
  return (last?.handle as { name?: string } | undefined)?.name ?? ''
}
