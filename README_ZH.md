
# ink-trc

开箱即用的 Ink 组件库和工具集，帮助你快速构建终端 UI 应用。

## 安装

```bash
npm install ink-trc
```

## 功能

### 屏幕管理系统

注册屏幕组件，用 `ScenarioManagementProvider` 包裹应用，即可在 React 组件或纯 `.ts` 文件中随时切换屏幕。

```tsx
import React from 'react';
import { Box, Text, render } from 'ink';
import { registerComponent, ScenarioManagementProvider, useScreenSystem } from 'ink-trc';

function Menu({ title }: { title: string }) {
  return (
    <Box>
      <Text>{title}</Text>
    </Box>
  );
}
registerComponent(Menu, { title: '' });

function App() {
  const { currentScreen } = useScreenSystem();
  return currentScreen;
}

render(
  <ScenarioManagementProvider defaultScreen={Menu} defaultParams={{ title: '欢迎' }}>
    <App />
  </ScenarioManagementProvider>,
);
```

- `registerComponent` — 注册组件为屏幕，组件本身作为唯一标识
- `ScenarioManagementProvider` — 上下文提供者，必传 `defaultScreen`，可选 `defaultParams`
- `useScreenSystem` — 返回 `{ currentScreen, skip }`
- `skip` — 跳转到已注册屏幕，支持组件内调用和模块级导入

类型安全：`skip` 会根据组件的 props 类型自动推断参数。

### 更多组件

更多 Ink 组件持续添加中。

## License

AGPL-3.0
