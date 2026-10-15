import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../lib/supabase'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/board/:id',
    name: 'Board',
    component: () => import('../views/BoardView.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Guard: redirect ke login kalau belum authenticated
router.beforeEach(async (to, from, next) => {
  if (!supabase) {
    if (to.meta.requiresAuth) {
      return next('/login')
    }

    return next()
  }

  const { data: { session } } = await supabase.auth.getSession()

  if (to.meta.requiresAuth && !session) {
    return next('/login')
  }

  if (to.name === 'Login' && session) {
    return next('/')
  }

  return next()
})

export default router