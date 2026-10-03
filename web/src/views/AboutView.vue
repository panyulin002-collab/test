<script setup>
import { state } from '../store'
import { site } from '../site'
</script>

<template>
  <div class="container page">
    <div style="max-width: 720px">
      <h1 class="page-title">关于</h1>

      <div class="stack card card-pad" style="margin-top: 20px; gap: 14px">
        <p v-for="(line, index) in site.about.intro" :key="index">{{ line }}</p>

        <h3 style="font-size: 16px; margin-top: 8px">在这里可以做什么</h3>
        <ul class="muted" style="margin: 0; padding-left: 20px">
          <li>注册账号，拥有自己的主页 <code>/u/用户名</code></li>
          <li>在线写文章，支持 Markdown 排版、实时预览</li>
          <li>插入图片和视频：拖拽或粘贴图片、上传视频、粘贴 B 站 / YouTube 链接</li>
          <li>文章可以先存草稿，想清楚再公开发布</li>
          <li>逛逛别人的主页，看看大家都在写什么</li>
        </ul>

        <h3 style="font-size: 16px; margin-top: 8px">联系</h3>
        <p class="muted">
          邮箱：<a :href="`mailto:${site.about.email}`">{{ site.about.email }}</a>
        </p>

        <div class="row row-wrap" style="gap: 10px">
          <a
            v-for="link in site.about.links"
            :key="link.url"
            class="btn btn-sm"
            :href="link.url"
            target="_blank"
            rel="noopener"
          >
            {{ link.label }}
          </a>
        </div>

        <hr style="border: 0; border-top: 1px solid var(--border); margin: 6px 0" />
        <p class="faint small">
          本站由 Node.js + Vue 3 驱动，数据存在服务器上的 SQLite 里，目前有
          {{ state.site.stats.users }} 位作者、{{ state.site.stats.posts }} 篇文章。
        </p>
      </div>
    </div>
  </div>
</template>
