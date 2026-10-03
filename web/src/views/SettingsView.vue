<script setup>
import { onMounted, reactive, ref } from 'vue'
import { api } from '../api'
import { setUser, state } from '../store'
import { toast } from '../composables/toast'
import UserAvatar from '../components/UserAvatar.vue'

const profile = reactive({ displayName: '', bio: '', avatar: '' })
const password = reactive({ currentPassword: '', newPassword: '', confirm: '' })
const savingProfile = ref(false)
const savingPassword = ref(false)
const uploading = ref(false)
const progress = ref(0)
const avatarInput = ref(null)

onMounted(() => {
  profile.displayName = state.user?.displayName || ''
  profile.bio = state.user?.bio || ''
  profile.avatar = state.user?.avatar || ''
})

async function pickAvatar(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  uploading.value = true
  try {
    const data = await api.upload(file, (value) => (progress.value = value))
    profile.avatar = data.url
    toast('头像已上传，记得点保存')
  } catch (error) {
    toast(error.message, 'error')
  } finally {
    uploading.value = false
    progress.value = 0
  }
}

async function saveProfile() {
  savingProfile.value = true
  try {
    const data = await api.put('/api/me', {
      displayName: profile.displayName,
      bio: profile.bio,
      avatar: profile.avatar
    })
    setUser(data.user)
    toast('资料已保存')
  } catch (error) {
    toast(error.message, 'error')
  } finally {
    savingProfile.value = false
  }
}

async function savePassword() {
  if (password.newPassword !== password.confirm) {
    toast('两次输入的新密码不一致', 'error')
    return
  }
  savingPassword.value = true
  try {
    await api.put('/api/me', {
      displayName: profile.displayName,
      bio: profile.bio,
      avatar: profile.avatar,
      currentPassword: password.currentPassword,
      newPassword: password.newPassword
    })
    password.currentPassword = ''
    password.newPassword = ''
    password.confirm = ''
    toast('密码已更新')
  } catch (error) {
    toast(error.message, 'error')
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <div class="container page">
    <div class="page-head">
      <div>
        <h1 class="page-title">设置</h1>
        <p class="page-desc">用户名 @{{ state.user?.username }} 是主页地址，注册后不可修改</p>
      </div>
      <router-link class="btn" :to="`/u/${state.user?.username}`">看看我的主页</router-link>
    </div>

    <div class="grid grid-2">
      <section class="card card-pad stack">
        <h2 style="font-size: 17px">个人资料</h2>

        <div class="row" style="gap: 16px">
          <UserAvatar :src="profile.avatar" :name="profile.displayName" :size="72" />
          <div class="stack" style="gap: 8px">
            <div class="row">
              <button class="btn btn-sm" type="button" :disabled="uploading" @click="avatarInput?.click()">
                {{ uploading ? `上传中 ${progress}%` : '上传头像' }}
              </button>
              <button v-if="profile.avatar" class="btn btn-sm btn-ghost" type="button" @click="profile.avatar = ''">
                清除
              </button>
            </div>
            <p class="hint">建议正方形图片，最大 {{ state.site.limits.imageMB }} MB</p>
          </div>
          <input ref="avatarInput" type="file" accept="image/*" style="display: none" @change="pickAvatar" />
        </div>

        <div class="field">
          <label class="field-label">昵称</label>
          <input v-model="profile.displayName" class="input" maxlength="30" />
        </div>

        <div class="field">
          <label class="field-label">个人简介</label>
          <textarea
            v-model="profile.bio"
            class="textarea"
            rows="3"
            maxlength="300"
            placeholder="介绍一下自己，会显示在你的主页上"
          ></textarea>
        </div>

        <div class="row">
          <div class="spacer"></div>
          <button class="btn btn-primary" type="button" :disabled="savingProfile" @click="saveProfile">
            {{ savingProfile ? '保存中…' : '保存资料' }}
          </button>
        </div>
      </section>

      <section class="card card-pad stack">
        <h2 style="font-size: 17px">修改密码</h2>
        <p class="hint">改完密码后，其它设备上的登录状态仍然有效，需要重新登录才会用新密码。</p>

        <div class="field">
          <label class="field-label">当前密码</label>
          <input v-model="password.currentPassword" class="input" type="password" autocomplete="current-password" />
        </div>
        <div class="field">
          <label class="field-label">新密码</label>
          <input v-model="password.newPassword" class="input" type="password" autocomplete="new-password" placeholder="至少 6 位" />
        </div>
        <div class="field">
          <label class="field-label">确认新密码</label>
          <input v-model="password.confirm" class="input" type="password" autocomplete="new-password" />
        </div>

        <div class="row">
          <div class="spacer"></div>
          <button
            class="btn btn-primary"
            type="button"
            :disabled="savingPassword || !password.currentPassword || password.newPassword.length < 6"
            @click="savePassword"
          >
            {{ savingPassword ? '提交中…' : '更新密码' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
