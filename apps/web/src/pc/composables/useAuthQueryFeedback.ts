import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { toast } from '@pc/lib/toast'

export type AuthQueryErrorCode = 'sdu' | 'forbidden' | '403' | 'not_admin'

type AuthQueryFeedbackOptions = {
  loginPath: '/login' | '/admin/login'
  messages?: Partial<Record<AuthQueryErrorCode | string, string>>
  fallbackMessage?: string
  expiredMessage?: string
}

const resolveAuthErrorMessage = (
  authError: string,
  messages: Record<string, string>,
  fallbackMessage: string,
) => messages[authError] ?? messages[authError.toLowerCase()] ?? fallbackMessage

export function useAuthQueryFeedback(options: AuthQueryFeedbackOptions) {
  const location = useLocation()
  const router = useNavigate()
  const [authNotice, setAuthNotice] = useState('')

  const messages: Record<string, string> = Object.fromEntries(
    Object.entries(options.messages ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )

  const fallbackMessage = options.fallbackMessage ?? '统一认证失败，请重试'
  const expiredMessage = options.expiredMessage ?? '登录已过期，请重新登录'

  useEffect(() => {
    const query = new URLSearchParams(location.search)
    const authError = query.get('authError')?.trim() || ''
    const redirect = query.get('redirect')
    const clearAuthQuery = () => {
      router({
        pathname: location.pathname,
        search: redirect ? `?redirect=${encodeURIComponent(redirect)}` : '',
      }, { replace: true })
    }

    if (authError) {
      setAuthNotice(resolveAuthErrorMessage(authError, messages, fallbackMessage))
      window.setTimeout(() => {
        toast.error(resolveAuthErrorMessage(authError, messages, fallbackMessage))
      }, 50)
      clearAuthQuery()
      return
    }

    if (query.get('expired') === '1') {
      setAuthNotice(expiredMessage)
      window.setTimeout(() => {
        toast.error(expiredMessage)
      }, 50)
      clearAuthQuery()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dismissAuthNotice = () => {
    setAuthNotice('')
  }

  return {
    authNotice,
    dismissAuthNotice,
  }
}
