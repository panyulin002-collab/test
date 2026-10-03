import { Router } from 'express'
import { all, get } from '../db.js'
import { asyncHandler, notFound } from '../utils.js'
import { publicUser, postSummary } from '../serialize.js'

export const usersRouter = Router()

const AUTHOR_JOIN = 'join users u on u.id = p.user_id'
const POST_COLUMNS = 'p.*, u.username as author_username, u.display_name as author_name, u.avatar as author_avatar'

const USER_STATS = `
  (select count(*) from posts p where p.user_id = u.id and p.status = 'published') as post_count,
  (select coalesce(sum(p.views), 0) from posts p where p.user_id = u.id and p.status = 'published') as view_count
`

/** 用户目录：按发文数排序，支持按用户名 / 昵称搜索 */
usersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 40)
    const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 24))
    const like = `%${q}%`

    const rows = all(
      `select u.id, u.username, u.display_name, u.avatar, u.bio, u.created_at, ${USER_STATS}
         from users u
        where (? = '' or u.username like ? or u.display_name like ?)
        order by post_count desc, u.id asc
        limit ?`,
      [q, like, like, limit]
    )

    res.json({
      items: rows.map((row) => ({
        ...publicUser(row),
        postCount: row.post_count,
        viewCount: row.view_count
      })),
      total: get('select count(*) as c from users').c
    })
  })
)

/** 某个人的主页资料 */
usersRouter.get(
  '/:username',
  asyncHandler(async (req, res) => {
    const row = get(
      `select u.id, u.username, u.display_name, u.avatar, u.bio, u.created_at, ${USER_STATS}
         from users u where u.username = ?`,
      [req.params.username]
    )
    if (!row) throw notFound('没有找到这个用户')

    res.json({
      user: {
        ...publicUser(row),
        postCount: row.post_count,
        viewCount: row.view_count
      }
    })
  })
)

/** 某个人的公开文章列表 */
usersRouter.get(
  '/:username/posts',
  asyncHandler(async (req, res) => {
    const user = get('select id from users where username = ?', [req.params.username])
    if (!user) throw notFound('没有找到这个用户')

    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20))

    const rows = all(
      `select ${POST_COLUMNS} from posts p ${AUTHOR_JOIN}
        where p.user_id = ? and p.status = 'published'
        order by coalesce(p.published_at, p.created_at) desc
        limit ? offset ?`,
      [user.id, pageSize, (page - 1) * pageSize]
    )

    res.json({
      items: rows.map(postSummary),
      total: get(`select count(*) as c from posts where user_id = ? and status = 'published'`, [user.id]).c,
      page,
      pageSize
    })
  })
)
