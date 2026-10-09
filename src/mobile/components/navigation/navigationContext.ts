import { createContext } from 'react'

/** The root owns navigation on primary tabs, across page unmounts. */
export const PersistentUserNavigationContext = createContext(false)
