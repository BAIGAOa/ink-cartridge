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
            text: 'Base',
            items: [
              { text: 'Organize Your Screen', link: '/screen/screen-registry'},
              { text: 'Basic Binding', link: '/keyboard/base-bind'},
              { text: 'Navigation', link: '/screen/navigation'},
              { text: 'Intermediate Binding', link: '/keyboard/boundKeyboard-advanced'},
              { text: 'Focus System', link: '/keyboard/focus-system'}
            ]
          },
          {
            text: 'Intermediate',
            items: [
              { text: 'Layer Basics', link: '/screen/layer-base'},
              { text: 'Keyboard Events Between Layers', link: '/screen/layer-keyboard'},
              { text: 'Layer Element Keyboard', link: '/screen/layer-element-keyboard'},
              { text: 'Modal Layer Basics', link: '/screen/modal-layer-base'},
              { text: 'Modal Layer Keyboard Events', link: '/screen/modal-layer-keyboard'},
              { text: 'Modal Layer Element Keyboard', link: '/screen/modal-layer-element-keyboard'},
              { text: 'Passing Keys with allowModal', link: '/screen/allow-modal'},
              { text: 'Modal Missed Keys', link: '/screen/modal-miss-listener'}
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
            text: '基础',
            items: [
              { text: '组织屏幕', link: '/zh/screen/screen-registry'},
              { text: '基本绑定', link: '/zh/keyboard/base-bind'},
              { text: '屏幕导航', link: '/zh/screen/navigation'},
              { text: '中级绑定', link: '/zh/keyboard/boundKeyboard-advanced'},
              { text: '焦点系统', link: '/zh/keyboard/focus-system'}
            ]
          },
          {
            text: '中阶',
            items: [
              { text: '普通图层', link: '/zh/screen/layer-base'},
              { text: '图层间的键盘事件', link: '/zh/screen/layer-keyboard'},
              { text: '图层内元素的键盘接收', link: '/zh/screen/layer-element-keyboard'},
              { text: '模态层基础', link: '/zh/screen/modal-layer-base'},
              { text: '模态层键盘事件', link: '/zh/screen/modal-layer-keyboard'},
              { text: '模态层内元素的键盘响应', link: '/zh/screen/modal-layer-element-keyboard'},
              { text: 'allowModal 放行键盘事件', link: '/zh/screen/allow-modal'},
              { text: '监听模态层的丢失键', link: '/zh/screen/modal-miss-listener'}
            ]
          }
        ]
      }
    }
  }
})
