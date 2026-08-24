# 使用基本的绑定方法 `boundKeyboard` 来驱动你的程序

ink-cartridge 提供了一套完整且强大的键盘引擎，用于统一管理应用程序的键盘事件处理。正确使用并组合其能力，可以避免键盘逻辑的混乱。本章介绍键盘引擎中最核心的方法之一：`boundKeyboard`。

## 前置条件

在使用 `boundKeyboard` 之前，必须使用 `<KeyboardProvider />` 包裹 `<CurrentScreen />`：

```tsx
render(
    <ScenarioManagementProvider defaultScreen={YourRootScreen} fullScreen>
        <KeyboardProvider>
            <CurrentScreen />
        </KeyboardProvider>
    </ScenarioManagementProvider>
)
```

**注意**：`KeyboardProvider` 必须存在，且必须被 `ScenarioManagementProvider` 包裹，否则键盘引擎不会生效——键盘引擎依赖屏幕系统提供数据。

以下两种写法均不正确，键盘引擎不会生效。

将 `KeyboardProvider` 置于 `ScenarioManagementProvider` 外层：

```tsx
render(
    <KeyboardProvider>
        <ScenarioManagementProvider defaultScreen={YourRootScreen} fullScreen>
            <CurrentScreen />
        </ScenarioManagementProvider>
    </KeyboardProvider>
)
```

只使用 `KeyboardProvider`，缺少 `ScenarioManagementProvider`：

```tsx
render(
    <KeyboardProvider>
        <CurrentScreen />
    </KeyboardProvider>
)
```

## 获取 `boundKeyboard`

完成上述前置工作后，可通过 `useKeyboard` 钩子获取键盘引擎提供的全部方法，其中包括 `boundKeyboard`：

```tsx
function Menu() {
    const { boundKeyboard } = useKeyboard()
    // ...
}
```

`boundKeyboard` 具有三种重载形式，本章只介绍其中最基本的一种，其余形式见**快捷键与动作**章节：

```typescript
boundKeyboard(
    keys: string | string[],
    handler: KeyHandler,
    options?: BoundKeyboardOptions,
): () => void
```

- `keys` —— 要绑定的按键。可以是单个按键名（如 `'s'`），也可以是按键名数组（如 `['1', '2', '3']`）；
- `handler` —— 按键按下时执行的回调函数；
- `options` —— 可选配置项，详见下文"常用选项"；
- 返回值 —— 解绑函数，调用后移除该绑定。

## 基本用法

以下是一个**完整可运行**的应用示例：按 `1` / `2` / `3` 选择菜单项。将代码保存为 `.tsx` 文件，执行 `npx tsx <文件名>.tsx` 即可运行。

```tsx
import React, { useEffect, useState } from 'react';
import { Box, Text, render } from 'ink';
import {
  CurrentScreen,
  KeyboardProvider,
  ScenarioManagementProvider,
  registerComponent,
  useKeyboard,
} from 'ink-cartridge';

function Menu() {
  const { boundKeyboard } = useKeyboard();
  const [selected, setSelected] = useState(1);

  useEffect(() => {
    // 分别为三个数字键注册绑定
    const unBind1 = boundKeyboard('1', () => setSelected(1));
    const unBind2 = boundKeyboard('2', () => setSelected(2));
    const unBind3 = boundKeyboard('3', () => setSelected(3));

    // 返回解绑函数，组件卸载时自动清理
    return () => {
      unBind1();
      unBind2();
      unBind3();
    };
  }, [boundKeyboard]);

  return (
    <Box flexDirection="column">
      <Text bold>主菜单（当前选择：{selected}）</Text>
      <Text>1. 开始游戏</Text>
      <Text>2. 设置</Text>
      <Text>3. 退出</Text>
      <Text>按 1 / 2 / 3 选择菜单项，按 Ctrl+C 退出</Text>
    </Box>
  );
}

// 注册 Menu 为根屏幕
registerComponent(Menu, {});

// 应用入口：KeyboardProvider 必须嵌套在 ScenarioManagementProvider 内部
render(
  <ScenarioManagementProvider defaultScreen={Menu} fullScreen>
    <KeyboardProvider>
      <CurrentScreen />
    </KeyboardProvider>
  </ScenarioManagementProvider>
);
```

