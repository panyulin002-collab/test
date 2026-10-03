import { reactive } from 'vue'
import { api } from './api'
import { site as siteInfo } from './site'

export const state = reactive({
  /** 当前登录用户，未登录为 null */
  user: null,
  /** 会话是否已经查询过 */
  ready: false,
  /** 站点信息与统计 */
  site: {
    name: siteInfo.name,
    description: siteInfo.description,
    registrationOpen: true,
    stats: { users: 0, posts: 0, views: 0 },
    limits: { imageMB: 10, videoMB: 300 }
  }
})

export async function loadSite() {
  try {
    const data = await api.get('/api/site')
    Object.assign(state.site, data)
  } catch {
    /* 站点信息拿不到不影响使用 */
  }
}

export async function loadSession() {
  try {
    const data = await api.get('/api/auth/session')
    state.user = data?.user || null
  } catch {
    state.user = null
  } finally {
    state.ready = true
  }
}

export async function login(username, password) {
  const data = await api.post('/api/auth/login', { username, password })
  state.user = data.user
  return data.user
}

export async function register(payload) {
  const data = await api.post('/api/auth/register', payload)
  state.user = data.user
  return data.user
}

export async function logout() {
  try {
    await api.post('/api/auth/logout', {})
  } finally {
    state.user = null
  }
}

export function setUser(user) {
  if (user) state.user = { ...state.user, ...user }
}

/** 主题切换 */
export function currentTheme() {
  return document.documentElement.dataset.theme || 'light'
}

export function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = next
  try {
    localStorage.setItem('blog-theme', next)
  } catch {
    /* 隐私模式下写入会失败，忽略 */
  }
}
