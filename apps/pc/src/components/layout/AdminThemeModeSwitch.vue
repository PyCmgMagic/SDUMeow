<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { LayoutDashboard, Palette } from 'lucide-vue-next'
import { useThemeStore, type AdminTheme } from '@/stores/theme'

const themeStore = useThemeStore()
const { adminTheme } = storeToRefs(themeStore)

const modes: Array<{ value: AdminTheme; label: string; icon: typeof Palette }> = [
  { value: 'management', label: '线条', icon: LayoutDashboard },
  { value: 'campus', label: '柔和', icon: Palette }
]
</script>

<template>
  <section class="admin-theme-switcher" aria-label="管理员界面风格">
    <p class="admin-theme-label">界面风格</p>
    <div class="grid grid-cols-2 gap-1" role="group" aria-label="选择管理员界面风格">
      <button
        v-for="mode in modes"
        :key="mode.value"
        type="button"
        class="admin-theme-option"
        :class="adminTheme === mode.value && 'is-active'"
        :aria-pressed="adminTheme === mode.value"
        :title="`${mode.label}模式`"
        @click="themeStore.setAdminTheme(mode.value)"
      >
        <component :is="mode.icon" class="size-3.5" aria-hidden="true" />
        <span>{{ mode.label }}</span>
      </button>
    </div>
  </section>
</template>
