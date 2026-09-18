---
title: VitePress 指南
date: 2026-09-18
---

# VitePress 快速指南

## 本地开发

在项目根目录运行：

```bash
npm run dev
```

启动开发服务器，访问终端显示的地址即可预览。

## 构建生产版本

```bash
npm run build
```

构建产物输出到 `docs/.vitepress/dist`。

## 本地预览构建结果

```bash
npm run preview
```

## 写新文章

1. 在 `docs/posts/` 目录下新建 `.md` 文件
2. 在文件头部添加 frontmatter：

```yaml
---
title: 文章标题
date: 2026-09-18
---
```

3. 在 `docs/.vitepress/config.ts` 的 `sidebar` 中添加链接

## 部署

可将 `docs/.vitepress/dist` 目录部署到任意静态托管服务。
