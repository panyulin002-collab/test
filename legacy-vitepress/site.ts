/**
 * 全站信息集中配置。
 * 导航、页脚、首页卡片、社交链接都从这里取值，改一处即可全站生效。
 */
export const site = {
  /** 站点名，显示在浏览器标题、导航栏和页脚 */
  name: '一任阶前',
  /** 首页副标题 / SEO 描述 */
  description: '记录技术学习、项目经验与生活随笔的个人博客',
  /** 构建产物里的作者信息 */
  author: 'panyulin002',
  /** 仓库地址：换成自己的仓库后，「在 GitHub 上编辑此页」会指向正确位置 */
  repo: 'https://github.com/panyulin002-collab/test',
  /** 分支名，用于生成编辑链接 */
  repoBranch: 'main',

  /** 首页左侧个人卡片 */
  profile: {
    /** 头像（放在 docs/public 下的文件，用 /文件名 引用） */
    avatar: '/avatar.webp',
    /** 签名 */
    signature: '一任阶前，点滴到天明',
    email: 'panyulin002@gmail.com',
    bilibili: {
      name: 'B 站',
      url: 'https://space.bilibili.com/90523078'
    },
    github: {
      name: 'GitHub',
      url: 'https://github.com/panyulin002-collab'
    }
  },

  /** 首页 hero 背景图：大屏 / 小屏两种尺寸，浏览器会按需选择 */
  hero: {
    image: '/hero.webp',
    imageSmall: '/hero-sm.webp'
  }
}

export type Site = typeof site
