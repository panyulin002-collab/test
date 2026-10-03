<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { register, state } from '../store'
import { toast } from '../composables/toast'

const router = useRouter()

const username = ref('')
const displayName = ref('')
const password = ref('')
const confirm = ref('')
const error = ref('')
const busy = ref(false)

const usernameOk = computed(() => /^[a-zA-Z0-9_-]{3,24}$/.test(username.value.trim()))
const passwordOk = computed(() => password.value.length >= 6)
const matched = computed(() => password.value === confirm.value && password.value !== '')
const canSubmit = computed(() => usernameOk.value && passwordOk.value && matched.value && displayName.value.trim())

async function onSubmit() {
  error.value = ''
  if (!canSubmit.value) return
  busy.value = true
  try {
    await register({
      username: username.value.trim(),
      displayName: displayName.value.trim(),
      password: password.value
    })
    toast('注册成功，开始写吧')
    router.push('/write')
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="container page">
    <div style="max-width: 440px; margin: 20px auto">
      <h1 class="page-title center">注册</h1>
      <p class="page-desc center" style="margin-bottom: 22px">
        注册后你会拥有 <code>/u/你的用户名</code> 这样的个人主页
      </p>

      <form class="card card-pad stack" @submit.prevent="onSubmit">
        <div v-if="!state.site.registrationOpen" class="alert">本站暂时关闭了注册</div>
        <div v-if="error" class="alert">{{ error }}</div>

        <div class="field">
          <label class="field-label">用户名（用来做主页地址）</label>
          <input v-model="username" class="input" placeholder="字母、数字、下划线，3-24 位" autocomplete="username" />
          <p v-if="username && !usernameOk" class="hint" style="color: var(--danger)">
            只能是 3-24 位的字母、数字、下划线或短横线
          </p>
          <p v-else-if="username" class="hint">你的主页：/u/{{ username.trim() }}</p>
        </div>

        <div class="field">
          <label class="field-label">昵称（显示在文章作者处）</label>
          <input v-model="displayName" class="input" placeholder="比如：一任阶前" />
        </div>

        <div class="field">
          <label class="field-label">密码</label>
          <input v-model="password" class="input" type="password" placeholder="至少 6 位" autocomplete="new-password" />
        </div>

        <div class="field">
          <label class="field-label">确认密码</label>
          <input v-model="confirm" class="input" type="password" autocomplete="new-password" />
          <p v-if="confirm && !matched" class="hint" style="color: var(--danger)">两次输入的密码不一致</p>
        </div>

        <button class="btn btn-primary" type="submit" :disabled="busy || !canSubmit">
          {{ busy ? '注册中…' : '创建账号' }}
        </button>

        <p class="center small muted">
          已经有账号了？<router-link to="/login" style="color: var(--brand)">去登录</router-link>
        </p>
      </form>
    </div>
  </div>
</template>
