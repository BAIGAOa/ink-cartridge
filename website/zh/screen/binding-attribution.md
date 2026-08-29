# 学习绑定方法的归属：所有者栈

在之前几乎每一章里，我们都在调用 `boundKeyboard`——在页面里调，在图层元素里调，在模态层元素里调。但你可能没想过：**同一个方法，为什么在不同地方调用，行为差别这么大？**

比如 `layer-keyboard` 里，面板元素里的 `w` 只在面板开启时生效；而 Home 页面里的 `a` 却一直有效。同样是 `boundKeyboard`，凭什么？

这一章，我们来揭开这个谜底。我们先讲清楚背后的机制——**所有者**与**所有者栈**，再分场景看看 `boundKeyboard` 等方法在不同地方调用时，分别归属到哪里。

## 归属：绑定住在哪里

先明确一个概念：**归属**，就是这条绑定「住在哪里」。绑定不是孤零零存在的，它一定挂在某个键盘层上。引擎分发按键时，只会在对应的键盘层里找绑定，不会全局扫一遍。

```
调用位置                 绑定住在哪                       什么时候生效
──────────────────────────────────────────────────────────────────────────
页面组件 Home             Home 的键盘层                    Home 在导航栈中
图层元素 ToolPanel        图层 panel 的 ToolPanel 元素      图层开启且元素激活
模态层元素 ConfirmDialog   模态层 confirm 的元素            模态层处于最顶
```

关键就一句话：**在哪里调用，就归属到哪里**。

## 所有者与所有者栈

绑定方法在调用时会确定一个**所有者**（owner）——它决定这条绑定挂在哪个键盘层上。通过 `useKeyboard()` 调用时，所有者由**调用处的上下文**决定：页面组件里的调用，所有者是当前页面组件；图层元素里的调用，所有者是该图层 ID；模态层元素里的调用，所有者是该模态层 ID。

那么引擎是怎么知道「当前调用处的所有者是谁」的？它靠一条**所有者栈**。`useKeyboard()` 挂载时，会把当前所有者压进栈；每次调用绑定方法时，再临时压一次、解析完弹出：

```
调用图层元素里的 boundKeyboard 时，栈的变化：
         压栈                   解析归属 → 弹栈
        ┌──────────────┐   ┌──────────────────────────┐
  已有   │  Home        │   │ 绑定 → panel 图层 · 元素    │
        │  panel（图层） │ → │                          │
        └──────────────┘   └──────────────────────────┘
```

当调用发生在图层/模态层元素内时，`useKeyboard` 从 `LayerElementContext` / `ModalLayerElementContext` 拿到图层或模态层的 ID，作为所有者压栈：

```tsx
// useKeyboard 内部（简化示意）：从上下文推断所有者
const ownerId =
  layerCtx?.layer.layerId ??       // 图层元素 → 图层 ID
  modalCtx?.modalLayer.layerId ??  // 模态层元素 → 模态层 ID
  topPageComponent                 // 页面组件 → 页面组件
```

引擎取归属时，直接读栈顶——所以「当前在谁里面调用，就归属给谁」。

如果栈是空的，引擎会退而求其次，按这个顺序猜一个所有者：

```
getCurrentOwner() 的回退顺序
  1. 所有者栈的栈顶
  2. 最顶的模态层
  3. 最顶的普通图层
  4. 当前页面
  5. 都没有 → 没有所有者，调用 boundKeyboard 抛错
```

屏幕上没有任何模态层、图层或页面时，就不存在所有者——此时调用 `boundKeyboard` 会直接报错：

```
[keyboard-engine] boundKeyboard() must be called inside a screen component or overlay.
```

## 从所有者到落点：`elementId`

确定所有者之后，还有一个细节决定绑定的**精确落点**：`elementId`。因为一个图层里可能挂着多个元素，光有「图层 ID」还不够，还得知道是哪个元素。

`useKeyboard()` 会从上下文自动注入 `elementId`（与所有者同源），所以你在图层/模态层元素里调用时，通常不用手动传：

```tsx
// 不需要手动传 elementId——useKeyboard 已经注入了
boundKeyboard('w', () => setCount(...))

// 手动传会覆盖自动注入
boundKeyboard('w', () => setCount(...), { elementId: 'tool-panel-body' })
```

「所有者 + elementId」合起来，就定位到了唯一落点：

| 所有者 | `elementId` | 绑定落在 |
| --- | --- | --- |
| 页面组件 | 无 | 页面的键盘层 |
| 图层 ID | 有（自动注入） | 该图层内对应元素的键盘 |
| 模态层 ID | 有（自动注入） | 该模态层内对应元素的键盘 |

## 屏幕中的归属

正常的屏幕就是最直觉的一种：**在哪里调用，就属于哪个屏幕**。在页面组件里调用 `boundKeyboard`，绑定归属到该屏幕的键盘层。

```tsx
function Home() {
  const { boundKeyboard } = useKeyboard()

  useEffect(() => {
    // 在 Home 组件里调用 → 绑定归属 Home 屏幕
    return boundKeyboard(['a'], () => openLayer('panel', 10))
  }, [boundKeyboard])
}
```

这条绑定挂在 Home 的键盘层上：只要 Home 还在导航栈里，它就有效；`skip` / `back` 离开 Home 后，屏幕连同它的键盘层一起销毁，绑定也随之失效。

