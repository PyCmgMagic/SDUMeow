<script setup lang="ts">
import { ShieldX } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'

const router = useRouter()
</script>

<template>
  <section class="flex min-h-[60vh] items-center justify-center">
    <div class="max-w-md text-center">
      <ShieldX class="mx-auto mb-5 h-14 w-14 text-red-600" />
      <h1 class="text-2xl font-bold text-gray-900">无权访问管理后台</h1>
      <p class="mt-3 text-sm text-gray-500">当前账号没有管理员权限。</p>
      <Button class="mt-6" @click="router.push('/')">返回首页</Button>
    </div>
  </section>
</template>
