<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login } from '../store'
import { toast } from '../composables/toast'

const router = useRouter()
const route = useRoute()

const username = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function onSubmit() {
  error.value = ''
  busy.value = true
  try {
    const user = await login(username.value.trim(), password.value)
    toast(`欢迎回来，${user.displayName}`)
    router.push(String(route.query.redirect || '/me'))
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="container page">
    <div style="max-width: 420px; margin: 20px auto">
      <h1 class="page-title center">登录</h1>
      <p class="page-desc center" style="margin-bottom: 22px">登录后就能写文章、管理自己的博客</p>

      <form class="card card-pad stack" @submit.prevent="onSubmit">
        <div v-if="route.query.need" class="alert-success alert">这个页面需要登录后才能访问</div>
        <div v-if="error" class="alert">{{ error }}</div>

        <div class="field">
          <label class="field-label">用户名</label>
          <input v-model="username" class="input" autocomplete="username" placeholder="注册时填的用户名" required />
        </div>

        <div class="field">
          <label class="field-label">密码</label>
          <input v-model="password" class="input" type="password" autocomplete="current-password" required />
        </div>

        <button class="btn btn-primary" type="submit" :disabled="busy">
          {{ busy ? '登录中…' : '登录' }}
        </button>

        <p class="center small muted">
          还没有账号？<router-link to="/register" style="color: var(--brand)">立即注册</router-link>
        </p>
      </form>
    </div>
  </div>
</template>
