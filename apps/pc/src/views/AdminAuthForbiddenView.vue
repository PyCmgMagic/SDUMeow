<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ShieldAlert } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const router = useRouter()

const goAdminLogin = () => {
  void router.push({ name: 'admin-login' })
}

const goUserLogin = () => {
  void router.push({ name: 'login' })
}
</script>

<template>
  <main class="auth-page auth-login-page">
    <section
      class="auth-card auth-card-login mx-auto w-full max-w-md border-2 border-black bg-white p-7 text-center shadow-[6px_6px_0_rgba(0,0,0,1)]"
      role="alert"
      aria-labelledby="admin-auth-forbidden-title"
    >
      <div class="mb-3 inline-block border-2 border-black bg-[#FEE2E2] px-2.5 py-1 text-xs font-extrabold tracking-wider text-[#B91C1C]">
        HTTP 403
      </div>
      <ShieldAlert class="mx-auto mb-3 size-10 text-[#B91C1C]" aria-hidden="true" />
      <h1 id="admin-auth-forbidden-title" class="text-2xl font-black text-gray-950">
        无管理员访问权限
      </h1>
      <p class="mt-3 text-sm leading-7 text-gray-500">
        当前统一认证账号没有管理后台权限，无法完成管理员登录。如需开通权限，请联系系统管理员。
      </p>
      <div class="mt-6 grid gap-2.5">
        <Button
          type="button"
          class="h-11 border-2 border-black bg-[#FACC15] font-extrabold text-black shadow-[3px_3px_0_rgba(0,0,0,1)] hover:bg-[#EAB308]"
          @click="goAdminLogin"
        >
          返回管理员登录
        </Button>
        <Button
          type="button"
          variant="outline"
          class="h-11 border-2 border-black bg-white font-bold text-black shadow-[3px_3px_0_rgba(0,0,0,1)] hover:bg-gray-50"
          @click="goUserLogin"
        >
          返回用户登录
        </Button>
      </div>
    </section>
  </main>
</template>
