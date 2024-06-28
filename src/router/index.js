import { createRouter, createWebHashHistory } from 'vue-router'
import Style from '@/views/StyleView.vue'
import Home from '@/views/HomeView.vue'

const routes = [
  {
    meta: {
      title: 'Select style',
      requiresAuth: true
    },
    path: '/',
    name: 'style',
    component: Style
  },
  {
    // Document title tag
    // We combine it with defaultDocumentTitle set in `src/main.js` on router.afterEach hook
    meta: {
      title: 'Dashboard',
      requiresAuth: true
    },
    path: '/dashboard',
    name: 'dashboard',
    component: Home
  },
  {
    meta: {
      title: 'Users',
      requiresAuth: true
    },
    path: '/users',
    name: 'users',
    component: () => import('@/views/UsersView.vue')
  },
  {
    meta: {
      title: 'Models',
      requiresAuth: true
    },
    path: '/models',
    name: 'models',
    component: () => import('@/views/ModelsView.vue')
  },
  {
    meta: {
      title: 'Platforms',
      requiresAuth: true
    },
    path: '/platforms',
    name: 'platforms',
    component: () => import('@/views/PlatformsView.vue')
  },
  {
    meta: {
      title: 'Message'
    },
    path: '/message',
    name: 'message',
    component: () => import('@/views/MessageView.vue')
  },
  {
    meta: {
      title: 'Post'
    },
    path: '/posts',
    name: 'posts',
    component: () => import('@/views/PostView.vue')
  },
  {
    meta: {
      title: 'Tables'
    },
    path: '/tables',
    name: 'tables',
    component: () => import('@/views/TablesView.vue')
  },
  {
    meta: {
      title: 'Forms'
    },
    path: '/forms',
    name: 'forms',
    component: () => import('@/views/FormsView.vue')
  },
  {
    meta: {
      title: 'Profile',
      requiresAuth: true
    },
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/ProfileView.vue')
  },
  {
    meta: {
      title: 'Ui'
    },
    path: '/ui',
    name: 'ui',
    component: () => import('@/views/UiView.vue')
  },
  {
    meta: {
      title: 'Responsive layout'
    },
    path: '/responsive',
    name: 'responsive',
    component: () => import('@/views/ResponsiveView.vue')
  },
  {
    meta: {
      title: 'Login'
    },
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue')
  },
  {
    meta: {
      title: 'Error'
    },
    path: '/error',
    name: 'error',
    component: () => import('@/views/ErrorView.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 }
  }
})

router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const isAuthenticated = localStorage.getItem('access_token')
  if (requiresAuth && !isAuthenticated) {
    next('login') // Redirect to login if authentication is required and user is not authenticated
  } else {
    next()
  }
})
export default router
