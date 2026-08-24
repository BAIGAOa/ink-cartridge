import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
const base = process.env.DOCS_BASE ?? '/'

export default defineConfig({
  base,
  title: "ink-cartridge-doc",
  description: "A React Ink component kit for building terminal UIs — layered keyboard engine, screen routing, and full mouse integration.",
  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/BAIGAOa/ink-cartridge' }
    ]
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Quick Start', link: '/quick-start-1' }
        ],
        sidebar: [
          {
            text: 'Guide',
            items: [
              { text: 'Quick Start', link: '/quick-start-1' }
            ]
          },
          {
            text: 'Screen System',
            items: [
              { text: 'Use registerComponent', link: '/screen/screen-registry'}
            ]
          }
        ]
      }
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      description: "基于 React Ink 的终端 UI 组件库——分层键盘引擎、屏幕路由与完整鼠标联动。",
      themeConfig: {
        nav: [
          { text: '首页', link: '/zh/' },
          { text: '快速开始', link: '/zh/quick-start-1' }
        ],
        sidebar: [
          {
            text: '指南',
            items: [
              { text: '快速开始', link: '/zh/quick-start-1' }
            ]
          },
          {
            text: '屏幕系统',
            items: [
              { text: '使用 registerComponent', link: '/zh/screen/screen-registry'}
            ]
          }
        ]
      }
    }
  }
})
