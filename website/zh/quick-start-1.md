# 快速开始

## 初次介绍

ink-cartridge 旨在增强 React Ink 而不是替代它，并大幅提升 Ink 应用的交互体验。
它几乎不对你的业务代码做约束，也不是一个一体式框架——所有能力都交由你自由组合。

## 安装

在讲解各个方法的用法之前，需要先了解一些前置知识。

首先，ink-cartridge 属于 Node.js 生态，可以通过 npm 安装到你的项目中。

```bash
npm install ink-cartridge
```

> 依赖要求：ink-cartridge 通过 `peerDependencies` 依赖 `react` 与 `ink`，请确保项目已安装它们。

## 使用

安装完成之后，你就可以使用 ink-cartridge 的完整能力了。下面是一个简短的快速示例，让你初次感受一下。

### 一个最小应用

```tsx
import React, { useEffect } from 'react';
import { Box, Text, render } from 'ink';
import {
  CurrentScreen,
  KeyboardProvider,
  ScenarioManagementProvider,
  registerComponent,
  useKeyboard,
  useScreenSystem,
} from 'ink-cartridge';

function Home() {
  const { skip } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    // 按 Enter 进入详情页
    const enter = boundKeyboard(['return'], () => skip(Detail, {}));
    return () => enter();
  }, [boundKeyboard, skip]);

  return (
    <Box flexDirection="column">
      <Text bold>🏠 主页</Text>
      <Text>按 Enter 进入详情页</Text>
    </Box>
  );
}
registerComponent(Home, {});

function Detail() {
  const { back } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    // 按 Esc 返回主页
    const esc = boundKeyboard(['escape'], () => back());
    return () => esc();
  }, [boundKeyboard, back]);

  return <Text>📄 详情页 —— 按 Esc 返回</Text>;
}
registerComponent(Detail, {}, { parent: Home });

render(
  <ScenarioManagementProvider defaultScreen={Home} fullScreen>
    <KeyboardProvider>
      <CurrentScreen />
    </KeyboardProvider>
  </ScenarioManagementProvider>
);
```

### 发生了什么

- `ScenarioManagementProvider` 包裹整个应用，负责屏幕系统与路由；`defaultScreen={Home}` 指定首屏，`fullScreen` 让 Home 占满终端。
- 每个 React 组件通过 `registerComponent` 注册成"屏"，`{ parent: Home }` 把它挂进屏幕树，成为 Home 的子屏。
- `useScreenSystem()` 提供路由方法：`skip` 向下跳转，`back` 返回上一层。
- `useKeyboard()` 的 `boundKeyboard` 给当前屏幕绑定按键——按 Enter 跳到详情页、按 Esc 返回，且按键只对当前屏生效。
- `KeyboardProvider` 必须嵌套在 `ScenarioManagementProvider` 内部，否则键盘系统会失效。
- `CurrentScreen` 渲染当前激活的屏。

> 提示：Ink 中 Enter 键的名字是 `'return'`，不是 `'enter'`。

### 下一步

- 了解 `gotoScreen`、层级系统等更多导航能力 —— 屏幕系统
- 深入了解按键管道优先级与聚焦机制 —— 键盘引擎
