/**
 * Node 侧读取文章列表，供 config.ts 生成侧边栏。
 *
 * 说明：VitePress 的数据加载器（.data.ts）只在站点的 Vite 环境里生效，
 * 而 config.ts 由 Vite 单独加载，所以这里用文件系统读取。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPostMeta, parseFrontmatter, sortByDateDesc, toPostPath } from './posts.shared'

const postsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../posts')

/** 读取 docs/posts 下所有文章（不含列表页 index.md） */
export function loadPosts() {
  if (!fs.existsSync(postsDir)) return []

  const files = fs
    .readdirSync(postsDir, { recursive: true })
    .map((entry) => String(entry).replace(/\\/g, '/'))
    .filter((entry) => entry.endsWith('.md') && !entry.endsWith('index.md'))

  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(postsDir, file), 'utf-8')
    const frontmatter = parseFrontmatter(raw)
    const { url } = toPostPath(file)
    return buildPostMeta({ file, url, frontmatter })
  })

  return sortByDateDesc(posts)
}

/** 生成「文章」侧边栏分组 */
export function postsSidebar() {
  const posts = loadPosts()
  return [
    {
      text: '文章',
      items: [
        { text: '全部文章', link: '/posts/' },
        ...posts.map((post) => ({ text: post.title, link: post.url }))
      ]
    }
  ]
}
