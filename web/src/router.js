import { createRouter, createWebHistory } from 'vue-router'
import { state } from './store'
import { site } from './site'

const routes = [
  { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
  { path: '/explore', name: 'explore', component: () => import('./views/ExploreView.vue') },
  { path: '/users', name: 'users', component: () => import('./views/UsersView.vue') },
  { path: '/about', name: 'about', component: () => import('./views/AboutView.vue') },
  { path: '/login', name: 'login', component: () => import('./views/LoginView.vue') },
  { path: '/register', name: 'register', component: () => import('./views/RegisterView.vue') },
  { path: '/u/:username', name: 'user', component: () => import('./views/UserProfileView.vue') },
  { path: '/u/:username/:slug', name: 'post', component: () => import('./views/PostView.vue') },
  {
    path: '/me',
    name: 'dashboard',
    component: () => import('./views/DashboardView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/me/settings',
    name: 'settings',
    component: () => import('./views/SettingsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/write',
    name: 'write',
    component: () => import('./views/EditorView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/write/:id',
    name: 'edit',
    component: () => import('./views/EditorView.vue'),
    meta: { requiresAuth: true }
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('./views/NotFoundView.vue') }
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    if (to.path === from.path) return {}
    return { top: 0 }
  }
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !state.user) {
    return { name: 'login', query: { redirect: to.fullPath, need: '1' } }
  }
  return true
})

router.afterEach((to) => {
  const titles = {
    home: '',
    explore: '全部文章',
    users: '博主',
    about: '关于',
    login: '登录',
    register: '注册',
    dashboard: '我的博客',
    settings: '设置',
    write: '写文章',
    edit: '编辑文章'
  }
  const label = titles[to.name] || ''
  document.title = label ? `${label} · ${site.name}` : site.name
})
