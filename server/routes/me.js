import { Router } from 'express'
import { all, get, run, tx } from '../db.js'
import { hashPassword, verifyPassword, requireAuth } from '../auth.js'
import { asyncHandler, bad, clampText, notFound, validateDisplayName, validatePassword } from '../utils.js'
import { postDetail, postSummary } from '../serialize.js'

export const meRouter = Router()

const MY_POST_COLUMNS =
  'p.*, u.username as author_username, u.display_name as author_name, u.avatar as author_avatar'
const AUTHOR_JOIN = 'join users u on u.id = p.user_id'

function statsFor(userId) {
  const row = get(
    `select
       (select count(*) from posts where user_id = ?) as total,
       (select count(*) from posts where user_id = ? and status = 'published') as published,
       (select count(*) from posts where user_id = ? and status = 'draft') as draft,
       (select coalesce(sum(views), 0) from posts where user_id = ? and status = 'published') as views`,
    [userId, userId, userId, userId]
  )
  return { total: row.total, published: row.published, draft: row.draft, views: row.views }
}

meRouter.use(requireAuth)

/** 个人中心顶部信息 */
meRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ user: req.user, stats: statsFor(req.user.id) })
  })
)

/** 修改资料，带上 newPassword 时同时改密码 */
meRouter.put(
  '/',
  asyncHandler(async (req, res) => {
    const displayName = validateDisplayName(req.body?.displayName ?? req.user.displayName)
    const bio = clampText(req.body?.bio ?? '', 300)
    const avatar = clampText(req.body?.avatar ?? '', 500)

    // 先把密码校验过再落库，避免密码填错时资料却被改了一半
    const wantsPasswordChange = Boolean(req.body?.newPassword)
    let passwordHash = null
    if (wantsPasswordChange) {
      const row = get('select password_hash from users where id = ?', [req.user.id])
      if (!verifyPassword(String(req.body?.currentPassword ?? ''), row.password_hash)) {
        throw bad('当前密码不正确')
      }
      passwordHash = hashPassword(validatePassword(req.body.newPassword, '新密码'))
    }

    tx(() => {
      run('update users set display_name = ?, bio = ?, avatar = ? where id = ?', [
        displayName,
        bio,
        avatar,
        req.user.id
      ])
      if (passwordHash) {
        run('update users set password_hash = ? where id = ?', [passwordHash, req.user.id])
      }
    })

    const updated = get(
      'select id, username, display_name, avatar, bio, created_at from users where id = ?',
      [req.user.id]
    )
    res.json({
      user: {
        id: updated.id,
        username: updated.username,
        displayName: updated.display_name,
        avatar: updated.avatar,
        bio: updated.bio,
        createdAt: updated.created_at
      }
    })
  })
)

/** 我的文章：status = all | published | draft */
meRouter.get(
  '/posts',
  asyncHandler(async (req, res) => {
    const status = ['published', 'draft'].includes(req.query.status) ? req.query.status : null
    const q = String(req.query.q || '').trim().slice(0, 40)

    const where = ['p.user_id = ?']
    const params = [req.user.id]
    if (status) {
      where.push('p.status = ?')
      params.push(status)
    }
    if (q) {
      where.push('(p.title like ? or p.tags like ?)')
      params.push(`%${q}%`, `%${q}%`)
    }

    const rows = all(
      `select ${MY_POST_COLUMNS} from posts p ${AUTHOR_JOIN}
        where ${where.join(' and ')}
        order by p.updated_at desc`,
      params
    )

    res.json({ items: rows.map(postSummary), stats: statsFor(req.user.id) })
  })
)

/** 编辑页用：取自己某篇文章的完整内容（含正文） */
meRouter.get(
  '/posts/:id',
  asyncHandler(async (req, res) => {
    const row = get(
      `select ${MY_POST_COLUMNS} from posts p ${AUTHOR_JOIN}
        where p.id = ? and p.user_id = ?`,
      [Number(req.params.id), req.user.id]
    )
    if (!row) throw notFound('文章不存在或不属于你')
    res.json({ post: postDetail(row) })
  })
)
