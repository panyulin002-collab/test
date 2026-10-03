<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import { state } from '../store'
import { renderMarkdown } from '../utils/markdown'
import { formatDate, formatNumber, readingMinutes } from '../utils/format'
import { toast } from '../composables/toast'
import UserAvatar from '../components/UserAvatar.vue'

const route = useRoute()
const router = useRouter()

const post = ref(null)
const author = ref(null)
const more = ref([])
const isOwner = ref(false)
const loading = ref(true)
const error = ref('')
const contentRef = ref(null)

const html = computed(() => (post.value ? renderMarkdown(post.value.content) : ''))

async function load(username, slug) {
  loading.value = true
  error.value = ''
  try {
    const data = await api.get(`/api/posts/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`)
    post.value = data.post
    author.value = data.author
    more.value = data.more
    isOwner.value = data.isOwner
    document.title = `${data.post.title} · ${state.site.name}`
    await nextTick()
  } catch (err) {
    error.value = err.message
    post.value = null
  } finally {
    loading.value = false
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    toast('链接已复制')
  } catch {
    toast('浏览器不允许复制，请手动复制地址栏', 'error')
  }
}

async function removePost() {
  if (!window.confirm('确定删除这篇文章吗？删除后无法恢复。')) return
  try {
    await api.del(`/api/posts/${post.value.id}`)
    toast('文章已删除')
    router.push('/me')
  } catch (err) {
    toast(err.message, 'error')
  }
}

/** 正文里的代码块复制按钮 */
async function onContentClick(event) {
  const button = event.target.closest('[data-copy]')
  if (!button) return
  const code = button.parentElement?.querySelector('code')?.textContent || ''
  try {
    await navigator.clipboard.writeText(code)
    button.textContent = '已复制'
    setTimeout(() => (button.textContent = '复制'), 1600)
  } catch {
    toast('浏览器不允许复制，请手动选择', 'error')
  }
}

watch(() => [route.params.username, route.params.slug], ([username, slug]) => {
  if (username && slug) load(username, slug)
}, { immediate: true })
</script>

<template>
  <div class="container page">
    <div v-if="loading" class="stack">
      <div class="skeleton" style="min-height: 120px"></div>
      <div class="skeleton" style="min-height: 320px"></div>
    </div>

    <div v-else-if="error" class="empty">
      <div class="empty-title">{{ error }}</div>
      <router-link class="btn btn-sm" style="margin-top: 12px" to="/explore">回文章列表</router-link>
    </div>

    <div v-else-if="post" class="post-shell">
      <article>
        <div v-if="!isOwner && post.status !== 'published'" class="alert" style="margin-bottom: 18px">
          这是一篇草稿，只有你自己能看到。
        </div>

        <header class="post-header">
          <div class="row row-wrap" style="gap: 8px; margin-bottom: 12px">
            <span v-if="post.status === 'draft'" class="badge badge-draft">草稿</span>
            <router-link
              v-for="tag in post.tags"
              :key="tag"
              class="tag"
              :to="{ name: 'explore', query: { tag } }"
            >
              {{ tag }}
            </router-link>
          </div>

          <h1 class="post-title">{{ post.title }}</h1>

          <div class="post-meta">
            <router-link class="row" style="gap: 8px" :to="`/u/${author.username}`">
              <UserAvatar :src="author.avatar" :name="author.displayName" :size="28" />
              <span style="color: var(--text)">{{ author.displayName }}</span>
            </router-link>
            <span>·</span>
            <span>{{ formatDate(post.publishedAt || post.createdAt) }}</span>
            <span>·</span>
            <span>{{ formatNumber(post.views) }} 次阅读</span>
            <span>·</span>
            <span>约 {{ readingMinutes(post.content) }} 分钟</span>
          </div>
        </header>

        <img v-if="post.cover" class="post-cover-hero" :src="post.cover" :alt="post.title" />

        <div ref="contentRef" class="markdown-body" v-html="html" @click="onContentClick"></div>

        <div class="card card-pad row row-wrap" style="gap: 16px; margin-top: 40px">
          <UserAvatar :src="author.avatar" :name="author.displayName" :size="54" />
          <div style="flex: 1; min-width: 220px">
            <div class="row" style="gap: 8px">
              <router-link :to="`/u/${author.username}`" style="font-weight: 600">
                {{ author.displayName }}
              </router-link>
              <span class="faint small">@{{ author.username }}</span>
            </div>
            <p class="muted small" style="margin-top: 6px">
              {{ author.bio || '这个人还没有写简介。' }}
            </p>
            <p class="faint small" style="margin-top: 6px">
              共 {{ author.postCount }} 篇文章 · {{ formatNumber(author.viewCount) }} 次阅读
            </p>
          </div>
          <router-link class="btn btn-sm" :to="`/u/${author.username}`">进入主页</router-link>
        </div>
      </article>

      <aside class="post-side">
        <div class="card card-pad stack" style="gap: 10px">
          <div class="row">
            <span style="font-weight: 600">分享这篇文章</span>
          </div>
          <button class="btn btn-sm" type="button" @click="copyLink">复制链接</button>
          <template v-if="isOwner">
            <router-link class="btn btn-sm btn-primary" :to="`/write/${post.id}`">编辑文章</router-link>
            <button class="btn btn-sm btn-danger" type="button" @click="removePost">删除文章</button>
          </template>
        </div>

        <div v-if="more.length" class="card card-pad stack" style="gap: 10px">
          <span style="font-weight: 600">他/她的其他文章</span>
          <router-link v-for="item in more" :key="item.id" :to="item.url" class="small">
            <div style="font-weight: 500">{{ item.title }}</div>
            <div class="faint small">{{ formatDate(item.publishedAt || item.createdAt) }}</div>
          </router-link>
        </div>
      </aside>
    </div>
  </div>
</template>
