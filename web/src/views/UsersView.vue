<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../api'
import UserCard from '../components/UserCard.vue'

const users = ref([])
const total = ref(0)
const keyword = ref('')
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams({ limit: '60' })
    if (keyword.value.trim()) params.set('q', keyword.value.trim())
    const data = await api.get(`/api/users?${params.toString()}`)
    users.value = data.items
    total.value = data.total
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="container page">
    <div class="page-head">
      <div>
        <h1 class="page-title">博主</h1>
        <p class="page-desc">站内共有 {{ total }} 位作者，点进去就能看到他们的主页和文章</p>
      </div>
      <form class="row" style="gap: 8px" @submit.prevent="load">
        <input v-model="keyword" class="input" style="width: 200px" type="search" placeholder="搜索用户名或昵称" />
        <button class="btn btn-primary" type="submit">搜索</button>
      </form>
    </div>

    <div v-if="loading" class="grid grid-users">
      <div v-for="n in 6" :key="n" class="skeleton" style="min-height: 150px"></div>
    </div>
    <div v-else-if="users.length" class="grid grid-users">
      <UserCard v-for="user in users" :key="user.id" :user="user" />
    </div>
    <div v-else class="empty">
      <div class="empty-title">没有找到这位作者</div>
      <p>试试用户名或者昵称里的关键词。</p>
    </div>
  </div>
</template>
