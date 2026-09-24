/**
 * 文章列表数据加载器，供首页和「全部文章」页在构建时读取。
 * 新增文章只要在 docs/posts 下新建 .md 文件，列表会自动更新。
 */
import { createContentLoader } from 'vitepress'
import { buildPostMeta, sortByDateDesc, type PostMeta } from './posts.shared'

export type { PostMeta }

declare const data: PostMeta[]
export { data }

export default createContentLoader('posts/**/*.md', {
  // 只把渲染后的摘要交给 transform，原文件内容不会进客户端包
  includeSrc: false,
  excerpt: true,
  transform(raw) {
    const posts = raw
      .filter(({ url }) => url !== '/posts/' && url !== '/posts/index.html')
      .map(({ url, frontmatter, excerpt }) =>
        buildPostMeta({
          file: url.replace(/^\/posts\//, ''),
          url,
          frontmatter,
          excerpt
        })
      )
    return sortByDateDesc(posts)
  }
})
