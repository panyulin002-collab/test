<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { currentTheme, logout, state, toggleTheme } from '../store'
import UserAvatar from './UserAvatar.vue'
import { toast } from '../composables/toast'

const router = useRouter()
const route = useRoute()
const menuOpen = ref(false)
const theme = ref(currentTheme())
const keyword = ref('')
const menuRef = ref(null)

function onThemeClick() {
  toggleTheme()
  theme.value = currentTheme()
}

function onSearch() {
  const q = keyword.value.trim()
  router.push(q ? { name: 'explore', query: { q } } : { name: 'explore' })
}

async function onLogout() {
  menuOpen.value = false
  await logout()
  toast('已退出登录')
  router.push('/')
}

function onDocumentClick(event) {
  if (menuRef.value && !menuRef.value.contains(event.target)) menuOpen.value = false
}

watch(
  () => route.fullPath,
  () => (menuOpen.value = false)
)

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <header class="site-header">
    <div class="container header-inner">
      <router-link class="brand" to="/">
        <span class="brand-mark">{{ state.site.name.slice(0, 1) }}</span>
        <span>{{ state.site.name }}</span>
      </router-link>

      <nav class="nav">
        <router-link to="/">首页</router-link>
        <router-link to="/explore">文章</router-link>
        <router-link to="/users">博主</router-link>
        <router-link to="/about">关于</router-link>
      </nav>

      <div class="header-actions">
        <form class="row" style="gap: 0" @submit.prevent="onSearch">
          <input
            v-model="keyword"
            class="input"
            style="width: 150px; height: 36px"
            type="search"
            placeholder="搜索文章"
            aria-label="搜索文章"
          />
        </form>

        <button
          class="icon-btn"
          type="button"
          :title="theme === 'dark' ? '切换到浅色' : '切换到深色'"
          @click="onThemeClick"
        >
          <svg
            v-if="theme === 'dark'"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        </button>

        <template v-if="state.user">
          <router-link class="btn btn-primary btn-sm" to="/write">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            写文章
          </router-link>
          <div ref="menuRef" class="user-menu">
            <button class="user-trigger" type="button" @click="menuOpen = !menuOpen">
              <UserAvatar :src="state.user.avatar" :name="state.user.displayName" :size="28" />
            </button>
            <div v-if="menuOpen" class="dropdown">
              <div class="dropdown-head">
                <div style="font-weight: 600">{{ state.user.displayName }}</div>
                <div class="faint small">@{{ state.user.username }}</div>
              </div>
              <router-link :to="`/u/${state.user.username}`">我的主页</router-link>
              <router-link to="/me">我的博客</router-link>
              <router-link to="/write">写新文章</router-link>
              <router-link to="/me/settings">设置</router-link>
              <button class="danger-text" type="button" @click="onLogout">退出登录</button>
            </div>
          </div>
        </template>
        <template v-else>
          <router-link class="btn btn-sm" to="/login">登录</router-link>
          <router-link class="btn btn-primary btn-sm" to="/register">注册</router-link>
        </template>
      </div>
    </div>
  </header>
</template>
