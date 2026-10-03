<script setup>
import { computed } from 'vue'
import UserAvatar from './UserAvatar.vue'
import { formatDate, formatNumber } from '../utils/format'

const props = defineProps({
  post: { type: Object, required: true },
  showAuthor: { type: Boolean, default: true }
})

const url = computed(() => props.post.url || `/u/${props.post.author.username}/${props.post.slug}`)
</script>

<template>
  <article class="card post-card">
    <router-link :to="url">
      <img v-if="post.cover" class="post-cover" :src="post.cover" :alt="post.title" loading="lazy" />
      <div v-else class="post-cover-fallback">{{ post.title.slice(0, 1) }}</div>
    </router-link>

    <div class="post-card-body">
      <router-link :to="url">
        <h3 class="post-card-title">{{ post.title }}</h3>
      </router-link>
      <p class="post-card-desc">{{ post.summary || '这篇文章还没有摘要' }}</p>

      <div v-if="post.tags && post.tags.length" class="row row-wrap" style="gap: 6px">
        <router-link
          v-for="tag in post.tags.slice(0, 3)"
          :key="tag"
          class="tag"
          :to="{ name: 'explore', query: { tag } }"
        >
          {{ tag }}
        </router-link>
      </div>

      <div class="post-card-foot">
        <template v-if="showAuthor">
          <router-link class="row" style="gap: 6px" :to="`/u/${post.author.username}`">
            <UserAvatar :src="post.author.avatar" :name="post.author.displayName" :size="20" />
            <span>{{ post.author.displayName }}</span>
          </router-link>
          <span>·</span>
        </template>
        <span>{{ formatDate(post.publishedAt || post.createdAt) }}</span>
        <span>·</span>
        <span>{{ formatNumber(post.views) }} 次阅读</span>
      </div>
    </div>
  </article>
</template>
