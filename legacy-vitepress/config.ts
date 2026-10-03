import { defineConfig } from 'vitepress'
import { site } from './site'
import { postsSidebar } from './posts.node'

/**
 * 部署在 GitHub Pages 项目页（https://用户名.github.io/仓库名/）时，
 * 构建前设置环境变量 VITEPRESS_BASE=/仓库名/ 即可，本地开发无需设置。
 */
const base = process.env.VITEPRESS_BASE || '/'
const siteUrl = process.env.VITEPRESS_SITE_URL
const year = new Date().getFullYear()

export default defineConfig({
  title: site.name,
  description: site.description,
  lang: 'zh-CN',
  base,
  cleanUrls: true,
  lastUpdated: true,
  // 站外链接统一在新标签页打开
  markdown: {
    lineNumbers: true,
    externalLinkIcon: true
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }],
    ['meta', { name: 'author', content: site.author }],
    ['meta', { name: 'theme-color', content: '#764ba2' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: site.name }],
    ['meta', { property: 'og:description', content: site.description }]
  ],

  ...(siteUrl ? { sitemap: { hostname: siteUrl } } : {}),

  themeConfig: {
    logo: '/avatar.webp',
    siteTitle: site.name,

    nav: [
      { text: '首页', link: '/' },
      { text: '文章', link: '/posts/' },
      { text: '关于', link: '/about' }
    ],

    // 侧边栏由 docs/posts 目录自动生成，新增文章无需改配置
    sidebar: {
      '/posts/': postsSidebar()
    },

    socialLinks: [{ icon: 'github', link: site.profile.github.url }],

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索',
            buttonAriaLabel: '搜索文档'
          },
          modal: {
            noResultsText: '没有找到相关结果',
            resetButtonTitle: '清除查询条件',
            displayDetails: '显示详细信息',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭'
            }
          }
        }
      }
    },

    outline: {
      level: [2, 3],
      label: '本页目录'
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: { dateStyle: 'short', timeStyle: 'short' }
    },

    editLink: {
      pattern: `${site.repo}/edit/${site.repoBranch}/docs/:path`,
      text: '在 GitHub 上编辑此页'
    },

    footer: {
      message: '基于 VitePress 构建 · 内容以 Markdown 撰写',
      copyright: `Copyright © ${year} ${site.author}`
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '外观',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式'
  }
})
