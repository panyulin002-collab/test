import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 本项目用 Node 24 内置的 node:sqlite，好处是没有任何需要本地编译的依赖，
 * 换机器 / 换服务器都不用折腾编译环境。
 */
const nodeMajor = Number(process.versions.node.split('.')[0])
if (nodeMajor < 24) {
  throw new Error(
    `需要 Node.js 24 或更高版本（当前 ${process.versions.node}）。` +
      'Node 24 起内置了 node:sqlite，可省去所有原生模块编译；推荐用 Node 24 LTS。'
  )
}

/** 项目根目录（blog/） */
const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)))

function num(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const config = {
  rootDir,
  /** 监听端口，本地开发 3000，线上一般由 Nginx 反代到这个端口 */
  port: num(process.env.PORT, 3000),
  host: process.env.HOST || '0.0.0.0',

  /** 运行时数据目录：SQLite 数据库与用户上传的图片视频都放这里 */
  dataDir: process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(rootDir, 'data'),
  /** 前端构建产物目录 */
  webDist: path.join(rootDir, 'web', 'dist'),

  siteName: process.env.SITE_NAME || '一任阶前',
  siteDescription:
    process.env.SITE_DESCRIPTION ||
    '多用户博客平台：注册账号写下自己的文章，也可以逛逛别人的主页。',
  /** 例如 https://example.com，留空则用相对地址 */
  siteUrl: process.env.SITE_URL || '',

  /** 登录状态保持天数 */
  sessionDays: num(process.env.SESSION_DAYS, 30),
  cookieName: 'blog_session',
  /** 站点跑在 HTTPS 后面时设为 1，Cookie 会带上 Secure */
  secureCookie: process.env.COOKIE_SECURE === '1',
  /** 设为 0 可关闭注册，只保留已有账号 */
  registrationOpen: process.env.REGISTRATION_OPEN !== '0',

  maxImageBytes: num(process.env.MAX_IMAGE_MB, 10) * 1024 * 1024,
  maxVideoBytes: num(process.env.MAX_VIDEO_MB, 300) * 1024 * 1024
}

export const paths = {
  uploads: path.join(config.dataDir, 'uploads'),
  dbFile: path.join(config.dataDir, 'blog.sqlite')
}

export function ensureDirs() {
  fs.mkdirSync(paths.uploads, { recursive: true })
}
