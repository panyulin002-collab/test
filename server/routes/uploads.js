import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { Router } from 'express'
import multer from 'multer'
import { config, paths, ensureDirs } from '../config.js'
import { requireAuth } from '../auth.js'
import { asyncHandler, bad } from '../utils.js'

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'])
const VIDEO_EXT = new Set(['.mp4', '.webm', '.ogv', '.mov', '.m4v'])

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureDirs()
    cb(null, paths.uploads)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: config.maxVideoBytes, files: 1 }
})

function removeQuietly(filePath) {
  fs.promises.unlink(filePath).catch(() => {})
}

const mb = (bytes) => Math.round(bytes / 1024 / 1024)

export const uploadsRouter = Router()

/**
 * 上传图片或视频，返回可直接写进 Markdown 的地址。
 * 只放行白名单后缀，避免有人把 .html 传上来当钓鱼页。
 */
uploadsRouter.post(
  '/',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw bad('没有收到文件')

    const ext = path.extname(req.file.filename).toLowerCase()
    const isImage = IMAGE_EXT.has(ext)
    const isVideo = VIDEO_EXT.has(ext)

    if (!isImage && !isVideo) {
      removeQuietly(req.file.path)
      throw bad('只支持常见图片（jpg/png/gif/webp/avif）与视频（mp4/webm/mov）')
    }
    if (isImage && req.file.size > config.maxImageBytes) {
      removeQuietly(req.file.path)
      throw bad(`图片不能超过 ${mb(config.maxImageBytes)} MB`)
    }

    res.status(201).json({
      url: `/uploads/${req.file.filename}`,
      kind: isImage ? 'image' : 'video',
      name: req.file.originalname,
      size: req.file.size
    })
  })
)
