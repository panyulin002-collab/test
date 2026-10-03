<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../api'
import { state } from '../store'
import { site } from '../site'
import PostCard from '../components/PostCard.vue'
import UserCard from '../components/UserCard.vue'
import { formatNumber } from '../utils/format'

const posts = ref([])
const users = ref([])
const tags = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const [feed, userList, tagList] = await Promise.all([
      api.get('/api/posts?pageSize=6'),
      api.get('/api/users?limit=4'),
      api.get('/api/posts/tags')
    ])
    posts.value = feed.items
    users.value = userList.items
    tags.value = tagList.items.slice(0, 14)
  } catch {
    /* 首页加载失败时保持空列表 */
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="hero">
    <div class="container">
      <h1>{{ state.site.name }}</h1>
      <p class="hero-sub">{{ site.tagline }} —— {{ state.site.description }}</p>

      <div class="hero-actions">
        <router-link class="btn btn-primary btn-lg" :to="state.user ? '/write' : '/register'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {{ state.user ? '写一篇新文章' : '注册账号开始写作' }}
        </router-link>
        <router-link class="btn btn-lg" to="/explore">浏览全部文章</router-link>
        <router-link class="btn btn-ghost btn-lg" to="/users">看看别人写了什么</router-link>
      </div>

      <div class="hero-stats">
        <div>
          <div class="hero-stat-value">{{ formatNumber(state.site.stats.users) }}</div>
          <div class="hero-stat-label">位作者</div>
        </div>
        <div>
          <div class="hero-stat-value">{{ formatNumber(state.site.stats.posts) }}</div>
          <div class="hero-stat-label">篇公开文章</div>
        </div>
        <div>
          <div class="hero-stat-value">{{ formatNumber(state.site.stats.views) }}</div>
          <div class="hero-stat-label">次阅读</div>
        </div>
      </div>
    </div>
  </section>

  <div class="container page">
    <section>
      <div class="section-head">
        <h2 class="section-title">最新文章</h2>
        <router-link class="btn btn-sm btn-ghost" to="/explore">查看全部 →</router-link>
      </div>

      <div v-if="loading" class="grid grid-3">
        <div v-for="n in 3" :key="n" class="skeleton"></div>
      </div>
      <div v-else-if="posts.length" class="grid grid-3">
        <PostCard v-for="post in posts" :key="post.id" :post="post" />
      </div>
      <div v-else class="empty">
        <div class="empty-title">还没有公开的文章</div>
        <p>注册一个账号，写下第一篇吧。</p>
      </div>
    </section>

    <section v-if="users.length" class="section">
      <div class="section-head">
        <h2 class="section-title">这些人在写</h2>
        <router-link class="btn btn-sm btn-ghost" to="/users">全部博主 →</router-link>
      </div>
      <div class="grid grid-users">
        <UserCard v-for="user in users" :key="user.id" :user="user" />
      </div>
    </section>

    <section v-if="tags.length" class="section">
      <div class="section-head">
        <h2 class="section-title">热门标签</h2>
      </div>
      <div class="row row-wrap" style="gap: 8px">
        <router-link
          v-for="tag in tags"
          :key="tag.name"
          class="tag"
          :to="{ name: 'explore', query: { tag: tag.name } }"
        >
          {{ tag.name }} · {{ tag.count }}
        </router-link>
      </div>
    </section>

    <section v-if="!state.user" class="section">
      <div class="card card-pad row row-wrap" style="gap: 16px">
        <div style="flex: 1; min-width: 240px">
          <h3 style="font-size: 17px">也想要一个自己的主页？</h3>
          <p class="muted" style="margin-top: 6px">
            注册后你就有了 <code>/u/你的用户名</code> 这样的个人主页，可以写文章、传图片、插视频，
            别人也能通过主页找到你。
          </p>
        </div>
        <router-link class="btn btn-primary" to="/register">免费注册</router-link>
      </div>
    </section>
  </div>
</template>
