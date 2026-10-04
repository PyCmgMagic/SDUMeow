import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { AlertTriangle, HelpCircle } from 'lucide-react'

import { cn } from '@pc/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@pc/components/ui/dialog'
import { Button } from '@pc/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange?: (value: boolean) => void
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger' | 'warning'
  loading?: boolean
  onConfirm?: () => void
  onCancel?: () => void
}

const variantStyles = {
  default: {
    icon: HelpCircle,
    iconClass: 'text-blue-500 bg-blue-50',
    buttonClass: 'bg-blue-500 hover:bg-blue-600 text-white',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-orange-500 bg-orange-50',
    buttonClass: 'bg-orange-500 hover:bg-orange-600 text-white',
  },
  danger: {
    icon: AlertTriangle,
    iconClass: 'text-red-500 bg-red-50',
    buttonClass: 'bg-red-500 hover:bg-red-600 text-white',
  },
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = '确认操作',
  description = '确定要执行此操作吗？',
  confirmText = '确定',
  cancelText = '取消',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const Icon = variantStyles[variant].icon as (props: ComponentPropsWithoutRef<'svg'>) => ReactNode

  const handleConfirm = () => {
    onConfirm?.()
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange?.(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-dialog theme-confirm-dialog sm:max-w-[400px]">
        <DialogHeader className="admin-confirm-dialog-header theme-confirm-dialog-header flex flex-row items-start gap-4">
          <div
            className={cn(
              'theme-confirm-dialog-icon w-10 h-10 rounded-full flex items-center justify-center shrink-0',
              variantStyles[variant].iconClass,
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-lg">{title}</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">{description}</DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter className="admin-confirm-dialog-footer theme-confirm-dialog-footer mt-4 gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="theme-confirm-dialog-cancel"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className={cn('theme-confirm-dialog-confirm', variantStyles[variant].buttonClass)}
          >
            {loading ? '处理中...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
