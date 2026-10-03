import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { get, run, tx } from './db.js'
import { hashPassword } from './auth.js'
import { nowIso, slugify, summarize, tagsToText } from './utils.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const seedPostsDir = path.join(here, 'seed', 'posts')

const username = process.env.SEED_USER || 'panyu'
const displayName = process.env.SEED_NAME || '一任阶前'
const password = process.env.SEED_PASSWORD || 'blog123456'
const bio =
  process.env.SEED_BIO || '一任阶前，点滴到天明。这里记录技术学习、项目经验与一些生活随笔。'

/** 解析 Markdown 头部的 frontmatter（只支持本站用到的简单写法） */
function parseFrontmatter(raw) {
  const matched = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!matched) return { data: {}, body: raw }

  const data = {}
  for (const line of matched[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line)
    if (!pair) continue
    const [, key, rawValue] = pair
    const value = rawValue.trim().replace(/^["']|["']$/g, '')
    if (!value) continue
    data[key] = value.startsWith('[') && value.endsWith(']')
      ? value.slice(1, -1).split(',').map((item) => item.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
      : value
  }
  return { data, body: raw.slice(matched[0].length) }
}

function collectSeedFiles() {
  if (!fs.existsSync(seedPostsDir)) return []
  return fs
    .readdirSync(seedPostsDir)
    .filter((file) => file.endsWith('.md') && file !== 'index.md')
    .sort()
}

function main() {
  const existing = get('select * from users where username = ?', [username])
  let userId

  if (existing) {
    userId = existing.id
    console.log(`[seed] 用户 ${username} 已存在，跳过创建`)
  } else {
    const result = run(
      'insert into users (username, display_name, password_hash, bio, avatar, created_at) values (?, ?, ?, ?, ?, ?)',
      [username, displayName, hashPassword(password), bio, '/default-avatar.webp', nowIso()]
    )
    userId = Number(result.lastInsertRowid)
    console.log(`[seed] 已创建账号 ${username}，初始密码 ${password}（登录后请到「设置」里改掉）`)
  }

  const files = collectSeedFiles()
  if (!files.length) {
    console.log('[seed] 没有找到可导入的 Markdown 文章')
    return
  }

  const count = get('select count(*) as c from posts where user_id = ?', [userId]).c
  if (count > 0 && !process.argv.includes('--force')) {
    console.log(`[seed] ${username} 名下已经有 ${count} 篇文章，跳过导入（想强制导入加 --force）`)
    return
  }

  let imported = 0
  tx(() => {
    for (const file of files) {
      const raw = fs.readFileSync(path.join(seedPostsDir, file), 'utf8')
      const { data, body } = parseFrontmatter(raw)
      const title = data.title || file.replace(/\.md$/, '')
      const slug = slugify(file.replace(/\.md$/, '')) || slugify(title) || file.replace(/\.md$/, '')
      if (get('select id from posts where user_id = ? and slug = ?', [userId, slug])) continue

      const date = data.date ? new Date(data.date) : new Date()
      const publishedAt = Number.isNaN(date.getTime()) ? nowIso() : date.toISOString()
      const tags = Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : []
      const content = body.trim()

      run(
        `insert into posts (user_id, slug, title, summary, content, cover, tags, status, views, created_at, updated_at, published_at)
         values (?, ?, ?, ?, ?, ?, ?, 'published', 0, ?, ?, ?)`,
        [
          userId,
          slug,
          title,
          data.description || summarize(content),
          content,
          data.cover || '',
          tagsToText(tags),
          publishedAt,
          publishedAt,
          publishedAt
        ]
      )
      imported += 1
      console.log(`[seed] 导入《${title}》 -> /u/${username}/${slug}`)
    }
  })

  console.log(`[seed] 完成，共导入 ${imported} 篇文章`)
}

main()
