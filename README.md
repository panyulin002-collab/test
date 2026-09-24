# 一任阶前

个人博客，基于 [VitePress](https://vitepress.dev) 构建。内容用 Markdown 撰写，
文章列表与侧边栏自动生成。

## 常用命令

```bash
npm install     # 安装依赖
npm run dev     # 本地预览（默认 http://localhost:5173）
npm run build   # 构建到 docs/.vitepress/dist
npm run preview # 预览构建结果
```

## 目录结构

```
blog/
├─ docs/                          # 站点内容（VitePress 的 srcDir）
│  ├─ index.md                    # 首页（layout: home，内容由 HomeContent 渲染）
│  ├─ about.md                    # 关于
│  ├─ posts/                      # 所有文章，新增 md 即可
│  │  ├─ index.md                 # 「全部文章」页
│  │  ├─ hello-world.md
│  │  └─ vitepress-guide.md       # 写作与维护指南
│  ├─ public/                     # 静态资源，按 /文件名 引用
│  │  ├─ avatar.webp              # 头像
│  │  ├─ hero.webp / hero-sm.webp # 首页大图（大屏 / 小屏）
│  │  ├─ hero-bg.svg              # 首页大图加载前的渐变底
│  │  └─ favicon.svg              # 站点图标
│  └─ .vitepress/
│     ├─ config.ts                # 站点配置（导航、搜索、页脚等）
│     ├─ site.ts                  # 站点名 / 个人信息，改这里即可全站生效
│     ├─ posts.data.ts            # 文章列表数据源（供页面组件使用）
│     ├─ posts.node.ts            # 侧边栏自动生成（构建时读取 posts 目录）
│     ├─ posts.shared.ts          # frontmatter 解析与格式化
│     └─ theme/                   # 自定义主题
│        ├─ index.ts              # 注入首页组件、注册全局组件
│        ├─ styles/custom.css     # 品牌色等全局样式
│        └─ components/
│           ├─ HomeContent.vue    # 首页 hero + 个人卡片 + 最新文章
│           └─ PostList.vue       # 文章列表卡片（首页和文章页共用）
├─ .github/workflows/deploy.yml   # 推送到 main 自动部署到 GitHub Pages
└─ .originals/                    # 图片原图备份（已在 .gitignore 中，不会提交）
```

## 写一篇新文章

在 `docs/posts/` 下新建 `.md` 文件，文件名即链接地址：

```yaml
---
title: 文章标题
date: 2026-09-24
description: 一句话摘要，会显示在文章列表里
tags: [标签一, 标签二]
---
```

首页「最新文章」、`/posts/` 全部文章页和文章侧边栏都会自动更新，不需要改配置。
侧边栏在开发服务器启动时读取，新增文件后如未刷新，重启 `npm run dev` 即可。

## 修改站点信息

站点名、签名、头像、邮箱、社交链接、首页大图都集中在 `docs/.vitepress/site.ts`。

## 图片建议

图片放在 `docs/public/`，并在提交前压缩（推荐 WebP，长边 2400px 以内）。
本站首页大图从 4.7 MB 的 PNG 压到 182 KB 的 WebP，头像从 1 MB 压到 18 KB。
原图保留在 `.originals/`（已忽略提交），需要重新导出时可以从这里取。

## 部署

仓库内置 GitHub Actions 工作流，推送到 `main` 即自动发布：

1. 仓库 Settings → Pages → Source 选择 **GitHub Actions**
2. push 到 `main`，等待工作流完成即可

工作流会自动判断 base 路径（用户页 `/`、项目页 `/仓库名/`）。部署到 Vercel / Netlify
时无需额外配置，保持 base 为 `/` 即可。
