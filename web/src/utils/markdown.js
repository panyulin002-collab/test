import { Marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import diff from 'highlight.js/lib/languages/diff'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import nginx from 'highlight.js/lib/languages/nginx'
import plaintext from 'highlight.js/lib/languages/plaintext'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import DOMPurify from 'dompurify'

// 只注册常用语言，避免把整个 highlight.js（约 1 MB）打进包里
const LANGUAGES = {
  bash,
  css,
  diff,
  go,
  java,
  javascript,
  json,
  markdown,
  nginx,
  plaintext,
  python,
  rust,
  sql,
  typescript,
  xml,
  yaml
}

const ALIASES = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  console: 'bash',
  py: 'python',
  yml: 'yaml',
  html: 'xml',
  vue: 'xml',
  svg: 'xml',
  md: 'markdown',
  text: 'plaintext',
  txt: 'plaintext',
  conf: 'nginx'
}

for (const [name, language] of Object.entries(LANGUAGES)) {
  hljs.registerLanguage(name, language)
}

/** 允许嵌入的视频站点，其它来源的 iframe 一律丢掉 */
const EMBED_HOSTS = [
  'player.bilibili.com',
  'www.bilibili.com',
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'player.youku.com',
  'v.qq.com',
  'player.vimeo.com',
  'vimeo.com'
]

export const EMBED_HOST_LIST = EMBED_HOSTS

const renderer = {
  code(token) {
    const raw = String(token.lang || '').trim().split(/\s+/)[0].toLowerCase()
    const language = ALIASES[raw] || raw
    const source = token.text || ''
    let highlighted
    try {
      highlighted = language && hljs.getLanguage(language)
        ? hljs.highlight(source, { language }).value
        : hljs.highlightAuto(source, Object.keys(LANGUAGES)).value
    } catch {
      highlighted = escapeHtml(source)
    }
    return `<div class="code-block"><button class="code-copy" type="button" data-copy>复制</button><pre><code class="hljs">${highlighted}</code></pre></div>`
  },
  link(token) {
    const href = String(token.href || '')
    const external = /^https?:\/\//i.test(href)
    const text = this.parser.parseInline(token.tokens || [])
    const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : ''
    return `<a href="${escapeHtml(href)}"${attrs}>${text}</a>`
  },
  image(token) {
    const src = String(token.href || '')
    const alt = escapeHtml(token.text || '')
    return `<img src="${escapeHtml(src)}" alt="${alt}" loading="lazy" decoding="async">`
  }
}

const marked = new Marked({ gfm: true, breaks: true })
marked.use({ renderer })

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 把协议相对地址补成 https，顺手校验是不是白名单里的视频站 */
function normalizeEmbed(src) {
  const raw = String(src || '').trim()
  if (!raw) return ''
  const absolute = raw.startsWith('//') ? `https:${raw}` : raw
  try {
    const url = new URL(absolute, window.location.origin)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''
    if (!EMBED_HOSTS.includes(url.hostname)) return ''
    return url.toString()
  } catch {
    return ''
  }
}

/** 清洗后再处理一遍 iframe：非白名单来源直接移除 */
function filterEmbeds(html) {
  const holder = document.createElement('div')
  holder.innerHTML = html

  holder.querySelectorAll('iframe').forEach((frame) => {
    const safe = normalizeEmbed(frame.getAttribute('src'))
    if (!safe) {
      frame.remove()
      return
    }
    frame.setAttribute('src', safe)
    frame.setAttribute('allowfullscreen', 'true')
    frame.setAttribute('loading', 'lazy')
    frame.setAttribute('referrerpolicy', 'no-referrer')
  })

  holder.querySelectorAll('video').forEach((video) => {
    video.setAttribute('controls', 'controls')
    video.setAttribute('preload', 'metadata')
  })

  return holder.innerHTML
}

const PURIFY_CONFIG = {
  ADD_TAGS: ['video', 'source', 'iframe', 'figure', 'figcaption', 'mark', 'kbd', 'details', 'summary'],
  ADD_ATTR: [
    'allowfullscreen',
    'allow',
    'frameborder',
    'scrolling',
    'referrerpolicy',
    'controls',
    'poster',
    'preload',
    'playsinline',
    'loop',
    'muted',
    'kind',
    'label',
    'colspan',
    'rowspan',
    'align',
    'data-copy'
  ],
  FORBID_TAGS: ['style', 'form', 'input', 'button', 'script', 'link', 'meta'],
  FORBID_ATTR: ['style', 'onerror', 'onclick', 'onload']
}

/** Markdown -> 可安全插入页面的 HTML */
export function renderMarkdown(markdown) {
  const html = marked.parse(String(markdown || ''))
  return filterEmbeds(DOMPurify.sanitize(html, PURIFY_CONFIG))
}

export { escapeHtml }
