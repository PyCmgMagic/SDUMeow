<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { LayoutDashboard, Palette } from 'lucide-vue-next'
import { useThemeStore, type PublicTheme } from '@/stores/theme'

const themeStore = useThemeStore()
const { publicTheme } = storeToRefs(themeStore)

const modes: Array<{ value: PublicTheme; label: string; icon: typeof Palette }> = [
  { value: 'classic', label: '柔和', icon: Palette },
  { value: 'admin', label: '线条', icon: LayoutDashboard }
]
</script>

<template>
  <section class="public-theme-switcher mx-3 mb-3 p-2" aria-label="界面风格">
    <p class="public-theme-label mb-2 px-1 text-xs font-semibold tracking-wide">界面风格</p>
    <div class="grid grid-cols-2 gap-1" role="group" aria-label="选择界面风格">
      <button
        v-for="mode in modes"
        :key="mode.value"
        type="button"
        class="public-theme-option flex min-h-9 items-center justify-center gap-1.5 px-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        :class="publicTheme === mode.value && 'is-active'"
        :aria-pressed="publicTheme === mode.value"
        :title="`${mode.label}模式`"
        @click="themeStore.setPublicTheme(mode.value)"
      >
        <component :is="mode.icon" class="size-3.5" />
        <span>{{ mode.label }}</span>
      </button>
    </div>
  </section>
</template>
