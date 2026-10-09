import { toast as sonnerToast } from 'sonner'

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

// 与原 vue-sonner 版一致：包装函数 + 拷贝 sonner 的方法，最后覆盖 error。
// 不能把 error 直接 assign 到 sonnerToast 上——那会让本文件的 error 递归调用自己。
const toastProxy = ((...args: Parameters<typeof sonnerToast>) => sonnerToast(...args)) as typeof sonnerToast

export const toast = Object.assign(toastProxy, sonnerToast, { error })
