# 学习键盘事件在图层之间的行为

在上一章，我们学习了基本的图层概念和相关方法，在这一章中，我们将学习键盘事件在图层之间的行为。

## 什么是键盘事件

**键盘事件**，就是用户在终端按下某个键时产生的一次输入。在 ink-cartridge 中，所有键盘事件都由键盘引擎（`KeyboardEngine`）统一捕获与分发——你不需要为每个按键单独挂监听器，而是用 `boundKeyboard` 声明「当某键被按下时要做什么」，引擎负责决定这次事件最终交给谁来处理。

按键被按下后，Ink 通过 `useInput` 捕获原始输入，键盘引擎会把它**归一化**成标准按键名：普通字符就是它本身（`'s'`、`'1'`），组合键用 `+` 连接（`'ctrl+q'`），特殊键有固定名称（`'escape'`、`'return'`、`'tab'`）：

```tsx
boundKeyboard('s', () => handleSelect());      // 普通字符
boundKeyboard('ctrl+q', () => handleQuit());   // 组合键
boundKeyboard('escape', () => handleCancel()); // 特殊键
```

归一化之后，事件进入一条固定的**处理管线**，依次经过模态层、全局键与序列、图层阶段，最终到达屏幕栈。任何一个阶段消费了事件，处理就到此为止，不再向下传递。图层阶段卡在全局机制与屏幕栈之间，正是本章的主角：**键盘事件如何在一层层图层之间流转**。

### 图层是键盘事件的「所有者」

在深入之前，先弄清一个关键事实：**图层不只是视觉上的浮层，它同时也是键盘事件的一个「所有者」**。挂载进图层的元素，同样用 `boundKeyboard` 注册键盘绑定，这些绑定归属到元素所在的图层。当你通过 `useKeyboard()` 获取 `boundKeyboard` 时，它已经通过 `LayerElementContext` 拿到了当前元素的 `elementId` 并自动注入——你通常不需要手动传 `elementId`。只有当图层开启、且元素处于激活状态（`active`）时，这些绑定才会生效。

下面是最小可运行的例子：在 Home 屏幕按 `a` 打开工具面板，面板元素直接绑定 `w`（计数）和 `q`（关闭）两个键。

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
  const { openLayer, applyElement } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    // 按 a 键开启图层，并往图层里挂载一个元素
    return boundKeyboard(['a'], () => {
      openLayer('tool-panel', 10);
      applyElement('tool-panel', {
        element: ToolPanel,
        elementId: 'tool-panel-body',
      });
    });
  }, [boundKeyboard, openLayer, applyElement]);

  return (
    <Box flexDirection="column">
      <Text bold>🏠 Home</Text>
      <Text>按 a 打开工具面板</Text>
    </Box>
  );
}
registerComponent(Home, {});

// 图层内的元素用 boundKeyboard 注册绑定；
// useKeyboard 会自动把绑定归属到当前元素所在的图层
function ToolPanel() {
  const { closeLayer } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const unBindW = boundKeyboard('w', () => setCount((n) => n + 1));
    const unBindQ = boundKeyboard('q', () => closeLayer('tool-panel'));
    return () => {
      unBindW();
      unBindQ();
    };
  }, [boundKeyboard, closeLayer]);

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
      <Text>🧰 工具面板（按 w 加一：{count}，按 q 关闭）</Text>
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

按下 `a` 键后，终端右上角会出现黄色边框的工具面板。其中：

- `w` 与 `q` 的绑定由 `useKeyboard` 自动归属到 `tool-panel` 图层里的 `tool-panel-body` 元素，无需手动传 `elementId`；
- 这两个绑定只在图层开启、元素激活时生效。`q` 关闭图层后，`ToolPanel` 随之卸载，绑定也一并清理，再次按 `w` / `q` 不会触发任何逻辑；
- 反过来说，如果图层从未开启，或你在别的地方按下 `w` / `q`，这些绑定同样不会触发。

### 键盘事件在图层之间的规律

一个屏幕上可能同时开着多个图层。键盘事件在图层之间的流动遵循几条固定规律，核心可以概括为两句话：**自上而下、命中即停**。

1. **自上而下**：事件从**最高 `zIndex` 的图层**开始，逐层向下尝试；
2. **图层内广播**：在一个图层内部，事件会**广播**给该图层所有激活的元素——同一图层里可以有多个处理器同时响应同一个按键；
3. **命中即停**：只要某个图层的元素处理了事件，事件即被消费，不再流向更低的图层，也不会落到屏幕栈；
4. **未命中则冒泡**：若某个图层的所有元素都没有处理，事件**冒泡**到下一个更低的图层；
5. **兜底到屏幕栈**：若所有图层都未处理，事件最终落到**屏幕栈**阶段，交给当前屏幕及其下的屏幕。

```tsx
openLayer('layer-b', 10); // 先开启的图层，zIndex 较低
openLayer('layer-a', 20); // zIndex 更高，键盘优先级也更高
```

如果 `layer-a` 与 `layer-b` 都绑定了同一个键（比如 `return`），按下时 `layer-a`（z=20）先收到；只要它处理了，`layer-b`（z=10）就不会再收到。若两个图层都没有处理，事件才会继续冒泡到屏幕栈。

