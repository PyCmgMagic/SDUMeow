import { nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@/lib/toast'

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
  const route = useRoute()
  const router = useRouter()
  const authNotice = ref('')

  const messages: Record<string, string> = Object.fromEntries(
    Object.entries(options.messages ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )

  const fallbackMessage = options.fallbackMessage ?? '统一认证失败，请重试'
  const expiredMessage = options.expiredMessage ?? '登录已过期，请重新登录'

  const clearAuthQuery = () => {
    const query = route.query.redirect ? { redirect: String(route.query.redirect) } : {}
    void router.replace({ path: options.loginPath, query })
  }

  const showAuthFeedback = async (message: string) => {
    authNotice.value = message
    await nextTick()
    window.setTimeout(() => {
      toast.error(message)
    }, 50)
  }

  onMounted(() => {
    const authError = typeof route.query.authError === 'string' ? route.query.authError.trim() : ''
    if (authError) {
      void showAuthFeedback(resolveAuthErrorMessage(authError, messages, fallbackMessage))
      clearAuthQuery()
      return
    }

    if (route.query.expired === '1') {
      void showAuthFeedback(expiredMessage)
      clearAuthQuery()
    }
  })

  const dismissAuthNotice = () => {
    authNotice.value = ''
  }

  return {
    authNotice,
    dismissAuthNotice,
  }
}
