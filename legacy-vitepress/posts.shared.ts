/**
 * 文章元数据的解析与格式化工具。
 * 同时被 Node 侧（config.ts 生成侧边栏）和客户端侧（posts.data.ts 生成列表）复用，
 * 保证两处显示的数据一致。
 */

export interface PostMeta {
  /** 文章标题 */
  title: string
  /** 站内链接，例如 /posts/hello-world */
  url: string
  /** ISO 日期字符串，用于排序；无日期时为空串 */
  date: string
  /** 展示用日期，例如 2026-09-18 */
  dateText: string
  /** 摘要，优先取 frontmatter 的 description */
  description: string
  /** 标签 */
  tags: string[]
  /** 相对 docs/posts 的源文件路径，例如 hello-world.md */
  file: string
}

/** 取出文件头部的 frontmatter 原文 */
function readFrontmatterBlock(raw: string): string | null {
  const matched = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/.exec(raw)
  return matched ? matched[1] : null
}

function unquote(value: string): string {
  const trimmed = value.trim()
  const quote = trimmed[0]
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote) && trimmed.length > 1) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

/**
 * 极简 frontmatter 解析：支持 `key: 值`、带引号的值、以及 `[a, b]` 行内数组。
 * 博客的 frontmatter 结构简单，这样就不必额外引入 YAML 依赖。
 */
export function parseFrontmatter(raw: string): Record<string, string | string[]> {
  const block = readFrontmatterBlock(raw)
  const result: Record<string, string | string[]> = {}
  if (!block) return result

  for (const line of block.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const matched = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line)
    if (!matched) continue

    const [, key, rawValue] = matched
    const value = rawValue.trim()
    if (!value) continue

    if (value.startsWith('[') && value.endsWith(']')) {
      result[key] = value
        .slice(1, -1)
        .split(',')
        .map((item) => unquote(item))
        .filter(Boolean)
      continue
    }

    result[key] = unquote(value)
  }

  return result
}

/** 把 frontmatter 里的日期（字符串或 Date）转成 Date */
export function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value.trim())
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

/** 格式化为 2026-09-18 */
export function formatDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 把正文 HTML 压成一行纯文本摘要 */
export function summarize(html: string, limit = 72): string {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > limit ? `${text.slice(0, limit)}…` : text
}

/** 把 posts 目录下的相对路径转成站内链接和文件标识 */
export function toPostPath(relativeFile: string): { url: string; file: string } {
  const normalized = relativeFile.replace(/\\/g, '/').replace(/^\.\//, '')
  const slug = normalized
    .replace(/\.md$/, '')
    .replace(/(^|\/)index$/, '$1')
    .replace(/\/$/, '')
  return {
    url: `/posts/${slug}`.replace(/\/$/, '/'),
    file: normalized
  }
}

/** 拼装统一的文章元数据对象 */
export function buildPostMeta(options: {
  file: string
  url: string
  frontmatter: Record<string, unknown>
  excerpt?: string
}): PostMeta {
  const { file, url, frontmatter, excerpt } = options
  const date = toDate(frontmatter.date)
  const rawTags = Array.isArray(frontmatter.tags) ? frontmatter.tags : []
  const description = frontmatter.description
    ? String(frontmatter.description)
    : summarize(excerpt ?? '')

  return {
    title: frontmatter.title ? String(frontmatter.title) : url,
    url,
    date: date ? date.toISOString() : '',
    dateText: date ? formatDate(date) : '日期未标注',
    description,
    tags: rawTags.map(String),
    file
  }
}

/** 按日期倒序，没有日期的排在最后 */
export function sortByDateDesc(posts: PostMeta[]): PostMeta[] {
  return [...posts].sort((a, b) => {
    if (a.date === b.date) return a.title.localeCompare(b.title)
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date < b.date ? 1 : -1
  })
}
