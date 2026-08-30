# 快捷键与动作

在《基本绑定》一章里我们提到，`boundKeyboard` 一共有三种重载形式，前面只介绍了最基本的那种。本章补齐剩下的两种，并介绍配套的**动作系统**。至于多键连按的序列 `boundSequence`，我们留到后续章节专门讲解。

动作系统的核心思路是：**把"按下什么键"和"触发什么回调"彻底解耦**。你先把一组回调登记成"动作"，再通过动作 id 去绑定按键——改键位时不再需要动回调，改回调时也不用关心谁绑定了它。

## 特性预览

| 方法 | 作用 |
|------|------|
| `boundKeyboard(keys, handler, options?)` | 基本形式：显式键 + 回调（《基本绑定》已介绍） |
| `boundKeyboard(actionId, options?)` | 用动作的**预设键**绑定一个动作 |
| `boundKeyboard(keys, actionId, options?)` | 用**显式键**绑定一个动作（可覆盖预设键） |
| `defineShortcutAction` / `addAction` | 注册快捷键动作 |
| `hasAction` / `removeAction` / `modifyAction` | 查询 / 移除 / 修改快捷键动作 |

## 动作系统

快捷键动作（shortcut operation）是一个 `ShortcutOperationEntry`：

```typescript
type ShortcutOperationEntry = {
  actionId: string        // 动作的唯一标识，绑定与触发都靠它
  action: () => void      // 触发时执行的回调
  keys?: string[]         // 预设键，可省略
}
```

用 `defineShortcutAction` 一次注册多个，重复的 `actionId` 会抛错；`addAction` 每次只加一个：

```tsx
const { defineShortcutAction, addAction } = useKeyboard()

// 一次注册两个动作
defineShortcutAction([
  { actionId: "save", action: () => save(), keys: ["s"] },
  { actionId: "reset", action: () => reset(), keys: ["r"] },
])

// 再补一个，逐个注册
addAction({ actionId: "quit", action: () => process.exit(0) })
```

配套的查询与维护方法：

- `hasAction(actionId)` —— 判断动作是否已注册；
- `removeAction(actionId)` —— 移除动作，未注册时抛错；
- `modifyAction(actionId, keys)` —— 修改动作的预设键。动作必须注册过、且注册时带 `keys` 字段，否则抛错。

> 注意：`modifyAction` 修改的是注册表里的预设键，只影响**之后**再调用 `boundKeyboard(actionId)` 产生的绑定，已经绑定好的不受影响。动作注册表属于**引擎实例**，通过 `useKeyboard()` 拿到的都是当前 `KeyboardProvider` 那一份。

## `boundKeyboard` 的三种重载

基本形式 `boundKeyboard(keys, handler, options?)` 在《基本绑定》已经讲过，这里直接看剩下的两种动作重载。

### 动作 id 形式：`boundKeyboard(actionId, options?)`

用动作的**预设键**绑定：

```tsx
// save 的预设键是 s，所以这里绑定了 s
boundKeyboard("save")
```

按下 `s` 时，引擎会执行 `save` 动作的回调。

### 显式键 + 动作 id：`boundKeyboard(keys, actionId, options?)`

用**显式键**绑定，此时会覆盖预设键：

```tsx
// 不管 save 的预设键是什么，这里都绑到 x 上
boundKeyboard(["x"], "save")
```

两条规则值得记住：

- **`boundKeyboard(actionId)` 要求动作注册时带 `keys` 字段**，否则抛错 `does not have predefined keys`；而 `boundKeyboard(keys, actionId)` 不依赖预设键——动作没预设键时，只能用这种形式绑定。
- **`actionId` 未注册时两种形式都会抛错**：
  ```
  [keyboard-engine] Action "save" is not registered.
  ```

> 建议：把"预设键"当作动作的**默认键位**，适合常用动作；对需要额外别名或动态键位的场景，用显式键形式绑定，两者互不影响。

## 完整例子

到这里，我们把动作系统与三种重载串成一个**完整可运行**的应用——一张"快捷指令台"：左侧列出已注册的动作，右侧是实时事件日志。`save` 被 `s` 与 `x` 同时触发，`toggle` 是故意不设预设键的动作，只能用显式键绑定。将下面的代码保存为 `.tsx` 文件，执行 `npx tsx <文件名>.tsx` 即可运行。

