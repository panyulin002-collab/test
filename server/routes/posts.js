import { Router } from 'express'
import { all, get, run } from '../db.js'
import { requireAuth } from '../auth.js'
import {
  asyncHandler,
  bad,
  forbidden,
  notFound,
  nowIso,
  parseTags,
  slugify,
  summarize,
  tagsToText,
  textToTags,
  clampText
} from '../utils.js'
import { postDetail, postSummary } from '../serialize.js'

export const postsRouter = Router()

const AUTHOR_JOIN = 'join users u on u.id = p.user_id'
const POST_COLUMNS = 'p.*, u.username as author_username, u.display_name as author_name, u.avatar as author_avatar'
const MAX_CONTENT = 300000

/** 校验并整理一篇投稿的字段 */
function normalizePostInput(body) {
  const title = clampText(body?.title, 120).trim()
  const content = String(body?.content ?? '')
  if (!title) throw bad('标题不能为空')
  if (content.length > MAX_CONTENT) throw bad('正文太长了，建议拆成多篇')

  const status = body?.status === 'published' ? 'published' : 'draft'
  const tags = parseTags(body?.tags)
  const summary = clampText(body?.summary, 200) || summarize(content)

  return {
    title,
    content,
    status,
    tags,
    summary,
    cover: clampText(body?.cover, 500),
    slugInput: clampText(body?.slug, 60)
  }
}

/** 同一用户名下保证 slug 唯一 */
function uniqueSlug(userId, slugInput, title) {
  const base =
    slugify(slugInput) || slugify(title) || `post-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`

  let candidate = base
  let index = 2
  while (get('select id from posts where user_id = ? and slug = ?', [userId, candidate])) {
    candidate = `${base}-${index++}`
  }
  return candidate
}

/** 信息流：全部已发布文章，支持搜索 / 标签 / 作者过滤 */
postsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 40)
    const tag = String(req.query.tag || '').trim().slice(0, 20)
    const author = String(req.query.author || '').trim().slice(0, 24)
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(30, Math.max(1, Number(req.query.pageSize) || 9))

    const where = [`p.status = 'published'`]
    const params = []

    if (q) {
      where.push('(p.title like ? or p.summary like ? or p.tags like ? or p.content like ?)')
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`)
    }
    if (tag) {
      where.push(`(',' || p.tags || ',') like ?`)
      params.push(`%,${tag},%`)
    }
    if (author) {
      where.push('u.username = ?')
      params.push(author)
    }

    const clause = where.join(' and ')
    const total = get(`select count(*) as c from posts p ${AUTHOR_JOIN} where ${clause}`, params).c
    const rows = all(
      `select ${POST_COLUMNS} from posts p ${AUTHOR_JOIN}
        where ${clause}
        order by coalesce(p.published_at, p.created_at) desc
        limit ? offset ?`,
      [...params, pageSize, (page - 1) * pageSize]
    )

    res.json({ items: rows.map(postSummary), total, page, pageSize })
  })
)

/** 标签云：统计已发布文章里出现过的标签 */
postsRouter.get(
  '/tags',
  asyncHandler(async (_req, res) => {
    const counts = new Map()
    for (const row of all(`select tags from posts where status = 'published'`)) {
      for (const tag of textToTags(row.tags)) counts.set(tag, (counts.get(tag) || 0) + 1)
    }
    const items = [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 30)
    res.json({ items })
  })
)

/** 文章详情：/api/posts/:username/:slug */
postsRouter.get(
  '/:username/:slug',
  asyncHandler(async (req, res) => {
    const row = get(
      `select ${POST_COLUMNS} from posts p ${AUTHOR_JOIN}
        where u.username = ? and p.slug = ?`,
      [req.params.username, req.params.slug]
    )
    if (!row) throw notFound('文章不存在或已被删除')

    const isOwner = Boolean(req.user && req.user.id === row.user_id)
    if (row.status !== 'published' && !isOwner) throw notFound('文章不存在或未公开')

    if (row.status === 'published' && !isOwner) {
      run('update posts set views = views + 1 where id = ?', [row.id])
      row.views += 1
    }

    const authorRow = get(
      `select u.id, u.username, u.display_name, u.avatar, u.bio, u.created_at,
              (select count(*) from posts p where p.user_id = u.id and p.status = 'published') as post_count,
              (select coalesce(sum(p.views), 0) from posts p where p.user_id = u.id and p.status = 'published') as view_count
         from users u where u.id = ?`,
      [row.user_id]
    )

    const more = all(
      `select ${POST_COLUMNS} from posts p ${AUTHOR_JOIN}
        where p.user_id = ? and p.status = 'published' and p.id <> ?
        order by coalesce(p.published_at, p.created_at) desc limit 5`,
      [row.user_id, row.id]
    )

    res.json({
      post: postDetail(row),
      author: {
        username: authorRow.username,
        displayName: authorRow.display_name,
        avatar: authorRow.avatar,
        bio: authorRow.bio,
        postCount: authorRow.post_count,
        viewCount: authorRow.view_count
      },
      more: more.map(postSummary),
      isOwner
    })
  })
)

/** 新建文章 */
postsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = normalizePostInput(req.body)
    const slug = uniqueSlug(req.user.id, input.slugInput, input.title)
    const now = nowIso()

    const result = run(
      `insert into posts (user_id, slug, title, summary, content, cover, tags, status, views, created_at, updated_at, published_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [
        req.user.id,
        slug,
        input.title,
        input.summary,
        input.content,
        input.cover,
        tagsToText(input.tags),
        input.status,
        now,
        now,
        input.status === 'published' ? now : null
      ]
    )

    const row = get(`select ${POST_COLUMNS} from posts p ${AUTHOR_JOIN} where p.id = ?`, [
      Number(result.lastInsertRowid)
    ])
    res.status(201).json({ post: postDetail(row) })
  })
)

/** 修改文章（仅作者本人） */
postsRouter.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const existing = get('select * from posts where id = ?', [id])
    if (!existing) throw notFound('文章不存在')
    if (existing.user_id !== req.user.id) throw forbidden('只能修改自己的文章')

    const input = normalizePostInput(req.body)
    const slug =
      input.slugInput && slugify(input.slugInput) !== existing.slug
        ? uniqueSlug(req.user.id, input.slugInput, input.title)
        : existing.slug

    run(
      `update posts set slug = ?, title = ?, summary = ?, content = ?, cover = ?, tags = ?,
              status = ?, updated_at = ?, published_at = ? where id = ?`,
      [
        slug,
        input.title,
        input.summary,
        input.content,
        input.cover,
        tagsToText(input.tags),
        input.status,
        nowIso(),
        input.status === 'published' ? existing.published_at || nowIso() : existing.published_at,
        id
      ]
    )

    const row = get(`select ${POST_COLUMNS} from posts p ${AUTHOR_JOIN} where p.id = ?`, [id])
    res.json({ post: postDetail(row) })
  })
)

/** 删除文章（仅作者本人） */
postsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id)
    const existing = get('select id, user_id from posts where id = ?', [id])
    if (!existing) throw notFound('文章不存在')
    if (existing.user_id !== req.user.id) throw forbidden('只能删除自己的文章')
    run('delete from posts where id = ?', [id])
    res.json({ ok: true })
  })
)
