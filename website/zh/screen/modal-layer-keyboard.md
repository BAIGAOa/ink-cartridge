# 学习模态层键盘事件的行为

在上一章，我们学习了模态层的基础概念与方法。在这一章中，我们将学习键盘事件在模态层之间如何流转：为什么只有最顶层的模态层能收到按键，以及模态层打开后其他界面为什么「失灵」。

## 模态层在键盘管线中的位置

在普通图层的章节里，我们提到键盘事件会依次经过一条固定的处理管线。模态层处理阶段位于这条管线的**最前面**，优先级最高——它先于全局键、普通图层和屏幕栈收到事件。

模态层阶段的规则可以概括为三点：

1. **只有 `zIndex` 最高的模态层能接收键盘事件**；
2. 顶层模态层接收事件后，会**广播**给它内部所有激活的元素（与普通图层一致）；
3. 未被顶层模态层处理的按键会被**屏障吞掉**，不会落到下面的普通图层或屏幕。

其中第 1、3 点是模态层与普通图层的根本区别。下面分别展开。

## 只有最高 `zIndex` 的模态层能接收键盘事件

先记住一条最核心的规律：**同时开启多个模态层时，只有 `zIndex` 最高的那个模态层接收键盘事件，其余模态层全部处于休眠状态**——它们不接收任何按键。当最顶层的模态层关闭后，下一个模态层才接管键盘。

下面是最小可运行的例子：按 `1` 打开第一个模态层，在里面按 `2` 再开一个 `zIndex` 更高的模态层，观察 `return` 被谁接收。

```tsx
import React, { useContext, useEffect, useState } from 'react';
import { Box, Text, render } from 'ink';
import {
  CurrentScreen,
  KeyboardProvider,
  ModalLayerElementContext,
  ScenarioManagementProvider,
  registerComponent,
  useKeyboard,
  useScreenSystem,
} from 'ink-cartridge';

function Home() {
  const { openModalLayer, applyElementToModalLayer } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    // 按 1 开启第一个模态层
    return boundKeyboard('1', () => {
      openModalLayer('modal-1', 100);
      applyElementToModalLayer('modal-1', {
        element: ModalOne,
        elementId: 'm1',
      });
    });
  }, [boundKeyboard, openModalLayer, applyElementToModalLayer]);

  return (
    <Box flexDirection="column">
      <Text bold>🏠 Home</Text>
      <Text>按 1 打开第一个模态层，在模态层里按 2 再开一个</Text>
    </Box>
  );
}
registerComponent(Home, {});

function ModalOne() {
  const { closeModalLayer, openModalLayer, applyElementToModalLayer } =
    useScreenSystem();
  const { boundKeyboard } = useKeyboard();
  const ctx = useContext(ModalLayerElementContext);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!ctx) return;
    // 在这个模态层里按 2，再开一个 zIndex 更高的模态层
    const open2 = boundKeyboard('2', () => {
      openModalLayer('modal-2', 200);
      applyElementToModalLayer('modal-2', {
        element: ModalTwo,
        elementId: 'm2',
      });
    });
    const countReturn = boundKeyboard('return', () => setCount((n) => n + 1));
    const close = boundKeyboard('q', () => closeModalLayer('modal-1'));
    return () => {
      open2();
      countReturn();
      close();
    };
  }, [boundKeyboard, closeModalLayer, openModalLayer, applyElementToModalLayer, ctx]);

  return (
    <Box
      position="absolute"
      top={4}
      left={30}
      width={40}
      height={6}
      borderStyle="round"
      borderColor="blue"
      backgroundColor="black"
    >
      <Text>🔵 Modal 1（z=100）· return x{count} · 2 开新层 · q 关闭</Text>
    </Box>
  );
}

function ModalTwo() {
  const { closeModalLayer } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();
  const ctx = useContext(ModalLayerElementContext);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!ctx) return;
    const countReturn = boundKeyboard('return', () => setCount((n) => n + 1));
    const close = boundKeyboard('q', () => closeModalLayer('modal-2'));
    return () => {
      countReturn();
      close();
    };
  }, [boundKeyboard, closeModalLayer, ctx]);

  return (
    <Box
      position="absolute"
      top={4}
      left={74}
      width={40}
      height={6}
      borderStyle="round"
      borderColor="magenta"
      backgroundColor="black"
    >
      <Text>🟣 Modal 2（z=200）· return x{count} · q 关闭</Text>
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

- 按 `1` 打开 `modal-1`（z=100），再按 `2` 打开 `modal-2`（z=200）——此时 `modal-2` 是最顶的模态层；
- 按 `return`：事件只交给 `modal-2`，`ModalTwo` 的计数 +1；`modal-1` 虽然也开着，但它收不到任何按键，计数始终是 0；
- 按 `q` 关闭 `modal-2`，`modal-1` 重新成为最顶的模态层——再按 `return`，这次是 `ModalOne` 的计数 +1；
- 再按 `q` 关闭 `modal-1`，所有模态层都关闭后，Home 屏幕才重新响应。

这就是模态层之间的规律：**键盘永远只交给最顶的那一个模态层，其余休眠；最顶的关闭后，下一个接管**。

## 模态层的键盘屏障

模态层还有一个普通图层没有的特性：**键盘屏障**。模态层打开期间，未被它处理的按键不会落到下面的普通图层或屏幕，而是直接被吞掉。

还记得普通图层的规律吗？普通图层未命中会一路**冒泡**，最后**兜底到屏幕栈**——交给当前屏幕。模态层恰恰相反：只要还有一个模态层开着，未处理的按键就到此为止，不会往下漏。

这其实在上面那个例子里已经体现：`modal-1` 打开后，Home 屏幕的 `1` 键就不再响应了——`modal-1` 不处理 `1`，但这个按键被屏障吞掉，永远到不了 Home。

> **Note:** 屏障不是绝对的。可以用 `allowModal` 把指定的键「放行」穿过屏障，让它们落到下面的图层或屏幕。这是模态层独有的机制，我们在后面的章节单独讲。

## 小结

| 规律 | 说明 |
| --- | --- |
| **优先级最高** | 模态层阶段位于键盘处理管线的最前面 |
| **只有最顶收键** | 只有 `zIndex` 最高的模态层能接收键盘事件 |
| **顶层内广播** | 顶层模态层会把事件广播给内部所有激活的元素 |
| **其余休眠** | 非最顶的模态层不接收任何按键；最顶关闭后下一个接管 |
| **键盘屏障** | 未被模态层处理的按键被吞掉，不会落到普通图层或屏幕 |

## 注意事项

1. **模态层阶段在管线最前面。** 它先于全局键、普通图层和屏幕栈处理事件，所以模态层的按键优先级天然最高。
2. **只有 `zIndex` 最高的模态层收键。** 多个模态层并存时，其余模态层处于休眠，直到最顶的关闭。
3. **顶层模态层内广播。** 与普通图层一样，事件会广播给顶层模态层内所有激活的元素，多个处理器可以同时响应。
4. **屏障吞掉未处理的按键。** 模态层打开期间，未处理的按键不会冒泡到普通图层或屏幕；需要用 `allowModal` 放行（见后续文章）。

## 下一步

- 学习停用和激活模态层内元素的键盘响应：[模态层内元素的键盘响应](/zh/screen/modal-layer-element-keyboard)
