import { createRouter, createWebHistory } from 'vue-router'
import { clearAuthIntent, isAdminAuthToken, peekAuthIntent } from '@/lib/auth'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/cat/:id',
      name: 'cat-detail',
      component: () => import('@/views/CatDetailView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/views/AdminLoginView.vue'),
    },
    {
      path: '/admin/forbidden',
      name: 'admin-auth-forbidden',
      component: () => import('@/views/AdminAuthForbiddenView.vue'),
    },
    {
      path: '/forbidden',
      name: 'forbidden',
      component: () => import('@/views/ForbiddenView.vue'),
    },
    {
      path: '/userCenter',
      name: 'userCenter',
      component: () => import('@/views/UserCenterView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/editProfile',
      name: 'editProfile',
      component: () => import('@/views/EditProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/adopt',
      name: 'adopt',
      component: () => import('@/views/AdoptView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/sos',
      name: 'sos',
      component: () => import('@/views/SOSView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/ranking/:type',
      name: 'ranking',
      component: () => import('@/views/LeaderboardView.vue'),
    },
    {
      path: '/post',
      name: 'post-moment',
      component: () => import('@/views/PostMomentView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/new-cat',
      name: 'new-cat',
      component: () => import('@/views/NewCatView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/my-adoptions',
      name: 'my-adoptions',
      component: () => import('@/views/MyAdoptionView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/my-sos',
      name: 'my-sos',
      component: () => import('@/views/MySOSView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/checkin-history',
      name: 'checkin-history',
      component: () => import('@/views/CheckinHistoryView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('@/views/NotificationView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/announcements/:id',
      name: 'announcement-detail',
      component: () => import('@/views/AnnouncementDetailView.vue'),
    },
    {
      path: '/admin',
      component: () => import('@/components/layout/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        {
          path: '',
          redirect: '/admin/dashboard',
        },
        {
          path: 'dashboard',
          name: 'admin-dashboard',
          component: () => import('@/views/admin/AdminDashboardView.vue'),
        },
        {
          path: 'sos',
          name: 'admin-sos',
          component: () => import('@/views/admin/AdminSOSView.vue'),
        },
        {
          path: 'cats',
          name: 'admin-cats',
          component: () => import('@/views/admin/AdminCatView.vue'),
        },
        {
          path: 'cats/:id',
          name: 'admin-cat-detail',
          component: () => import('@/views/admin/AdminCatDetailView.vue'),
        },
        {
          path: 'adoptions',
          name: 'admin-adoptions',
          component: () => import('@/views/admin/AdminAdoptionView.vue'),
        },
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('@/views/admin/AdminUserView.vue'),
        },
        {
          path: 'users/:id',
          name: 'admin-user-detail',
          component: () => import('@/views/admin/AdminUserDetailView.vue'),
        },
        {
          path: 'new-cats',
          name: 'admin-new-cats',
          component: () => import('@/views/admin/AdminNewCatView.vue'),
        },
        {
          path: 'announcements',
          name: 'admin-announcements',
          component: () => import('@/views/admin/AdminAnnouncementView.vue'),
        },
      ],
    },
  ],
})

const getSafeRedirect = (value: unknown, fallback = '/') => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return fallback
  }
  return value
}

router.beforeEach(async (to) => {
  const userStore = useUserStore()
  const accessToken = typeof to.query.meow_token === 'string' ? to.query.meow_token : ''
  const refreshToken = typeof to.query.meow_refresh_token === 'string'
    ? to.query.meow_refresh_token
    : undefined

  if (accessToken) {
    const cleanQuery = { ...to.query }
    delete cleanQuery.meow_token
    delete cleanQuery.meow_refresh_token

    const storedRedirect = sessionStorage.getItem('authRedirect')
    const authIntent = peekAuthIntent()
    const tokenIsAdmin = isAdminAuthToken(accessToken)
    const pendingRedirect = getSafeRedirect(
      storedRedirect,
      tokenIsAdmin || authIntent === 'admin' ? '/admin/dashboard' : '/',
    )
    const callbackTarget = to.path === '/' ? pendingRedirect : to.path
    const isAdminAuthentication = tokenIsAdmin
      || authIntent === 'admin'
      || pendingRedirect.startsWith('/admin')
      || callbackTarget.startsWith('/admin')
    const resolvedPath = isAdminAuthentication
      ? (callbackTarget.startsWith('/admin') ? callbackTarget : '/admin/dashboard')
      : callbackTarget
    const cleanTarget = {
      path: resolvedPath,
      query: resolvedPath === to.path ? cleanQuery : {},
      hash: resolvedPath === to.path ? to.hash : '',
      replace: true,
    }

    try {
      await userStore.completeSduLogin(
        accessToken,
        refreshToken,
        isAdminAuthentication ? 'admin' : 'user',
      )
      sessionStorage.removeItem('authRedirect')
      clearAuthIntent()
      window.history.replaceState(window.history.state, '', router.resolve(cleanTarget).href)
      return cleanTarget
    } catch (error) {
      console.error('SDU authentication callback failed', error)
      sessionStorage.removeItem('authRedirect')
      clearAuthIntent()
      const loginPath = isAdminAuthentication ? '/admin/login' : '/login'
      const message = error instanceof Error ? error.message : ''
      const authError = /权限|forbidden|not[_ -]?admin|管理员会话|用户会话/i.test(message)
        ? 'forbidden'
        : 'sdu'
      return {
        path: loginPath,
        query: { authError, redirect: pendingRedirect },
        replace: true,
      }
    }
  }

  if (!to.meta.requiresAuth) {
    return true
  }

  if (to.meta.requiresAdmin) {
    const adminAccess = await userStore.ensureAdminAccess()
    if (adminAccess === 'expired') {
      return {
        path: '/admin/login',
        query: { redirect: to.fullPath },
        replace: true,
      }
    }

    if (adminAccess === 'denied') {
      return {
        path: '/forbidden',
        query: { from: to.fullPath },
        replace: true,
      }
    }

    return true
  }

  const hasSession = await userStore.restoreSession()
  if (!hasSession) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
      replace: true,
    }
  }

  return true
})

export default router
