import { textToTags } from './utils.js'

/** 对外输出的用户信息（永远不含密码） */
export function publicUser(row) {
  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name ?? row.displayName,
    avatar: row.avatar || '',
    bio: row.bio || '',
    createdAt: row.created_at ?? row.createdAt ?? null
  }
}

export function publicAuthor(row) {
  return {
    username: row.author_username,
    displayName: row.author_name,
    avatar: row.author_avatar || ''
  }
}

/** 列表用的文章摘要，不含正文 */
export function postSummary(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    cover: row.cover || '',
    tags: textToTags(row.tags),
    status: row.status,
    views: row.views,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    url: `/u/${row.author_username}/${row.slug}`,
    author: publicAuthor(row)
  }
}

/** 详情页用，含正文 */
export function postDetail(row) {
  return { ...postSummary(row), content: row.content }
}
