import crypto from 'node:crypto'
import { config } from './config.js'
import { run, get } from './db.js'
import { getCookie, setCookie, unauthorized, nowIso } from './utils.js'

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 }

/** 生成 `scrypt$N$r$p$salt$hash` 格式的密码散列 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const derived = crypto.scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p })
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), derived.toString('base64')].join('$')
}

/** 校验密码，比较过程用固定时间算法 */
export function verifyPassword(password, stored) {
  try {
    const [scheme, n, r, p, salt, hash] = String(stored).split('$')
    if (scheme !== 'scrypt') return false
    const expected = Buffer.from(hash, 'base64')
    const derived = crypto.scryptSync(password, Buffer.from(salt, 'base64'), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p)
    })
    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex')

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + config.sessionDays * 86400 * 1000).toISOString()
  run('insert into sessions (token_hash, user_id, created_at, expires_at) values (?, ?, ?, ?)', [
    sha256(token),
    userId,
    nowIso(),
    expiresAt
  ])
  return { token, expiresAt }
}

export function destroySession(token) {
  if (!token) return
  run('delete from sessions where token_hash = ?', [sha256(token)])
}

/** 用 token 找到用户；顺带做滑动续期，长期活跃的用户不会中途掉线 */
export function userFromToken(token) {
  if (!token) return null
  const row = get(
    `select s.token_hash, s.expires_at as session_expires,
            u.id, u.username, u.display_name, u.avatar, u.bio, u.created_at
       from sessions s join users u on u.id = s.user_id
      where s.token_hash = ?`,
    [sha256(token)]
  )
  if (!row) return null
  if (new Date(row.session_expires).getTime() < Date.now()) {
    destroySession(token)
    return null
  }
  const remaining = new Date(row.session_expires).getTime() - Date.now()
  if (remaining < config.sessionDays * 86400 * 1000 * 0.5) {
    const expiresAt = new Date(Date.now() + config.sessionDays * 86400 * 1000).toISOString()
    run('update sessions set expires_at = ? where token_hash = ?', [expiresAt, sha256(token)])
  }
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatar: row.avatar,
    bio: row.bio,
    createdAt: row.created_at
  }
}

export function readSessionToken(req) {
  return getCookie(req, config.cookieName)
}

export function startSession(res, userId) {
  const { token, expiresAt } = createSession(userId)
  setCookie(res, config.cookieName, token, {
    maxAge: config.sessionDays * 86400,
    secure: config.secureCookie
  })
  return expiresAt
}

export function endSession(req, res) {
  destroySession(readSessionToken(req))
  setCookie(res, config.cookieName, '', { maxAge: 0, secure: config.secureCookie })
}

/** 每个请求都尝试识别用户，失败就当游客 */
export function attachUser(req, _res, next) {
  req.user = userFromToken(readSessionToken(req))
  next()
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(unauthorized())
  next()
}

/** 简易登录限流：同一 IP + 用户名 10 分钟内最多失败 8 次 */
const attempts = new Map()
const WINDOW = 10 * 60 * 1000
const MAX_ATTEMPTS = 8

export function loginRateLimit(req, _res, next) {
  const key = `${req.ip}|${String(req.body?.username || '').toLowerCase()}`
  const record = attempts.get(key)
  if (record && Date.now() - record.first < WINDOW && record.count >= MAX_ATTEMPTS) {
    return next(Object.assign(new Error('失败次数过多，请稍后再试'), { status: 429 }))
  }
  req.loginAttemptKey = key
  next()
}

export function recordLoginFailure(req) {
  const key = req.loginAttemptKey
  if (!key) return
  const record = attempts.get(key)
  if (!record || Date.now() - record.first > WINDOW) {
    attempts.set(key, { first: Date.now(), count: 1 })
  } else {
    record.count += 1
  }
}

export function clearLoginFailures(req) {
  if (req.loginAttemptKey) attempts.delete(req.loginAttemptKey)
}
