/** 带状态码的错误，路由里直接 throw，由统一错误处理返回 JSON */
export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export const bad = (message) => new HttpError(400, message)
export const unauthorized = (message = '请先登录') => new HttpError(401, message)
export const forbidden = (message = '没有权限') => new HttpError(403, message)
export const notFound = (message = '内容不存在') => new HttpError(404, message)

/** 包一层，让 async 路由里抛出的错误能进到错误处理中间件 */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}

export function nowIso() {
  return new Date().toISOString()
}

export function getCookie(req, name) {
  const header = req.headers.cookie
  if (!header) return null
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    if (part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim())
      } catch {
        return null
      }
    }
  }
  return null
}

export function setCookie(res, name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path || '/'}`]
  if (options.maxAge != null) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`)
  if (options.httpOnly !== false) parts.push('HttpOnly')
  parts.push(`SameSite=${options.sameSite || 'Lax'}`)
  if (options.secure) parts.push('Secure')

  const previous = res.getHeader('Set-Cookie')
  const list = previous ? (Array.isArray(previous) ? previous : [previous]) : []
  res.setHeader('Set-Cookie', [...list, parts.join('; ')])
}

export const USERNAME_RE = /^[a-zA-Z0-9_-]{3,24}$/
export const MAX_TAGS = 6
export const MAX_TAG_LENGTH = 16

export function normalizeUsername(value) {
  return String(value ?? '').trim().replace(/^@+/, '')
}

export function validateUsername(value) {
  const username = normalizeUsername(value)
  if (!USERNAME_RE.test(username)) {
    throw bad('用户名需为 3-24 位字母、数字、下划线或短横线')
  }
  return username
}

export function validateDisplayName(value) {
  const name = String(value ?? '').trim()
  if (!name) throw bad('昵称不能为空')
  if (name.length > 30) throw bad('昵称不能超过 30 个字')
  return name
}

export function validatePassword(value, field = '密码') {
  const password = String(value ?? '')
  if (password.length < 6) throw bad(`${field}至少 6 位`)
  if (password.length > 128) throw bad(`${field}不能超过 128 位`)
  return password
}

/** 把标题转成 URL 片段；中文标题转不出内容时由调用方兜底 */
export function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** 标签统一成数组：支持数组、逗号、空格分隔 */
export function parseTags(input, max = MAX_TAGS) {
  const raw = Array.isArray(input) ? input : String(input ?? '').split(/[,，、\s]+/)
  const tags = []
  for (const item of raw) {
    const tag = String(item).trim().replace(/^#+/, '')
    if (!tag || tag.length > MAX_TAG_LENGTH) continue
    if (!tags.includes(tag)) tags.push(tag)
    if (tags.length >= max) break
  }
  return tags
}

export function tagsToText(tags) {
  return parseTags(tags).join(',')
}

export function textToTags(text) {
  return String(text || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

/** 从正文里截一段纯文本摘要 */
export function summarize(markdown, limit = 110) {
  const text = String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*`_~|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > limit ? `${text.slice(0, limit)}…` : text
}

export function clampText(value, limit) {
  const text = String(value ?? '').trim()
  return text.length > limit ? text.slice(0, limit) : text
}
