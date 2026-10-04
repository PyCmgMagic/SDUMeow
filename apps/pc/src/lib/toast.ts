import { toast as sonnerToast } from 'vue-sonner'

type ToastErrorArgs = Parameters<typeof sonnerToast.error>

const normalizeToastKey = (message: ToastErrorArgs[0]) => {
  if (typeof message !== 'string') return undefined
  return `error:${message.trim().toLowerCase().replace(/\s+/g, ' ')}`
}

const error = (...args: ToastErrorArgs) => {
  const [message, options] = args
  return sonnerToast.error(message, {
    ...options,
    id: options?.id ?? normalizeToastKey(message),
  })
}

const toastProxy = ((...args: Parameters<typeof sonnerToast>) => sonnerToast(...args)) as typeof sonnerToast

export const toast = Object.assign(toastProxy, sonnerToast, { error })
