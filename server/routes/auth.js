import { Router } from 'express'
import { config } from '../config.js'
import { get, run } from '../db.js'
import {
  hashPassword,
  verifyPassword,
  startSession,
  endSession,
  loginRateLimit,
  recordLoginFailure,
  clearLoginFailures
} from '../auth.js'
import {
  asyncHandler,
  bad,
  forbidden,
  unauthorized,
  normalizeUsername,
  validateUsername,
  validateDisplayName,
  validatePassword,
  nowIso
} from '../utils.js'
import { publicUser } from '../serialize.js'

export const authRouter = Router()

/** 注册：用户名 + 昵称 + 密码，成功后直接登录 */
authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    if (!config.registrationOpen) throw forbidden('本站暂未开放注册')

    const username = validateUsername(req.body?.username)
    const displayName = validateDisplayName(req.body?.displayName || username)
    const password = validatePassword(req.body?.password)

    if (get('select id from users where username = ?', [username])) {
      throw bad('这个用户名已经被占用了')
    }

    const result = run(
      'insert into users (username, display_name, password_hash, bio, avatar, created_at) values (?, ?, ?, ?, ?, ?)',
      [username, displayName, hashPassword(password), '', '', nowIso()]
    )
    const id = Number(result.lastInsertRowid)
    startSession(res, id)
    res.status(201).json({ user: publicUser(get('select * from users where id = ?', [id])) })
  })
)

/** 登录 */
authRouter.post(
  '/login',
  loginRateLimit,
  asyncHandler(async (req, res) => {
    const username = normalizeUsername(req.body?.username)
    const password = String(req.body?.password ?? '')
    if (!username || !password) throw bad('请填写用户名和密码')

    const row = get('select * from users where username = ?', [username])
    if (!row || !verifyPassword(password, row.password_hash)) {
      recordLoginFailure(req)
      throw unauthorized('用户名或密码不正确')
    }

    clearLoginFailures(req)
    startSession(res, row.id)
    res.json({ user: publicUser(row) })
  })
)

/** 退出登录 */
authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    endSession(req, res)
    res.json({ ok: true })
  })
)

/** 当前登录状态，前端启动时调用一次 */
authRouter.get(
  '/session',
  asyncHandler(async (req, res) => {
    res.json({ user: req.user || null })
  })
)
