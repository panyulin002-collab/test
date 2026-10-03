<script setup>
import { onMounted, ref, watch } from 'vue'
import { api } from '../api'
import { state } from '../store'
import { formatDateTime, formatNumber, fromNow } from '../utils/format'
import { toast } from '../composables/toast'

const items = ref([])
const stats = ref({ total: 0, published: 0, draft: 0, views: 0 })
const status = ref('all')
const keyword = ref('')
const loading = ref(true)

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'published', label: '已发布' },
  { key: 'draft', label: '草稿' }
]

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (status.value !== 'all') params.set('status', status.value)
    if (keyword.value.trim()) params.set('q', keyword.value.trim())
    const data = await api.get(`/api/me/posts?${params.toString()}`)
    items.value = data.items
    stats.value = data.stats
  } catch (error) {
    toast(error.message, 'error')
  } finally {
    loading.value = false
  }
}

async function remove(item) {
  if (!window.confirm(`确定删除《${item.title}》吗？删除后无法恢复。`)) return
  try {
    await api.del(`/api/posts/${item.id}`)
    toast('已删除')
    load()
  } catch (error) {
    toast(error.message, 'error')
  }
}

onMounted(load)
watch(status, load)
</script>

<template>
  <div class="container page">
    <div class="page-head">
      <div>
        <h1 class="page-title">我的博客</h1>
        <p class="page-desc">
          {{ state.user?.displayName }}，你在这里写下的东西都只属于你，草稿别人看不到
        </p>
      </div>
      <div class="row">
        <router-link class="btn" :to="`/u/${state.user?.username}`">我的主页</router-link>
        <router-link class="btn btn-primary" to="/write">写新文章</router-link>
      </div>
    </div>

    <div class="grid-stats">
      <div class="stat-card">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">全部文章</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.published }}</div>
        <div class="stat-label">已发布</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.draft }}</div>
        <div class="stat-label">草稿</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatNumber(stats.views) }}</div>
        <div class="stat-label">总阅读量</div>
      </div>
    </div>

    <div class="row row-wrap" style="margin: 26px 0 14px; gap: 10px">
      <div class="tabs" style="width: auto">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab"
          :class="{ active: status === tab.key }"
          type="button"
          @click="status = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="spacer"></div>
      <form class="row" style="gap: 8px" @submit.prevent="load">
        <input v-model="keyword" class="input" style="width: 180px" type="search" placeholder="搜索我的文章" />
        <button class="btn btn-sm" type="submit">搜索</button>
      </form>
    </div>

    <div v-if="loading" class="stack">
      <div v-for="n in 3" :key="n" class="skeleton" style="min-height: 76px"></div>
    </div>

    <div v-else-if="items.length" class="card">
      <div v-for="item in items" :key="item.id" class="post-row">
        <div class="post-row-main">
          <div class="post-row-title">
            <router-link :to="item.url">{{ item.title }}</router-link>
            <span class="badge" :class="item.status === 'draft' ? 'badge-draft' : 'badge-published'">
              {{ item.status === 'draft' ? '草稿' : '已发布' }}
            </span>
          </div>
          <div class="post-row-meta">
            <span>更新于 {{ fromNow(item.updatedAt) }}</span>
            <span>{{ formatNumber(item.views) }} 次阅读</span>
            <span v-if="item.tags.length">{{ item.tags.join(' · ') }}</span>
            <span class="faint">{{ formatDateTime(item.updatedAt) }}</span>
          </div>
        </div>
        <div class="row" style="gap: 8px">
          <router-link class="btn btn-sm" :to="item.url">查看</router-link>
          <router-link class="btn btn-sm" :to="`/write/${item.id}`">编辑</router-link>
          <button class="btn btn-sm btn-danger" type="button" @click="remove(item)">删除</button>
        </div>
      </div>
    </div>

    <div v-else class="empty">
      <div class="empty-title">这里还空着</div>
      <p v-if="status === 'draft'">没有草稿，想到什么就<router-link to="/write">写下来</router-link>吧。</p>
      <p v-else>
        还没有文章，<router-link to="/write">写下第一篇</router-link>，或者去<router-link to="/explore">看看别人写了什么</router-link>。
      </p>
    </div>
  </div>
</template>
