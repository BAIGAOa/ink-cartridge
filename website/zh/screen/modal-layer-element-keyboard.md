# 学习停用和激活模态层内元素的键盘响应

在上一章，我们学习了键盘事件在模态层之间的行为。在这一章中，我们将学习如何控制模态层内单个元素的键盘接收：用 `applyElementToModalLayer` 的 `active` 字段设定初始状态，再用 `activateElementInModalLayer` / `deactivateElementInModalLayer` 在运行时切换。

## 模态层内元素的键盘接收状态

模态层内的元素与普通图层内的元素遵循相同的规则：每个元素都有一个键盘接收状态（`active`）。`active` 时，元素的绑定参与键盘分发；被暂停（`active: false`）后，元素仍然渲染，但不再接收键盘事件。

两者的区别在于模态层的特殊性：**即使模态层内没有任何激活的元素，模态层的键盘屏障依然存在**——未处理的按键仍被吞掉，不会漏到下面的普通图层或屏幕。暂停模态层内的元素，只是让该元素不响应，并不会让按键穿透模态层。

元素初始的接收状态由 `applyElementToModalLayer` 的 `active` 字段决定，运行时的切换则由 `deactivateElementInModalLayer` / `activateElementInModalLayer` 完成。

## 使用 `active` 字段设定初始状态

`applyElementToModalLayer` 的元素配置与 `applyElement` 相同，`active` 字段控制元素挂载后的初始接收状态，默认为 `true`：

```tsx
applyElementToModalLayer('confirm', {
  element: ElementA,
  elementId: 'element-a',
  active: false, // 挂载即暂停键盘接收，元素仍渲染
});
```

## 使用 `deactivateElementInModalLayer` / `activateElementInModalLayer` 切换

两个方法的签名与普通图层的对应方法一致，分别把模态层内的元素设为暂停与恢复：

```typescript
deactivateElementInModalLayer(targetModalLayerId: string, targetElementId: string): void
activateElementInModalLayer(targetModalLayerId: string, targetElementId: string): void
```

模态层打开期间，屏幕的按键被屏障拦截，因此暂停与恢复的操作必须由模态层**内部**的元素来执行。下面的例子在同一个模态层里挂了两个元素：`ElementA` 绑定 `w` 计数，是被控制的元素；`ElementB` 用 `d` / `e` 暂停和恢复 `ElementA`。

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
  const { openModalLayer, applyElementToModalLayer } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    // 按 1 开启模态层，并挂载两个元素
    return boundKeyboard('1', () => {
      openModalLayer('confirm', 100);
      applyElementToModalLayer('confirm', {
        element: ElementA,
        elementId: 'element-a',
      });
      applyElementToModalLayer('confirm', {
        element: ElementB,
        elementId: 'element-b',
      });
    });
  }, [boundKeyboard, openModalLayer, applyElementToModalLayer]);

  return (
    <Box flexDirection="column">
      <Text bold>🏠 Home</Text>
      <Text>按 1 打开模态层</Text>
    </Box>
  );
}
registerComponent(Home, {});

// ElementA 是被控制的元素，绑定 w 计数
function ElementA() {
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
      width={40}
      height={5}
      borderStyle="single"
      borderColor="cyan"
      backgroundColor="black"
    >
      <Text>🅰️ Element A · w x{count}</Text>
    </Box>
  );
}

// ElementB 是控制元素，用 d / e 暂停和恢复 ElementA
function ElementB() {
  const {
    closeModalLayer,
    deactivateElementInModalLayer,
    activateElementInModalLayer,
  } = useScreenSystem();
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    const deactivate = boundKeyboard('d', () => {
      deactivateElementInModalLayer('confirm', 'element-a');
    });
    const activate = boundKeyboard('e', () => {
      activateElementInModalLayer('confirm', 'element-a');
    });
    const close = boundKeyboard('q', () => closeModalLayer('confirm'));
    return () => {
      deactivate();
      activate();
      close();
    };
  }, [boundKeyboard, closeModalLayer, deactivateElementInModalLayer, activateElementInModalLayer]);

  return (
    <Box
      position="absolute"
      top={8}
      left={30}
      width={40}
      height={5}
      borderStyle="single"
      borderColor="green"
      backgroundColor="black"
    >
      <Text>🅱️ Element B · d 暂停 A · e 恢复 A · q 关闭</Text>
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

按 `1` 打开模态层后：

- 按 `w` → `ElementA` 计数 +1，元素正常响应；
- 按 `d` 暂停 `ElementA`，它**仍显示**，但再按 `w` 计数不再变化；
- 按 `e` 恢复 `ElementA`，`w` 又能计数了；
- 按 `q` 关闭模态层。

值得注意：被暂停的元素收不到任何按键，因此它无法用自己身上的按键重新唤醒，必须由模态层内的其他元素调用 `activateElementInModalLayer`。

## 小结

| 手段 | 作用 |
| --- | --- |
| `applyElementToModalLayer` 的 `active` 字段 | 设定模态层内元素挂载后的初始键盘接收状态（默认 `true`） |
| `deactivateElementInModalLayer(modalLayerId, elementId)` | 暂停模态层内元素的键盘接收，元素仍渲染 |
| `activateElementInModalLayer(modalLayerId, elementId)` | 恢复模态层内元素的键盘接收 |

## 注意事项

1. **暂停不等于卸载。** 元素被暂停后依旧渲染，键盘注册数据保留，`activateElementInModalLayer` 可直接恢复。
2. **被暂停的元素收不到任何按键。** 它无法自我唤醒，必须由模态层内的其他元素调用恢复（模态层打开时屏幕被屏障拦截，通常由其他元素执行）。
3. **`active` 只影响键盘，不影响渲染。** 元素暂停后依旧显示，只是不响应按键。
4. **模态层的键盘屏障不因元素暂停而消失。** 即使模态层内所有元素都被暂停，未处理的按键仍被吞掉，不会漏到下面的界面。
5. **无法复活被 `eraseElementInModalLayer` 移除的元素。** 恢复需要重新 `applyElementToModalLayer`。

## 下一步

- 使用 `allowModal` 放行键盘事件：[allowModal 放行键盘事件](/zh/screen/allow-modal)
