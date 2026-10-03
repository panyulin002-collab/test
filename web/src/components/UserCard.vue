<script setup>
import UserAvatar from './UserAvatar.vue'
import { formatNumber } from '../utils/format'

defineProps({
  user: { type: Object, required: true }
})
</script>

<template>
  <router-link class="card card-pad stack" style="gap: 12px" :to="`/u/${user.username}`">
    <div class="row" style="gap: 12px">
      <UserAvatar :src="user.avatar" :name="user.displayName" :size="46" />
      <div style="min-width: 0">
        <div style="font-weight: 600">{{ user.displayName }}</div>
        <div class="faint small">@{{ user.username }}</div>
      </div>
    </div>
    <p class="muted small" style="min-height: 38px">{{ user.bio || '这个人还没有写简介' }}</p>
    <div class="row faint small" style="gap: 14px">
      <span>{{ formatNumber(user.postCount) }} 篇文章</span>
      <span>{{ formatNumber(user.viewCount) }} 次阅读</span>
    </div>
  </router-link>
</template>
