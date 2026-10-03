<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import PostCard from '../components/PostCard.vue'

const route = useRoute()
const router = useRouter()

const items = ref([])
const total = ref(0)
const tags = ref([])
const loading = ref(true)
const keyword = ref(String(route.query.q || ''))

const pageSize = 9
const page = computed(() => Math.max(1, Number(route.query.page) || 1))
const activeTag = computed(() => String(route.query.tag || ''))
const query = computed(() => String(route.query.q || ''))
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize) })
    if (query.value) params.set('q', query.value)
    if (activeTag.value) params.set('tag', activeTag.value)
    const data = await api.get(`/api/posts?${params.toString()}`)
    items.value = data.items
    total.value = data.total
  } finally {
    loading.value = false
  }
}

function apply(next) {
  const merged = { q: query.value, tag: activeTag.value, page: 1, ...next }
  const clean = Object.fromEntries(Object.entries(merged).filter(([, value]) => value))
  if (clean.page === 1) delete clean.page
  router.push({ name: 'explore', query: clean })
}

function onSearch() {
  apply({ q: keyword.value.trim() })
}

onMounted(async () => {
  const tagList = await api.get('/api/posts/tags').catch(() => ({ items: [] }))
  tags.value = tagList.items.slice(0, 20)
})

watch(() => route.query, load, { immediate: true })
watch(query, (value) => (keyword.value = value))
</script>

<template>
  <div class="container page">
    <div class="page-head">
      <div>
        <h1 class="page-title">全部文章</h1>
        <p class="page-desc">
          共 {{ total }} 篇{{ activeTag ? `与「${activeTag}」相关的` : '' }}文章
        </p>
      </div>
      <form class="row" style="gap: 8px" @submit.prevent="onSearch">
        <input v-model="keyword" class="input" style="width: 220px" type="search" placeholder="搜索标题、摘要或正文" />
        <button class="btn btn-primary" type="submit">搜索</button>
      </form>
    </div>

    <div v-if="tags.length" class="row row-wrap" style="gap: 8px; margin-bottom: 22px">
      <button class="tag" :class="{ 'tag-active': !activeTag }" type="button" @click="apply({ tag: '' })">
        全部
      </button>
      <button
        v-for="tag in tags"
        :key="tag.name"
        class="tag"
        :class="{ 'tag-active': activeTag === tag.name }"
        type="button"
        @click="apply({ tag: tag.name })"
      >
        {{ tag.name }}
      </button>
    </div>

    <div v-if="loading" class="grid grid-3">
      <div v-for="n in 6" :key="n" class="skeleton"></div>
    </div>

    <template v-else-if="items.length">
      <div class="grid grid-3">
        <PostCard v-for="post in items" :key="post.id" :post="post" />
      </div>

      <div v-if="totalPages > 1" class="row center" style="justify-content: center; margin-top: 28px; gap: 8px">
        <button class="btn btn-sm" :disabled="page <= 1" @click="router.push({ name: 'explore', query: { ...route.query, page: page - 1 } })">
          上一页
        </button>
        <span class="muted small">第 {{ page }} / {{ totalPages }} 页</span>
        <button
          class="btn btn-sm"
          :disabled="page >= totalPages"
          @click="router.push({ name: 'explore', query: { ...route.query, page: page + 1 } })"
        >
          下一页
        </button>
      </div>
    </template>

    <div v-else class="empty">
      <div class="empty-title">没有找到相关文章</div>
      <p>换个关键词，或者<button class="btn btn-sm btn-ghost" type="button" @click="apply({ q: '', tag: '' })">看看全部</button></p>
    </div>
  </div>
</template>
