<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Siren, Trophy } from 'lucide-vue-next'

const router = useRouter()

const shortcuts = [
  {
    id: 1,
    title: '\u5c01\u795e\u699c',
    desc: '\u4eba\u6c14\u732b\u54aa\u6392\u884c',
    path: '/ranking/popularity',
    icon: Trophy,
    iconClass: 'public-shortcut-icon-rank',
  },
  {
    id: 2,
    title: '\u7d27\u6025 SOS',
    desc: '\u4f24\u75c5\u5feb\u901f\u4e0a\u62a5',
    path: '/sos',
    icon: Siren,
    iconClass: 'public-shortcut-icon-sos',
  },
]

const handleShortcutClick = (path: string) => router.push(path)
</script>

<template>
  <div class="grid w-full grid-cols-1 gap-8 md:grid-cols-2">
    <button
      v-for="item in shortcuts"
      :key="item.id"
      type="button"
      class="public-card public-shortcut-card group flex min-h-44 flex-col items-center justify-center p-6 text-center transition-all duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      @click="handleShortcutClick(item.path)"
    >
      <div
        class="public-shortcut-icon mb-4 flex size-14 items-center justify-center transition-transform duration-200 group-hover:scale-110"
        :class="item.iconClass"
      >
        <component :is="item.icon" class="size-6" aria-hidden="true" />
      </div>
      <h3 class="mb-2 text-base font-semibold text-gray-800">{{ item.title }}</h3>
      <p class="text-center text-xs text-gray-500">{{ item.desc }}</p>
    </button>
  </div>
</template>
