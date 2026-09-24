<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { data as posts } from '../../posts.data'

const props = withDefaults(
  defineProps<{
    /** 只显示最新 N 篇，0 表示全部 */
    limit?: number
  }>(),
  { limit: 0 }
)

const list = computed(() => (props.limit > 0 ? posts.slice(0, props.limit) : posts))
</script>

<template>
  <p v-if="!list.length" class="post-empty">
    还没有文章，在 <code>docs/posts/</code> 下新建一个 Markdown 文件即可。
  </p>

  <ul v-else class="post-list">
    <li v-for="post in list" :key="post.url" class="post-item">
      <a class="post-link" :href="withBase(post.url)">
        <span class="post-title">{{ post.title }}</span>
        <span class="post-date">{{ post.dateText }}</span>
      </a>
      <p v-if="post.description" class="post-desc">{{ post.description }}</p>
      <p v-if="post.tags.length" class="post-tags">
        <span v-for="tag in post.tags" :key="tag" class="post-tag">{{ tag }}</span>
      </p>
    </li>
  </ul>
</template>

<style scoped>
.post-empty {
  padding: 20px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 12px;
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.post-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.post-item {
  padding: 16px 20px;
  margin-bottom: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.2s;
}

.post-item:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.post-link {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  text-decoration: none;
  color: var(--vp-c-text-1);
}

.post-link:hover .post-title {
  color: var(--vp-c-brand-1);
}

.post-title {
  font-size: 17px;
  font-weight: 600;
  transition: color 0.2s;
}

.post-date {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
}

.post-desc {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0 0;
}

.post-tag {
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-size: 12px;
  line-height: 20px;
}
</style>
