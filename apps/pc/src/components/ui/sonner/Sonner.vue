<script lang="ts" setup>
import { Toaster as Sonner, type ToasterProps } from 'vue-sonner'
import { reactiveOmit } from '@vueuse/core'
import { 
  CircleCheckIcon, 
  InfoIcon, 
  Loader2Icon, 
  OctagonXIcon, 
  TriangleAlertIcon, 
  XIcon 
} from "lucide-vue-next"

const props = defineProps<ToasterProps>()
const delegatedProps = reactiveOmit(props, 'toastOptions', 'position')
</script>

<template>
  <Sonner
    class="toaster group"
    position="top-right"
    v-bind="delegatedProps"
    :toast-options="{
      classes: {
        toast: 'group toast group-[.toaster]:rounded-lg group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:flex group-[.toaster]:items-center group-[.toaster]:py-3 group-[.toaster]:px-4 group-[.toaster]:gap-3 group-[.toaster]:text-sm',
        description: 'group-[.toast]:text-muted-foreground',
        actionButton: 'group-[.toast]:rounded-md',
        cancelButton: 'group-[.toast]:rounded-md',
        closeButton: 'group-[.toast]:border-border group-[.toast]:bg-background group-[.toast]:text-foreground',
      }
    }"
  >
    <template #loading-icon>
      <Loader2Icon class="animate-spin" />
    </template>
    <template #success-icon>
      <CircleCheckIcon class="text-green-600" />
    </template>
    <template #warning-icon>
      <TriangleAlertIcon class="text-yellow-600" />
    </template>
    <template #info-icon>
      <InfoIcon class="text-blue-600" />
    </template>
    <template #error-icon>
      <OctagonXIcon class="text-red-600" />
    </template>
    <template #close-button>
      <XIcon />
    </template>
  </Sonner>
</template>
