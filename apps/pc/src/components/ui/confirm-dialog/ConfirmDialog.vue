<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, HelpCircle } from 'lucide-vue-next'

interface Props {
  open: boolean
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger' | 'warning'
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  title: '确认操作',
  description: '确定要执行此操作吗？',
  confirmText: '确定',
  cancelText: '取消',
  variant: 'default',
  loading: false
})

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
  emit('update:open', false)
}

const variantStyles = {
  default: {
    icon: HelpCircle,
    iconClass: 'text-blue-500 bg-blue-50',
    buttonClass: 'bg-blue-500 hover:bg-blue-600 text-white'
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-orange-500 bg-orange-50',
    buttonClass: 'bg-orange-500 hover:bg-orange-600 text-white'
  },
  danger: {
    icon: AlertTriangle,
    iconClass: 'text-red-500 bg-red-50',
    buttonClass: 'bg-red-500 hover:bg-red-600 text-white'
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="admin-dialog theme-confirm-dialog sm:max-w-[400px]">
      <DialogHeader class="admin-confirm-dialog-header theme-confirm-dialog-header flex flex-row items-start gap-4">
        <div 
          class="theme-confirm-dialog-icon w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          :class="variantStyles[variant].iconClass"
        >
          <component :is="variantStyles[variant].icon" class="w-5 h-5" />
        </div>
        <div class="flex flex-col gap-1">
          <DialogTitle class="text-lg">{{ title }}</DialogTitle>
          <DialogDescription class="text-sm text-gray-500">
            {{ description }}
          </DialogDescription>
        </div>
      </DialogHeader>
      
      <DialogFooter class="admin-confirm-dialog-footer theme-confirm-dialog-footer mt-4 gap-2 sm:gap-2">
        <Button 
          variant="outline" 
          class="theme-confirm-dialog-cancel"
          @click="handleCancel"
          :disabled="loading"
        >
          {{ cancelText }}
        </Button>
        <Button 
          @click="handleConfirm"
          :disabled="loading"
          :class="['theme-confirm-dialog-confirm', variantStyles[variant].buttonClass]"
        >
          {{ loading ? '处理中...' : confirmText }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
