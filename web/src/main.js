import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { loadSession, loadSite, state } from './store'
import './styles/main.css'
import 'highlight.js/styles/atom-one-dark.css'

// 先把登录状态和站点信息拿到，再挂载，避免导航栏闪一下未登录
await Promise.all([loadSession(), loadSite()])

createApp(App).use(router).mount('#app')

// 每个页面都能拿到当前用户
window.__blogState = state
