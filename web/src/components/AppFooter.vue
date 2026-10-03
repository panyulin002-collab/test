<script setup>
import { state } from '../store'
import { site } from '../site'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-inner">
      <div>
        © {{ year }} {{ state.site.name }} · {{ state.site.stats.users }} 位作者 ·
        {{ state.site.stats.posts }} 篇文章
      </div>
      <div class="footer-links">
        <router-link to="/about">关于</router-link>
        <a v-for="link in site.about.links" :key="link.url" :href="link.url" target="_blank" rel="noopener">
          {{ link.label }}
        </a>
      </div>
    </div>
  </footer>
</template>
