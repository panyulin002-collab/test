import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import HomeContent from './components/HomeContent.vue'
import PostList from './components/PostList.vue'
import './styles/custom.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    // 保留默认导航栏（含右上角搜索框），仅在首页顶部注入自定义内容
    return h(DefaultTheme.Layout, null, {
      'home-hero-before': () => h(HomeContent)
    })
  },
  enhanceApp({ app }) {
    // 全局注册后，Markdown 里可以直接写 <PostList />
    app.component('PostList', PostList)
  }
}
