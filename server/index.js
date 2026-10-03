import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import { MulterError } from 'multer'
import { config, paths, ensureDirs } from './config.js'
import { getDb, get } from './db.js'
import { attachUser } from './auth.js'
import { authRouter } from './routes/auth.js'
import { usersRouter } from './routes/users.js'
import { postsRouter } from './routes/posts.js'
import { meRouter } from './routes/me.js'
import { uploadsRouter } from './routes/uploads.js'

const app = express()

app.set('trust proxy', true)
app.disable('x-powered-by')
app.use(express.json({ limit: '4mb' }))

// 只有接口需要知道当前登录用户，静态资源和页面不用查库
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) return next()
  attachUser(req, res, next)
})

/**
 * 简单可靠的 CSRF 防护：改动数据的请求如果带了 Origin，
 * 必须和当前访问的站点同源；同源 Cookie 又是 SameSite=Lax，跨站表单提交拿不到登录态。
 */
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const origin = req.headers.origin
  if (!origin) return next()
  try {
    const host = new URL(origin).host
    if (host === req.headers.host) return next()
  } catch {
    /* 解析失败按不通过处理 */
  }
  res.status(403).json({ error: '请求来源不被允许' })
})

/** 站点公开信息，首页顶部用 */
app.get('/api/site', (_req, res) => {
  res.json({
    name: config.siteName,
    description: config.siteDescription,
    registrationOpen: config.registrationOpen,
    stats: {
      users: get('select count(*) as c from users').c,
      posts: get(`select count(*) as c from posts where status = 'published'`).c,
      views: get(`select coalesce(sum(views), 0) as c from posts where status = 'published'`).c
    },
    limits: {
      imageMB: Math.round(config.maxImageBytes / 1024 / 1024),
      videoMB: Math.round(config.maxVideoBytes / 1024 / 1024)
    }
  })
})

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/posts', postsRouter)
app.use('/api/me', meRouter)
app.use('/api/uploads', uploadsRouter)

app.use('/api', (_req, res) => {
  res.status(404).json({ error: '接口不存在' })
})

/** 用户上传的图片视频 */
app.use(
  '/uploads',
  express.static(paths.uploads, {
    maxAge: '365d',
    immutable: true,
    setHeaders(res) {
      res.setHeader('X-Content-Type-Options', 'nosniff')
    }
  })
)

/** 前端构建产物 */
const indexHtmlPath = path.join(config.webDist, 'index.html')
let cachedHtml = null
let cachedMtime = 0

function readIndexHtml() {
  try {
    const stat = fs.statSync(indexHtmlPath)
    if (!cachedHtml || stat.mtimeMs !== cachedMtime) {
      cachedHtml = fs.readFileSync(indexHtmlPath, 'utf8')
      cachedMtime = stat.mtimeMs
    }
    return cachedHtml
  } catch {
    return null
  }
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** 生成页面标题与分享卡片信息，让搜索引擎和微信能拿到正确摘要 */
function metaFor(pathname) {
  const isPost = pathname.startsWith('/posts/')
  const matched = /^\/u\/([^/]+)(?:\/([^/]+))?\/?$/.exec(pathname)
  const base = isPost ? null : matched

  if (base) {
    const [, username, slug] = base
    if (slug) {
      const row = get(
        `select p.title, p.summary, p.cover, p.status, p.published_at, u.display_name
           from posts p join users u on u.id = p.user_id
          where u.username = ? and p.slug = ?`,
        [decodeURIComponent(username), decodeURIComponent(slug)]
      )
      if (row && row.status === 'published') {
        return {
          title: row.title,
          description: row.summary || config.siteDescription,
          type: 'article',
          image: row.cover || '',
          author: row.display_name
        }
      }
    } else {
      const row = get('select display_name, bio from users where username = ?', [
        decodeURIComponent(username)
      ])
      if (row) {
        return {
          title: `${row.display_name} 的主页`,
          description: row.bio || `${row.display_name} 在 ${config.siteName} 上发布的文章`,
          type: 'profile'
        }
      }
    }
  }

  return { title: '', description: config.siteDescription, type: 'website' }
}

function renderHtml(pathname) {
  const html = readIndexHtml()
  if (!html) return null

  const meta = metaFor(pathname)
  const fullTitle = meta.title ? `${meta.title} · ${config.siteName}` : config.siteName
  const canonical = config.siteUrl ? `${config.siteUrl.replace(/\/$/, '')}${pathname}` : ''
  const tags = [
    `<title>${escapeHtml(fullTitle)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}">`,
    `<meta property="og:type" content="${meta.type}">`,
    `<meta property="og:title" content="${escapeHtml(fullTitle)}">`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}">`,
    `<meta name="twitter:card" content="summary">`,
    canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}">` : '',
    meta.image ? `<meta property="og:image" content="${escapeHtml(meta.image)}">` : ''
  ]
    .filter(Boolean)
    .join('\n    ')

  // 整块替换 index.html 里的 meta 占位，避免出现两个 <title>
  return html.replace(
    /<!--meta:start-->[\s\S]*?<!--meta:end-->/,
    `<!--meta:start-->\n    ${tags}\n    <!--meta:end-->`
  )
}

app.use(
  express.static(config.webDist, {
    index: false,
    setHeaders(res, filePath) {
      if (/\.(js|css|woff2?|webp|svg|png|jpg|avif)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=604800')
      }
    }
  })
)

/** 其余地址都交给前端路由（单页应用） */
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()
  const html = renderHtml(req.path)
  if (!html) {
    return res
      .status(503)
      .type('html')
      .send(
        '<h1>前端还没构建</h1><p>请先在项目目录执行 <code>npm run build</code>，或用 <code>npm run dev</code> 开发模式启动。</p>'
      )
  }
  res.setHeader('Cache-Control', 'no-cache')
  res.type('html').send(html)
})

/** 统一错误处理 */
app.use((err, _req, res, _next) => {
  if (err instanceof MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `文件太大了，单个文件不能超过 ${Math.round(config.maxVideoBytes / 1024 / 1024)} MB`
        : '文件上传失败，请重试'
    return res.status(400).json({ error: message })
  }

  const status = Number(err?.status) || 500
  if (status >= 500) console.error('[server]', err)
  res.status(status).json({ error: status >= 500 ? '服务器出错了，请稍后再试' : err.message })
})

ensureDirs()
getDb()

app.listen(config.port, config.host, () => {
  const hasDist = fs.existsSync(indexHtmlPath)
  console.log(`[server] ${config.siteName} 已启动: http://localhost:${config.port}`)
  console.log(`[server] 数据目录: ${config.dataDir}`)
  if (!hasDist) console.log('[server] 提示: 还没构建前端，先跑 npm run build（开发模式可用 npm run dev）')
})
