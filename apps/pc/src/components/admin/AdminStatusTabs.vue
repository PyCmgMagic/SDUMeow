<script setup lang="ts">
type FilterValue = string | number | null
type FilterTone = 'yellow' | 'mint'

defineProps<{
  ariaLabel: string
  modelValue: FilterValue
  options: Array<{ label: string; value: FilterValue }>
  tone?: FilterTone
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FilterValue]
}>()

const selectedClasses: Record<FilterTone, string> = {
  yellow: 'admin-status-tab-yellow bg-[#FACC15] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]',
  mint: 'admin-status-tab-mint bg-[#5CD6C2] text-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'
}
</script>

<template>
  <div class="admin-status-tabs w-full overflow-x-auto border-2 border-black bg-gray-100 p-1 sm:w-auto" :aria-label="ariaLabel">
    <div class="flex min-w-max">
      <button
        v-for="option in options"
        :key="`${option.value}-${option.label}`"
        type="button"
        class="admin-status-tab min-h-9 shrink-0 px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
        :class="modelValue === option.value ? ['is-active', selectedClasses[tone || 'yellow']] : 'text-gray-600 hover:bg-white'"
        :aria-pressed="modelValue === option.value"
        @click="emit('update:modelValue', option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
