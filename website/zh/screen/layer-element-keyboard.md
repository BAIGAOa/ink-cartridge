# 学习控制图层内元素的键盘接收

在上一章，我们学习了键盘事件在图层之间的行为。在这一章中，我们将学习如何控制图层内**单个元素**的键盘接收。

## 元素的键盘接收状态

先抛出一个问题：**如果没有运行时的 `active` 控制，你该怎么让一个图层元素暂时不响应键盘？**

想象一个工具面板：它上面有个按钮，绑定了一个键。在某些状态下，我们希望这个按钮暂时失效——按了不响应，但界面还保留着。没有 `active` 控制时，你能做的只有 `eraseElement` 把它移除、等条件满足再 `applyElement` 挂回来。可这样按钮自身的状态（计数、选中项等）会随卸载一起丢失，代价很大。

ink-cartridge 为此提供了更轻的方案：**每个挂载进图层的元素都有一个键盘接收状态（`active`）**。`active: false` 时，元素仍然渲染，只是不再接收键盘事件；等条件满足，再把它切回 `true`，状态原样保留。

在深入之前，先弄清一个关键事实：**暂停元素的键盘接收，并不会卸载元素**。被暂停的元素依旧挂在图层里、照常渲染，只是键盘引擎不再把事件派发给它；它的注册数据（比如 `boundKeyboard` 的绑定）都保留着，随时可以恢复。

元素初始的接收状态由 `applyElement` 的 `active` 字段决定，运行时的切换则由 `deactivateElement` / `activateElement` 完成。下面分别介绍。

## 使用 `active` 字段设定初始状态

`applyElement` 的元素配置里有一个 `active` 字段，控制元素挂载后的初始接收状态，默认为 `true`：

```tsx
applyElement('tool-panel', {
  element: ToolPanel,
  elementId: 'tool-panel-body',
  active: false, // 挂载即暂停键盘接收，元素仍渲染
});
```

`active: false` 的元素从挂载那一刻起就不接收键盘事件，但依旧渲染。它适合「先展示、暂不响应」的场景，等条件满足后再由别的代码把它激活。

## 使用 `deactivateElement` / `activateElement` 切换

两个方法的签名一致，分别把元素设为暂停与恢复：

```typescript
deactivateElement(targetLayerId: string, targetElementId: string): void
activateElement(targetLayerId: string, targetElementId: string): void
```

- `targetLayerId` —— 元素所在的图层 ID；
- `targetElementId` —— 要切换的元素 ID。

下面是最小可运行的例子：按 `a` 打开工具面板，面板元素绑定 `w` 计数；Home 再绑定 `d` 暂停、`e` 恢复这个元素的键盘接收。

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
  const { openLayer, applyElement, activateElement, deactivateElement } =
    useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    const open = boundKeyboard('a', () => {
      openLayer('tool-panel', 10);
      applyElement('tool-panel', {
        element: ToolPanel,
        elementId: 'tool-panel-body',
      });
    });
    const deactivate = boundKeyboard('d', () => {
      deactivateElement('tool-panel', 'tool-panel-body');
    });
    const activate = boundKeyboard('e', () => {
      activateElement('tool-panel', 'tool-panel-body');
    });
    return () => {
      open();
      deactivate();
      activate();
    };
  }, [boundKeyboard, openLayer, applyElement, activateElement, deactivateElement]);

  return (
    <Box flexDirection="column">
      <Text bold>🏠 Home</Text>
      <Text>按 a 打开面板 · w 计数 · d 暂停元素 · e 恢复元素</Text>
    </Box>
  );
}
registerComponent(Home, {});

function ToolPanel() {
  const { boundKeyboard } = useKeyboard();
  const [count, setCount] = useState(0);

  useEffect(() => {
    return boundKeyboard('w', () => setCount((n) => n + 1));
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
      <Text>🧰 工具面板（w x{count}）</Text>
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

- 按 `a` 打开面板，按 `w` → 计数 +1，元素正常响应；
- 按 `d` 暂停 `tool-panel-body`，面板**仍显示**，但再按 `w` 计数不再变化——元素不再接收键盘事件；
- 按 `e` 恢复，`w` 又能计数了，之前的计数也保留着。

值得注意的一点：**被暂停的元素无法用自己身上的按键重新唤醒**。因为它已经收不到任何按键了，所以恢复它只能靠其他元素或屏幕——比如例子里的 `e` 绑定在 Home 上。

## 小结

| 手段 | 作用 |
| --- | --- |
| `applyElement` 的 `active` 字段 | 设定元素挂载后的初始键盘接收状态（默认 `true`） |
| `deactivateElement(layerId, elementId)` | 暂停元素的键盘接收，元素仍渲染 |
| `activateElement(layerId, elementId)` | 恢复元素的键盘接收 |

## 注意事项

1. **暂停不等于卸载。** `deactivateElement` 只把元素的键盘接收置为暂停，元素依旧渲染，`boundKeyboard` 等注册数据也保留，`activateElement` 可以直接恢复。
2. **被暂停的元素收不到任何按键。** 因此它无法「自己唤醒自己」，必须由其他元素或屏幕调用 `activateElement`。
3. **`active` 只影响键盘，不影响渲染。** 元素暂停后依旧显示，只是不响应按键。
4. **`activateElement` 无法复活被 `eraseElement` 移除的元素。** `eraseElement` 会把元素连同它的键盘注册一起销毁，恢复需要重新 `applyElement`。
5. **模态层有对应的变体**：`activateElementInModalLayer` / `deactivateElementInModalLayer`（见后续文章）。

## 下一步

- 了解模态层的基础概念与方法：[模态层基础](/zh/screen/modal-layer-base)
