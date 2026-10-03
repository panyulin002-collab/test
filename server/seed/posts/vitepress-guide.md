---
title: 写作与维护指南
date: 2026-09-24
description: 这个博客怎么用：如何写新文章、改个人信息、换首页大图，以及如何部署上线。
tags: [教程, VitePress]
---

# 写作与维护指南

这份笔记记录本站的用法，方便以后回来查。

## 本地开发

```bash
npm install     # 首次使用，安装依赖
npm run dev     # 启动本地预览，默认 http://localhost:5173
npm run build   # 构建生产版本到 docs/.vitepress/dist
npm run preview # 预览构建结果
```

## 写一篇新文章

1. 在 `docs/posts/` 下新建一个 `.md` 文件，文件名就是链接地址，例如 `my-post.md` 对应 `/posts/my-post`
2. 按下面的格式写 frontmatter：

```yaml
---
title: 文章标题
date: 2026-09-24
description: 一句话摘要，会显示在文章列表里
tags: [标签一, 标签二]
---
```

3. 正文用 Markdown 写，支持代码块、表格和 Vue 组件

首页的「最新文章」、`/posts/` 的全部文章页，以及文章页侧边栏都会自动更新，**不需要改任何配置文件**。

::: tip 小提示
侧边栏由 `docs/.vitepress/posts.node.ts` 在启动时读取。新增文件后如果侧边栏没刷新，重启一次 `npm run dev` 即可。
:::

## 修改个人信息

站点名称、签名、头像、邮箱、社交链接都集中在 [`docs/.vitepress/site.ts`](../.vitepress/site.ts)，改完保存即可全站生效。

## 写正文时可以用的写法

````md
::: tip 提示
适合放补充说明
:::

::: warning 注意
适合放容易踩的坑
:::

::: details 展开查看
适合放长代码或折叠内容
:::
````

## 换掉首页大图

把新图片放进 `docs/public/`，例如 `my-hero.jpg`，然后修改 `site.ts` 里的 `hero.image` 和 `hero.imageSmall`。

建议先压缩再上传：本站的两张图片都转成了 WebP，`blog.png` 从 4.7 MB 压到了 180 KB 左右。

## 部署

仓库自带 GitHub Actions 工作流（`.github/workflows/deploy.yml`）：

1. 在 GitHub 仓库的 Settings → Pages 里，把 Source 设为 **GitHub Actions**
2. 之后每次 push 到 `main` 分支都会自动构建并发布

工作流会自动判断 base 路径（用户页用 `/`，项目页用 `/仓库名/`），不需要手动改配置；部署到 Vercel、Netlify 时保持默认的 `/` 即可。