> **Note:** 图层的键盘优先级与视觉堆叠是同一套规则：`zIndex` 越大，既越靠前显示，也越优先接收键盘事件。模态层渲染在普通图层之上，且只有 `zIndex` 最高的模态层能接收键盘事件。

在接下来的章节中，我们将结合更复杂的例子，观察这些规律在多个图层并存时如何起作用。

### 自上而下：图层之间的优先级

多个图层同时开启时，键盘事件从**最高 `zIndex` 的图层**开始，逐层向下尝试——这就是"自上而下"。

下面是最小可运行的例子：按 `b` / `t` 开启两个图层，它们都绑定了 `return`，观察哪个面板先响应。

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
  const { openLayer, applyElement } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    const openBottom = boundKeyboard('b', () => {
      openLayer('layer-bottom', 10);
      applyElement('layer-bottom', {
        element: BottomPanel,
        elementId: 'bottom',
      });
    });
    const openTop = boundKeyboard('t', () => {
      openLayer('layer-top', 20);
      applyElement('layer-top', { element: TopPanel, elementId: 'top' });
    });
    return () => {
      openBottom();
      openTop();
    };
  }, [boundKeyboard, openLayer, applyElement]);

  return (
    <Box flexDirection="column">
      <Text bold>🏠 Home</Text>
      <Text>按 b / t 开启两个图层，按 return 观察哪个面板响应</Text>
    </Box>
  );
}
registerComponent(Home, {});

function BottomPanel() {
  const { boundKeyboard } = useKeyboard();
  const [count, setCount] = useState(0);

  useEffect(() => {
    return boundKeyboard('return', () => setCount((n) => n + 1));
  }, [boundKeyboard]);

  return (
    <Box
      position="absolute"
      top={2}
      left={2}
      width={40}
      height={5}
      borderStyle="single"
      borderColor="blue"
      backgroundColor="black"
    >
      <Text>⬇️ layer-bottom（z=10）· return x{count}</Text>
    </Box>
  );
}

function TopPanel() {
  const { boundKeyboard } = useKeyboard();
  const [count, setCount] = useState(0);

  useEffect(() => {
    return boundKeyboard('return', () => setCount((n) => n + 1));
  }, [boundKeyboard]);

  return (
    <Box
      position="absolute"
      top={2}
      left={44}
      width={40}
      height={5}
      borderStyle="single"
      borderColor="yellow"
      backgroundColor="black"
    >
      <Text>⬆️ layer-top（z=20）· return x{count}</Text>
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

- 按 `b` 开启 `layer-bottom`（z=10），按 `t` 开启 `layer-top`（z=20）；
- 按 `return`：事件从最高的 `layer-top` 开始，它的元素处理了 `return` → **命中即停**，`layer-bottom` 收不到；
- 所以无论按多少次 `return`，只有 `layer-top` 的计数在增长，`layer-bottom` 始终是 0。

这就是图层之间的第一条规律：**自上而下，`zIndex` 越高越优先**。

### 命中即停与冒泡

在"自上而下"的基础上，事件在图层之间的流转还有两个关键行为：**命中即停**与**未命中冒泡**。

下面用日志演示三个按键各自会落到哪里：`t` 由顶层图层处理，`b` 冒泡到底层图层处理，`p` 没有任何图层处理，最终落到屏幕栈。

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
  const { openLayer, applyElement } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    // 按 1 / 2 开启两个图层
    const openTop = boundKeyboard('1', () => {
      openLayer('layer-top', 20);
      applyElement('layer-top', { element: TopPanel, elementId: 'top' });
    });
    const openBottom = boundKeyboard('2', () => {
      openLayer('layer-bottom', 10);
      applyElement('layer-bottom', {
        element: BottomPanel,
        elementId: 'bottom',
      });
    });
    // 页面自己也绑定了 t / b / p 三个键
    const onT = boundKeyboard('t', () => setLog((l) => [...l, '页面收到 t']));
    const onB = boundKeyboard('b', () => setLog((l) => [...l, '页面收到 b']));
    const onP = boundKeyboard('p', () => setLog((l) => [...l, '页面收到 p']));
    return () => {
      openTop();
      openBottom();
      onT();
      onB();
      onP();
    };
  }, [boundKeyboard, openLayer, applyElement]);

  return (
    <Box flexDirection="column">
      <Text bold>🏠 Home</Text>
      <Text>按 1 / 2 开启图层，再按 t / b / p 观察事件落到哪</Text>
      {log.map((line, i) => (
        <Text key={i} dimColor>
          {line}
        </Text>
      ))}
    </Box>
  );
}
registerComponent(Home, {});

function TopPanel() {
  const { boundKeyboard } = useKeyboard();
  const [count, setCount] = useState(0);

  useEffect(() => {
    return boundKeyboard('t', () => setCount((n) => n + 1));
  }, [boundKeyboard]);

  return (
    <Box
      position="absolute"
      top={2}
      left={2}
      width={40}
      height={5}
      borderStyle="single"
      borderColor="yellow"
      backgroundColor="black"
    >
      <Text>⬆️ layer-top（z=20）· t x{count}</Text>
    </Box>
  );
}

