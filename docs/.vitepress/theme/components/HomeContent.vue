<script setup>
// ========= 个人信息配置（在这里修改你的信息） =========
const profile = {
  // 头像图片：把图片放到 docs/public/avatar.jpg 即可自动使用
  avatar: '/blogtouxiang.png',
  signature: '一任阶前，点滴到天明',
  email: 'panyulin002@gmail.com',
  bilibili: {
    name: 'B 站',
    url: 'https://space.bilibili.com/90523078?spm_id_from=333.1007.0.0'
  },
  github: {
    name: 'GitHub',
    url: 'https://github.com/panyulin002-collab'
  }
}

// Hero 背景图：默认使用内置渐变 SVG
// 把自己的图片放到 docs/public/hero-bg.jpg 后改为 '/hero-bg.jpg' 即可
const heroBg = '/blog.png'

// 头像加载失败时的占位 SVG（无需改动）
const placeholderAvatar =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#60a5fa"/></linearGradient></defs><rect width="160" height="160" fill="url(#g)"/><circle cx="80" cy="64" r="30" fill="#fff" opacity="0.9"/><path d="M28 150c0-30 24-48 52-48s52 18 52 48" fill="#fff" opacity="0.9"/></svg>'
  )
function onAvatarError(e) {
  e.target.src = placeholderAvatar
}

// 示例文章列表（可自行扩展或改为从其他地方读取）
const posts = [
  { title: 'Hello World', date: '2026-09-18', desc: '欢迎来到我的博客，这是第一篇文章。', link: '/posts/hello-world' },
]
</script>

<template>
  <!-- Hero 全屏背景区：上实下虚 -->
  <section
    class="hero-banner"
    :style="{ backgroundImage: `url(${heroBg})` }"
  >
    <div class="hero-overlay"></div>
    <div class="hero-inner">
    </div>
  </section>

  <!-- 下方九宫格容器：左侧个人卡片 + 右侧文章列表 -->
  <div class="home-grid">
    <!-- 左侧栏：头像 + 签名 + 社交链接 -->
    <aside class="profile-card">
      <div class="avatar-wrap">
        <img
          class="avatar"
          :src="profile.avatar"
          :alt="profile.signature"
          @error="onAvatarError"
        />
      </div>
      <p class="signature">“{{ profile.signature }}”</p>
      <ul class="social-links">
        <li>
          <a :href="`mailto:${profile.email}`" class="social-link email">
            <span class="icon">✉</span>
            <span class="text">{{ profile.email }}</span>
          </a>
        </li>
        <li>
          <a :href="profile.bilibili.url" target="_blank" rel="noopener" class="social-link bilibili">
            <span class="icon">▶</span>
            <span class="text">{{ profile.bilibili.name }}</span>
          </a>
        </li>
        <li>
          <a :href="profile.github.url" target="_blank" rel="noopener" class="social-link github">
            <span class="icon">⌥</span>
            <span class="text">{{ profile.github.name }}</span>
          </a>
        </li>
      </ul>
    </aside>

    <!-- 主内容区：文章列表 -->
    <main class="content">
      <h2 class="content-title">最新文章</h2>
      <ul class="post-list">
        <li v-for="post in posts" :key="post.link" class="post-item">
          <a :href="post.link" class="post-link">
            <span class="post-title">{{ post.title }}</span>
            <span class="post-date">{{ post.date }}</span>
          </a>
          <p class="post-desc">{{ post.desc }}</p>
        </li>
      </ul>
    </main>
  </div>
</template>

<!-- 全局样式：确保 VitePress 容器不裁剪全宽 banner -->
<style>
/* 首页需要突破容器限制，让 hero 背景全屏铺满 */
.VPHome {
  overflow: visible !important;
}
</style>

<style scoped>
/* ===== Hero 全屏背景区：横跨整个视口，上实下虚 ===== */
.hero-banner {
  position: relative;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  height: 420px;
  background-size: cover;
  background-position: center;
  background-image: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  /* 上实下虚：底部渐变到透明，与下方内容平滑过渡 */
  -webkit-mask-image: linear-gradient(to bottom, #000 60%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 60%, transparent 100%);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.15) 0%,
    rgba(0, 0, 0, 0.35) 60%,
    rgba(0, 0, 0, 0.1) 100%
  );
}

.hero-inner {
  position: relative;
  z-index: 1;
  text-align: center;
}

.hero-title {
  margin: 0;
  font-size: 44px;
  font-weight: 700;
  letter-spacing: 2px;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

.hero-subtitle {
  margin: 12px 0 0;
  font-size: 18px;
  opacity: 0.92;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
}

/* ===== 下方九宫格：左侧个人卡片 + 右侧文章列表 ===== */
.home-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 32px;
  max-width: 1100px;
  margin: -60px auto 0; /* 向上叠在 hero 虚化区上 */
  padding: 0 24px 24px;
  position: relative;
  z-index: 2;
}

/* 左侧栏：个人卡片 */
.profile-card {
  padding: 32px 20px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  text-align: center;
  height: fit-content;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}

.avatar-wrap {
  display: inline-block;
  padding: 4px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a78bfa, #60a5fa);
}

.avatar {
  display: block;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  background: #fff;
}

.signature {
  margin: 18px 0 20px;
  font-size: 15px;
  font-style: italic;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.social-links {
  list-style: none;
  margin: 0;
  padding: 0;
  text-align: left;
}

.social-links li {
  margin: 8px 0;
}

.social-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--vp-c-text-1);
  transition: background 0.2s, color 0.2s;
}

.social-link:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-brand);
}

.social-link .icon {
  width: 20px;
  text-align: center;
  font-size: 16px;
}

.social-link .text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 主内容区：文章列表 */
.content {
  padding: 8px 0;
}

.content-title {
  margin: 0 0 20px;
  font-size: 22px;
  font-weight: 600;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--vp-c-divider);
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
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.post-item:hover {
  border-color: var(--vp-c-brand);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.post-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-decoration: none;
  color: var(--vp-c-text-1);
}

.post-title {
  font-size: 17px;
  font-weight: 600;
}

.post-date {
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.post-desc {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

/* 响应式：窄屏退化为单列 */
@media (max-width: 768px) {
  .hero-banner {
    height: 300px;
  }
  .hero-title {
    font-size: 30px;
  }
  .home-grid {
    grid-template-columns: 1fr;
    margin-top: -40px;
    padding: 0 16px 16px;
    gap: 20px;
  }
}
</style>
