<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api'
import { state } from '../store'
import PostCard from '../components/PostCard.vue'
import UserAvatar from '../components/UserAvatar.vue'
import { formatDate, formatNumber } from '../utils/format'

const route = useRoute()
const user = ref(null)
const posts = ref([])
const loading = ref(true)
const error = ref('')

const isMe = computed(() => user.value && state.user && state.user.username === user.value.username)

async function load(username) {
  loading.value = true
  error.value = ''
  try {
    const [profile, list] = await Promise.all([
      api.get(`/api/users/${encodeURIComponent(username)}`),
      api.get(`/api/users/${encodeURIComponent(username)}/posts?pageSize=50`)
    ])
    user.value = profile.user
    posts.value = list.items
  } catch (err) {
    error.value = err.message
    user.value = null
    posts.value = []
  } finally {
    loading.value = false
  }
}

watch(() => route.params.username, (value) => value && load(value), { immediate: true })
</script>

<template>
  <div class="container page">
    <div v-if="loading" class="skeleton" style="min-height: 180px"></div>

    <div v-else-if="error" class="empty">
      <div class="empty-title">{{ error }}</div>
      <router-link class="btn btn-sm" style="margin-top: 12px" to="/users">看看其他博主</router-link>
    </div>

    <template v-else-if="user">
      <div class="profile-head">
        <UserAvatar :src="user.avatar" :name="user.displayName" :size="92" />
        <div style="flex: 1; min-width: 240px">
          <h1 class="page-title">{{ user.displayName }}</h1>
          <p class="faint small" style="margin-top: 4px">@{{ user.username }} · 加入于 {{ formatDate(user.createdAt) }}</p>
          <p class="muted" style="margin-top: 12px; max-width: 560px">{{ user.bio || '这个人还没有写简介。' }}</p>
        </div>
        <div class="stack" style="gap: 10px">
          <div class="row" style="gap: 26px">
            <div>
              <div class="hero-stat-value">{{ formatNumber(user.postCount) }}</div>
              <div class="hero-stat-label">篇文章</div>
            </div>
            <div>
              <div class="hero-stat-value">{{ formatNumber(user.viewCount) }}</div>
              <div class="hero-stat-label">次阅读</div>
            </div>
          </div>
          <div class="row">
            <router-link v-if="isMe" class="btn btn-primary btn-sm" to="/write">写新文章</router-link>
            <router-link v-if="isMe" class="btn btn-sm" to="/me">我的博客</router-link>
            <button v-if="isMe" class="btn btn-sm" @click="$router.push('/me/settings')">编辑资料</button>
          </div>
        </div>
      </div>

      <div class="section-head" style="margin-top: 34px">
        <h2 class="section-title">{{ isMe ? '我写的文章' : '他/她写的文章' }}</h2>
        <span class="faint small">{{ posts.length }} 篇公开文章</span>
      </div>

      <div v-if="posts.length" class="grid grid-3">
        <PostCard v-for="post in posts" :key="post.id" :post="post" :show-author="false" />
      </div>
      <div v-else class="empty">
        <div class="empty-title">还没有公开的文章</div>
        <p v-if="isMe">
          你可以在<router-link to="/write">写文章</router-link>里发布第一篇，草稿只有自己能看到。
        </p>
        <p v-else>再等等，或者去<router-link to="/explore">文章列表</router-link>看看别人写的。</p>
      </div>
    </template>
  </div>
</template>