::: details 点击展开完整示例代码（约 120 行）
```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text, render } from 'ink';
import {
  CurrentScreen,
  KeyboardProvider,
  ScenarioManagementProvider,
  registerComponent,
  useKeyboard,
} from 'ink-cartridge';

function ConsoleScreen() {
  const {
    boundKeyboard,
    defineShortcutAction,
    hasAction,
  } = useKeyboard();
  const [log, setLog] = useState<string[]>([]);

  // 稳定的追加函数，动作回调里直接使用
  const push = useCallback((msg: string) => {
    setLog((prev) => [msg, ...prev].slice(0, 6));
  }, []);

  useEffect(() => {
    // 注册快捷键动作（幂等：已注册则跳过）
    if (!hasAction('save')) {
      defineShortcutAction([
        { actionId: 'save', action: () => push('保存 (s)'), keys: ['s'] },
        { actionId: 'reset', action: () => push('重置 (r)'), keys: ['r'] },
        { actionId: 'toggle', action: () => push('切换 (t)') },   // 无预设键
      ]);
    }

    // 三种重载：动作 id + 预设键
    const unSave = boundKeyboard('save');
    const unReset = boundKeyboard('reset');
    // 显式键 + 动作 id（覆盖预设键）
    const unSaveAlias = boundKeyboard(['x'], 'save');
    // 显式键 + 动作 id（无预设键的动作只能用这种方式绑定）
    const unToggle = boundKeyboard(['t'], 'toggle');

    return () => {
      unSave(); unReset(); unSaveAlias(); unToggle();
    };
  }, [boundKeyboard, defineShortcutAction, hasAction, push]);

  return (
    <Box flexDirection="column" padding={1}>
      {/* 标题栏 */}
      <Box borderStyle="single" borderColor="cyan" paddingX={2}>
        <Text bold color="cyan">SHORTCUT & ACTION CONSOLE</Text>
        <Text dimColor>  ·  快捷键动作与 boundKeyboard 重载</Text>
      </Box>

      {/* 双栏：动作列表 + 事件日志 */}
      <Box flexDirection="row" gap={1} marginTop={1}>
        {/* 左侧：已注册动作 */}
        <Box width={30} borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1} paddingY={1}>
          <Text bold underline color="cyan">已注册动作</Text>
          <Box flexDirection="column" marginTop={1} gap={0}>
            <Text>▶ [s] 保存</Text>
            <Text dimColor>  [x] 保存（显式键）</Text>
            <Text dimColor>  [r] 重置</Text>
            <Text dimColor>  [t] 切换（无预设键）</Text>
          </Box>
        </Box>

        {/* 右侧：事件日志 */}
        <Box flexGrow={1} borderStyle="round" borderColor="magenta" flexDirection="column" paddingX={1} paddingY={1}>
          <Text bold underline color="magenta">事件日志</Text>
          <Box flexDirection="column" marginTop={1} gap={0}>
            {log.length === 0 && <Text dimColor>（尚无事件）</Text>}
            {log.map((line, i) => (
              <Text key={i} color={i === 0 ? 'green' : undefined}>· {line}</Text>
            ))}
          </Box>
        </Box>
      </Box>

      {/* 底栏：按键提示 */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={2}>
        <Text dimColor>
          s/x 保存 · r 重置 · t 切换 · q 退出
        </Text>
      </Box>
    </Box>
  );
}

registerComponent(ConsoleScreen, {});

function App() {
  const { boundKeyboard } = useKeyboard();
  useEffect(() => {
    return boundKeyboard(['q'], () => process.exit(0));
  }, [boundKeyboard]);
  return <CurrentScreen />;
}
registerComponent(App, {});

render(
  <ScenarioManagementProvider defaultScreen={ConsoleScreen} fullScreen>
    <KeyboardProvider>
      <App />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
```
:::

### 操作指南

| 按键 | 效果 | 触发方式 |
|------|------|----------|
| `s` | 保存 | 动作 id + 预设键 |
| `x` | 保存 | 显式键 + 动作 id（覆盖预设键） |
| `r` | 重置 | 动作 id + 预设键 |
| `t` | 切换 | 显式键 + 动作 id（动作无预设键） |
| `q` | 退出 | 基本形式 `boundKeyboard(keys, handler)` |

### 你应该观察到的效果

1. **回调与按键解耦**：`save` 只注册了一次回调，却能同时被 `s`（预设键）和 `x`（显式键）触发——改键位完全不用碰回调。

2. **预设键不是必须的**：`toggle` 注册时没带 `keys`，所以 `boundKeyboard('toggle')` 会抛错；代码里用显式键 `boundKeyboard(['t'], 'toggle')` 绑定它，运行正常。

3. **注册表是独立的**：动作注册一次即可被多个键、多个绑定引用；`hasAction` 判断、`removeAction` 移除、`modifyAction` 改预设键（只影响之后的绑定）。
