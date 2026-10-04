<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@/lib/toast'
import { Eye, EyeOff, GraduationCap, LoaderCircle, LogIn, ShieldAlert, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthQueryFeedback } from '@/composables/useAuthQueryFeedback'
import { useUserStore } from '@/stores/user'
import { getSduAuthUrl, setAuthIntent } from '@/lib/auth'
import logo from '@/assets/brand/catmap-logo.png'

const router = useRouter()
const route = useRoute()
const sduLoading = ref(false)
const passwordLoading = ref(false)
const showPassword = ref(false)
const form = ref({ email: '', password: '' })
const userStore = useUserStore()

const { authNotice, dismissAuthNotice } = useAuthQueryFeedback({
  loginPath: '/login',
  fallbackMessage: '统一认证登录失败，请重试',
  expiredMessage: '登录已过期，请重新登录',
  messages: {
    sdu: '统一认证登录失败，请重试',
    forbidden: '当前账号无访问权限',
    '403': '当前账号无访问权限',
    not_admin: '当前账号无管理员权限，请改用管理员入口登录',
  },
})

const safeRedirect = () => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  return redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
}

const handleSduLogin = () => {
  sduLoading.value = true
  setAuthIntent('user', safeRedirect())
  window.location.assign(getSduAuthUrl('user'))
}

const handlePasswordLogin = async () => {
  const email = form.value.email.trim()
  if (!email || !form.value.password) {
    toast.warning('请输入邮箱和密码')
    return
  }
  passwordLoading.value = true
  try {
    await userStore.login({ email, password: form.value.password })
    toast.success('登录成功')
    await router.push(safeRedirect())
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '登录失败，请检查邮箱和密码')
  } finally {
    passwordLoading.value = false
  }
}

const goVisitor = () => router.push('/')
const goAdminLogin = () => router.push({ path: '/admin/login', query: { redirect: '/admin/dashboard' } })
</script>

<template>
  <main class="auth-page auth-login-page">
    <section class="auth-card auth-card-login" aria-labelledby="login-title">
      <header class="auth-card-header">
        <img :src="logo" alt="SDU Meow" class="auth-logo" />
        <p class="auth-eyebrow">SDU MEOW / CAMPUS CAT DIRECTORY</p>
        <h1 id="login-title" class="auth-title">Hello，校友！</h1>
        <p class="auth-subtitle">欢迎回到山大猫猫图鉴</p>
      </header>

      <div class="auth-card-body">
        <div
          v-if="authNotice"
          class="mb-4 flex items-start gap-3 border-2 border-black bg-[#FEE2E2] px-3 py-3 text-left text-sm leading-6 text-[#7F1D1D]"
          role="alert"
        >
          <ShieldAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p class="min-w-0 flex-1 font-medium">{{ authNotice }}</p>
          <button
            type="button"
            class="shrink-0 text-[#7F1D1D] hover:text-black"
            aria-label="关闭提示"
            @click="dismissAuthNotice"
          >
            <X class="size-4" />
          </button>
        </div>

        <Button type="button" class="auth-sdu-button" :disabled="sduLoading || passwordLoading" @click="handleSduLogin">
          <LoaderCircle v-if="sduLoading" data-icon="inline-start" class="animate-spin" />
          <GraduationCap v-else data-icon="inline-start" />
          {{ sduLoading ? '正在前往统一认证...' : '山东大学统一认证' }}
        </Button>

        <div class="auth-divider">邮箱密码登录</div>
        <form class="auth-form-fields" @submit.prevent="handlePasswordLogin">
          <label class="auth-field" for="user-login-email">
            <span>山大邮箱</span>
            <Input id="user-login-email" v-model="form.email" type="email" autocomplete="username" placeholder="请输入山大邮箱" class="auth-input" :disabled="passwordLoading || sduLoading" />
          </label>
          <label class="auth-field" for="user-login-password">
            <span>密码</span>
            <div class="auth-input-with-action">
              <Input id="user-login-password" v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="请输入密码" class="auth-input pr-12" :disabled="passwordLoading || sduLoading" />
              <button type="button" class="auth-input-action" :aria-label="showPassword ? '隐藏密码' : '显示密码'" :disabled="passwordLoading || sduLoading" @click="showPassword = !showPassword">
                <EyeOff v-if="showPassword" /><Eye v-else />
              </button>
            </div>
          </label>
          <Button type="submit" class="auth-submit-button" :disabled="sduLoading || passwordLoading">
            <LoaderCircle v-if="passwordLoading" data-icon="inline-start" class="animate-spin" />
            <LogIn v-else data-icon="inline-start" />
            {{ passwordLoading ? '登录中...' : '邮箱密码登录' }}
          </Button>
        </form>

        <Button type="button" variant="outline" class="auth-secondary-button" :disabled="sduLoading || passwordLoading" @click="goAdminLogin">
          管理员入口
        </Button>

        <div class="auth-footer-links">
          <button type="button" class="auth-text-button" @click="goVisitor">游客登录</button>
        </div>
      </div>
    </section>
  </main>
</template>
