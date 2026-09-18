import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import HomeContent from './components/HomeContent.vue'


export default {
  extends: DefaultTheme,
  Layout: () => {
    // 保留默认导航栏（含右上角搜索框），仅在首页 hero 区注入自定义九宫格内容
    return h(DefaultTheme.Layout, null, {
      'home-hero-before': () => h(HomeContent)
    })
  }
}
