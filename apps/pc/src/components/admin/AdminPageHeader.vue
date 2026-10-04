<script setup lang="ts">
import type { Component } from 'vue'

type HeaderTone = 'yellow' | 'mint' | 'gray'

withDefaults(defineProps<{
  eyebrow: string
  title: string
  description: string
  icon: Component
  tone?: HeaderTone
}>(), {
  tone: 'yellow'
})

const toneClasses: Record<HeaderTone, string> = {
  yellow: 'admin-page-header-icon-yellow bg-[#FACC15]',
  mint: 'admin-page-header-icon-mint bg-[#5CD6C2]',
  gray: 'admin-page-header-icon-gray bg-[#F3F4F6]'
}
</script>

<template>
  <header class="admin-page-header flex flex-col gap-4 border-b-2 border-black pb-5 lg:flex-row lg:items-end lg:justify-between">
    <div class="flex items-start gap-4">
      <div
        class="admin-page-header-icon flex size-12 shrink-0 items-center justify-center border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)]"
        :class="toneClasses[tone]"
      >
        <component :is="icon" class="size-6" aria-hidden="true" />
      </div>
      <div class="min-w-0">
        <p class="admin-page-eyebrow text-sm font-bold text-gray-500">{{ eyebrow }}</p>
        <h1 class="admin-page-title mt-1 text-2xl font-black text-gray-950">{{ title }}</h1>
        <p class="admin-page-description mt-2 text-sm text-gray-600">{{ description }}</p>
      </div>
    </div>
    <div v-if="$slots.action || $slots.summary" class="admin-page-actions flex flex-wrap items-center gap-3 self-start lg:self-auto">
      <slot name="summary" />
      <slot name="action" />
    </div>
  </header>
</template>
