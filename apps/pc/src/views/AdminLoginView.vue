<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Eye, EyeOff, GraduationCap, LoaderCircle, ShieldAlert, ShieldCheck, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/lib/toast'
import { useAuthQueryFeedback } from '@/composables/useAuthQueryFeedback'
import { useUserStore } from '@/stores/user'
import { getSduAuthUrl, setAuthIntent } from '@/lib/auth'
import logo from '@/assets/brand/catmap-logo.png'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const form = ref({ email: '', password: '' })
const loading = ref(false)
const showPassword = ref(false)
const sduLoading = ref(false)

const { authNotice, dismissAuthNotice } = useAuthQueryFeedback({
  loginPath: '/admin/login',
  fallbackMessage: '管理员统一认证失败，请重试',
  expiredMessage: '管理员登录已过期，请重新认证',
  messages: {
    sdu: '统一认证失败，请重试或使用管理员邮箱密码登录',
    forbidden: '当前账号无管理员权限，无法进入管理后台',
    '403': '当前账号无管理员权限，无法进入管理后台',
    not_admin: '当前账号无管理员权限，无法进入管理后台',
  },
})

const safeRedirect = () => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/admin/dashboard'
  return redirect.startsWith('/admin') && !redirect.startsWith('//')
    ? redirect
    : '/admin/dashboard'
}

const handleLogin = async () => {
  const email = form.value.email.trim()
  if (!email || !form.value.password) {
    toast.warning('请输入管理员邮箱和密码')
    return
  }

  loading.value = true
  try {
    await userStore.adminLogin({ email, password: form.value.password })
    toast.success('管理员登录成功')
    await router.push(safeRedirect())
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '管理员登录失败，请检查账号和密码')
  } finally {
    loading.value = false
  }
}

const safeSduRedirect = () => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/admin/dashboard'
  return redirect.startsWith('/admin') && !redirect.startsWith('//') ? redirect : '/admin/dashboard'
}

const handleSduLogin = () => {
  sduLoading.value = true
  setAuthIntent('admin', safeSduRedirect())
  // The administrator CAS entry point sets the HttpOnly mode=admin cookie
  // before redirecting to the same CAS callback.
  window.location.assign(getSduAuthUrl('admin'))
}

const goBack = () => router.push('/login')
</script>

<template>
  <main class="auth-page auth-login-page">
    <section class="auth-card auth-card-login" aria-labelledby="admin-login-title">
      <header class="auth-card-header">
        <img :src="logo" alt="SDU Meow" class="auth-logo" />
        <p class="auth-eyebrow">SDU MEOW / ADMIN CONSOLE</p>
        <h1 id="admin-login-title" class="auth-title">管理员登录</h1>
        <p class="auth-subtitle">使用管理员账号进入管理后台</p>
      </header>

      <form class="auth-card-body" @submit.prevent="handleLogin">
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

        <div class="auth-form-fields">
          <label class="auth-field" for="admin-login-email">
            <span>管理员邮箱</span>
            <Input
              id="admin-login-email"
              v-model="form.email"
              type="email"
              autocomplete="username"
              maxlength="120"
              placeholder="请输入管理员邮箱"
              class="auth-input"
              :disabled="loading || sduLoading"
            />
          </label>

          <label class="auth-field" for="admin-login-password">
            <span>密码</span>
            <div class="auth-input-with-action">
              <Input
                id="admin-login-password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="请输入密码"
                class="auth-input pr-12"
                :disabled="loading || sduLoading"
              />
              <button
                type="button"
                class="auth-input-action"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                :disabled="loading || sduLoading"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" />
                <Eye v-else />
              </button>
            </div>
          </label>
        </div>

        <Button type="button" class="auth-sdu-button" :disabled="loading || sduLoading" @click="handleSduLogin">
          <LoaderCircle v-if="sduLoading" data-icon="inline-start" class="animate-spin" />
          <GraduationCap v-else data-icon="inline-start" />
          {{ sduLoading ? '正在前往统一认证...' : '管理员统一认证登录' }}
        </Button>

        <div class="auth-divider">管理员邮箱密码登录</div>
        <Button type="submit" class="auth-submit-button" :disabled="loading || sduLoading">
          <LoaderCircle v-if="loading" data-icon="inline-start" class="animate-spin" />
          <ShieldCheck v-else data-icon="inline-start" />
          {{ loading ? '正在登录...' : '进入管理后台' }}
        </Button>

        <div class="auth-footer-links">
          <button type="button" class="auth-text-button" :disabled="loading" @click="goBack">
            <ArrowLeft data-icon="inline-start" /> 返回统一认证
          </button>
        </div>
      </form>
    </section>
  </main>
</template>