function BottomPanel() {
  const { boundKeyboard } = useKeyboard();
  const [count, setCount] = useState(0);

  useEffect(() => {
    return boundKeyboard('b', () => setCount((n) => n + 1));
  }, [boundKeyboard]);

  return (
    <Box
      position="absolute"
      top={2}
      left={44}
      width={40}
      height={5}
      borderStyle="single"
      borderColor="blue"
      backgroundColor="black"
    >
      <Text>⬇️ layer-bottom（z=10）· b x{count}</Text>
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

先按 `1`、`2` 同时开启两个图层，再依次按 `t`、`b`、`p`：

- 按 `t`：`layer-top` 的 `TopPanel` 处理了 `t` → **命中即停**，页面的 `t` 不触发，日志里不会出现"页面收到 t"；
- 按 `b`：`layer-top` 不处理 `b` → 事件**冒泡**到 `layer-bottom`，`BottomPanel` 处理 → 命中即停，页面收不到 `b`；
- 按 `p`：两个图层的元素都不处理 `p` → 事件穿过所有图层，**落到屏幕栈**，页面的 `p` 触发，日志出现"页面收到 p"。

三条规律串起来就是：**自上而下 → 命中即停；未命中则冒泡；全未命中则兜底到屏幕栈**。

### 图层内广播

图层之间的规则是"命中即停"，但**图层内部恰好相反**：事件会广播给该图层**所有激活的元素**，多个处理器可以同时响应同一个按键。

下面的例子在同一个图层里挂了两个元素，它们都绑定了 `return`：

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
  const { openLayer, applyElement } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    // 按 a 键开启图层，并在图层里挂两个元素
    return boundKeyboard(['a'], () => {
      openLayer('panel', 10);
      applyElement('panel', { element: ElementA, elementId: 'element-a' });
      applyElement('panel', { element: ElementB, elementId: 'element-b' });
    });
  }, [boundKeyboard, openLayer, applyElement]);

  return (
    <Box flexDirection="column">
      <Text bold>🏠 Home</Text>
      <Text>按 a 打开面板，按 return 观察两个元素是否同时响应</Text>
    </Box>
  );
}
registerComponent(Home, {});

function ElementA() {
  const { boundKeyboard } = useKeyboard();
  const [count, setCount] = useState(0);

  useEffect(() => {
    return boundKeyboard('return', () => setCount((n) => n + 1));
  }, [boundKeyboard]);

  return (
    <Box
      position="absolute"
      top={2}
      left={2}
      width={40}
      height={5}
      borderStyle="single"
      borderColor="cyan"
      backgroundColor="black"
    >
      <Text>🅰️ Element A · return x{count}</Text>
    </Box>
  );
}

function ElementB() {
  const { boundKeyboard } = useKeyboard();
  const [count, setCount] = useState(0);

  useEffect(() => {
    return boundKeyboard('return', () => setCount((n) => n + 1));
  }, [boundKeyboard]);

  return (
    <Box
      position="absolute"
      top={2}
      left={44}
      width={40}
      height={5}
      borderStyle="single"
      borderColor="green"
      backgroundColor="black"
    >
      <Text>🅱️ Element B · return x{count}</Text>
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

按 `a` 打开 `panel` 图层后，按 `return`：

- `ElementA` 与 `ElementB` 的计数**同时** +1——事件广播给了图层内所有激活的元素；
- 只要其中一个元素处理了事件，图层就算"命中"，事件不再流向更低的图层或屏幕栈，但**图层内**的其余元素仍会收到。

这就是图层之间的"命中即停"与图层内部的"广播"的根本区别。

## 小结

| 规律 | 说明 |
| --- | --- |
| **自上而下** | 事件从最高 `zIndex` 的图层开始，逐层向下尝试 |
| **图层内广播** | 事件广播给图层内所有激活的元素，可多处理器同时响应 |
| **命中即停** | 某图层的元素处理了事件，事件即被消费，不再下传 |
| **未命中冒泡** | 某图层所有元素都未处理，事件冒泡到下一个更低的图层 |
| **兜底屏幕栈** | 所有图层都未处理，事件落到屏幕栈，交给当前屏幕 |

## 注意事项

1. **图层之间"命中即停"，图层内部"广播"。** 这两条规则针对的层级不同：前者决定事件是否流向更低的图层，后者决定图层内多个元素如何共享一次按键。
2. **`zIndex` 相同按开启先后排序。** `zIndex` 相同时，先开启的图层更靠下、后收到事件（由 `createdAt` 决定）。
3. **绑定只在图层开启、元素激活时生效。** 图层关闭或元素被暂停后，对应的绑定随之失效。
4. **模态层的键盘优先级高于普通图层。** 模态层渲染在普通图层之上，且只有 `zIndex` 最高的模态层能接收键盘事件，详见后续文章。

## 下一步

- 学习控制图层内元素的键盘接收：[控制图层内元素的键盘接收](/zh/screen/layer-element-keyboard)