## 图层中的归属

图层元素里的调用，归属到该元素所在的图层。`useKeyboard` 从 `LayerElementContext` 同时拿到图层 ID 和元素 ID，绑定落到「图层 + 元素」这个组合上。

```tsx
function ToolPanel() {
  const { boundKeyboard } = useKeyboard()

  useEffect(() => {
    // 在图层元素里调用 → 归属 tool-panel 图层的当前元素
    return boundKeyboard(['w'], () => setCount((n) => n + 1))
  }, [boundKeyboard])
}
```

这条绑定只有图层开启、元素激活时才生效：图层关闭、元素被暂停、或页面切换清除了图层，它都不再响应。

## 模态层中的归属

模态层和普通图层「差不多」——模态层元素里的调用，同样归属到「模态层 + 元素」的组合。唯一的区别在生效条件：模态层的绑定要等模态层成为**最顶**才生效（见「模态层键盘事件」一章）。

```tsx
function ConfirmDialog() {
  const { boundKeyboard } = useKeyboard()

  useEffect(() => {
    // 在模态层元素里调用 → 归属 confirm 模态层的当前元素
    return boundKeyboard(['return'], () => closeModalLayer('confirm'))
  }, [boundKeyboard])
}
```

## 归属规则一览

把机制和场景串起来，归属规则就三条：

1. **调用位置决定所有者。** 页面里调，所有者是页面；图层元素里调，所有者是图层 ID；模态层元素里调，所有者是模态层 ID。
2. **所有者 + `elementId` 决定落点。** 引擎把绑定挂到唯一一个键盘层上。
3. **归属决定生效条件。** 页面的绑定随页面生效；图层元素的绑定随图层开启、元素激活生效；模态层元素的绑定随模态层成为最顶生效。

```
同一个键 h，两处绑定
───────────────────────────────────────────
绑定 A：Home 页面      → Home 键盘层     → 面板未开时生效
绑定 B：ToolPanel 元素  → panel 图层元素  → 面板开启时生效
```

## 最佳实践

1. **想让绑定跟随某个元素的生命周期，就在元素内部注册** —— 元素挂载时绑定、卸载时解绑，绑定随元素一起出现和消失；如果注册在页面上，就得手动管理「元素在不在」的状态。

2. **把 `boundKeyboard` 放在 `useEffect` 里并返回解绑函数** —— 页面退出时绑定自动清理，避免「幽灵按键」（见基础绑定章节）。

3. **不要依赖「栈空时的回退」** —— 那只是兜底。正常写法是在正确的组件/元素里调用，让 `useKeyboard` 从上下文确定所有者，而不是指望引擎去猜。

## 完整示例

用一个键 `h` 演示两种归属：Home 页面绑定 `h` 记录日志，工具面板元素也绑定 `h` 计数——两者独立存在，由面板是否开启决定谁生效。将代码保存为 `.tsx` 文件，执行 `npx tsx <文件名>.tsx` 即可运行。

```tsx
import React, { useEffect, useState } from 'react';
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
  const { openLayer, applyElement, closeLayer } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const open = boundKeyboard('1', () => {
      openLayer('tool-panel', 10);
      applyElement('tool-panel', {
        element: ToolPanel,
        elementId: 'tool-panel-body',
      });
    });
    const close = boundKeyboard('c', () => closeLayer('tool-panel'));
    // 页面里的 h 绑定：归属到页面
    const onH = boundKeyboard('h', () => setLog((l) => [...l, '页面收到 h']));
    return () => {
      open();
      close();
      onH();
    };
  }, [boundKeyboard, openLayer, applyElement, closeLayer]);

  return (
    <Box flexDirection="column">
      <Text bold>🏠 Home</Text>
      <Text>按 1 打开面板 · c 关闭 · 按 h 观察归属</Text>
      {log.map((line, i) => (
        <Text key={i} dimColor>
          {line}
        </Text>
      ))}
    </Box>
  );
}
registerComponent(Home, {});

function ToolPanel() {
  const { boundKeyboard } = useKeyboard();
  const [count, setCount] = useState(0);

  useEffect(() => {
    // 图层元素里的 h 绑定：归属到 tool-panel 图层
    return boundKeyboard('h', () => setCount((n) => n + 1));
  }, [boundKeyboard]);

  return (
    <Box
      position="absolute"
      top={2}
      left={30}
      width={30}
      height={8}
      borderStyle="bold"
      borderColor="yellow"
      backgroundColor="black"
    >
      <Text>🧰 工具面板（h x{count}）</Text>
    </Box>
  );
}

render(
  <ScenarioManagementProvider defaultScreen={Home} fullScreen>
    <KeyboardProvider>
      <CurrentScreen />
    </KeyboardProvider>
  </ScenarioManagementProvider>
);
```

运行后：

- 未开面板时按 `h`：页面收到，日志出现"页面收到 h"；
- 按 `1` 打开面板后按 `h`：面板元素先处理（图层优先级高于页面），页面收不到，日志不变、计数 +1；
- 按 `c` 关闭面板后按 `h`：页面重新收到。

同一个键，两个绑定，归属不同——这就是调用位置决定归属。

## 下一步

- 了解焦点系统的命名组：[未完成文档](/zh/todo)