运行效果
<div align="center">
    <img src="/zh/docs-keyboard-base.gif" width="2040" alt="keyboard-base" />
</div>

一个可运行应用包含三个部分：**注册屏幕**（`registerComponent`）、**Provider 嵌套**（`ScenarioManagementProvider` > `KeyboardProvider` > `CurrentScreen`）、**渲染入口**（`render`）。

绑定本身的使用要点：

- **绑定必须注册在 `useEffect` 内**，不可直接在组件函数体中调用；
- 依赖数组通常为 `[boundKeyboard]`——`useKeyboard` 返回的对象中，`boundKeyboard` 的引用是稳定的；
- **应返回解绑函数**（`return () => { ... }`），这是推荐的清理实践，原因见下文"解绑与清理"。

## 解绑与清理

`boundKeyboard` 返回的解绑函数用于移除绑定。**推荐在 `useEffect` 中将其作为返回值**，使 React 在组件卸载或 effect 因依赖变化重新执行时自动完成清理：

```tsx
useEffect(() => {
    return boundKeyboard('s', () => doSomething());
}, [boundKeyboard]);
```

该写法的效果：

- 组件卸载（例如导航离开当前屏幕）时，绑定被自动移除；
- effect 因依赖变化重新执行时，旧绑定先被清理，再注册新绑定，不会产生叠加。

> 注意：当回调依赖组件内的状态时，依赖数组需包含这些状态，否则回调闭包将捕获过期值。

## 常用选项

`boundKeyboard` 的第三个参数为可选配置。本章介绍最常用的三个选项；其余选项（`when`、`focusId`、`elementId`、`observer` 等）将在后续章节介绍。

### `mode`：限定生效模式

```tsx
// 仅在 insert 模式下生效（模式需提前注册，参见 KeyboardProvider 的 modes 选项）
boundKeyboard('s', () => save(), { mode: 'insert' })
```

### `once`：触发一次后自动解绑

```tsx
// 任意按键触发一次后，绑定自动移除
boundKeyboard('*', () => start(), { once: true })
```

### `times`：按指定次数后触发

```tsx
// 连按 3 次触发一次（第 3、6、9……次触发）
boundKeyboard('x', () => confirm(), { times: 3 })
```

## 键盘事件传递机制

按键按下后，事件依次经过键盘引擎的各个处理阶段（模态层、全局键、图层等），最终到达**屏幕栈**阶段。屏幕栈的行为如下：

1. 仅当此前所有阶段均未消费该事件时，事件才进入屏幕栈阶段；
2. 屏幕栈**从顶层屏幕（当前屏幕）向底层屏幕（根屏幕）**依次尝试各屏幕的绑定；
3. 某个屏幕的绑定匹配并消费事件后，传播立即停止；
4. 若所有屏幕均无匹配绑定，事件被忽略。

即：**当前屏幕未处理的按键，默认会继续向栈中更底层的屏幕传递**——这是引擎的默认行为。

但该行为有一个关键前提：**底层屏幕的绑定必须仍然存在**。若在 `useEffect` 中注册绑定而未返回解绑函数，则组件卸载（如导航离开该屏幕）后，绑定会残留于引擎中。此后按键仍会命中这些残留绑定，触发已离开屏幕的逻辑，产生"幽灵按键"。

因此，推荐的实践是：**始终在 `useEffect` 中返回解绑函数**，使绑定随组件卸载自动移除。事件传递的默认行为是穿透式的，但务必做好清理。

## 注意事项

1. **绑定必须注册在 `useEffect` 内，并返回解绑函数**，以避免绑定残留导致的"幽灵按键"（见上文"键盘事件传递机制"）。
2. **通配符 `'*'`** 可匹配任意按键，常与 `once: true` 组合，可用于"按任意键继续"的场景。
3. **`boundKeyboard` 仅可在组件内使用**——它通过 `useKeyboard` 获取上下文，且组件必须位于 `KeyboardProvider` 内部。

## 下一步

- 了解如何使用 `skip` , `gotoScreen` 方法并配合 `boundKeyboard` 使用。
