<script setup lang="ts">
defineProps<{
  title?: string
  meta?: string
}>()
</script>

<template>
  <section class="admin-panel overflow-hidden border-2 border-black bg-white shadow-[5px_5px_0px_rgba(0,0,0,1)]">
    <div
      v-if="title || meta || $slots.toolbar"
      class="admin-panel-header flex min-h-12 items-center justify-between gap-4 border-b-2 border-black bg-[#F3F4F6] px-5 py-3"
    >
      <h2 v-if="title" class="admin-panel-title text-sm font-black text-gray-900">{{ title }}</h2>
      <div class="ml-auto flex items-center gap-3">
        <span v-if="meta" class="admin-panel-meta text-xs font-bold text-gray-500">{{ meta }}</span>
        <slot name="toolbar" />
      </div>
    </div>
    <slot />
    <div v-if="$slots.footer" class="admin-panel-footer border-t-2 border-black bg-[#F3F4F6]">
      <slot name="footer" />
    </div>
  </section>
</template>
