# ink-kit Keyboard System

## 一句话

键盘系统为终端 UI 提供**分层按键事件处理**，替代手写 `useInput` + `if-else` 的混乱模式。每个屏幕（和叠加层）拥有独立的按键绑定层，事件按优先级链自上而下分发。

---

## 架构：6 阶段管道

每次按键事件依次经过 6 个处理器阶段。第一个"消费"该事件的阶段会阻止后续阶段继续处理：

```
按键事件 (useInput)
    │
    ▼
┌─ ① GlobalSequence (affectOverlay: true) ─┐  全局序列键
├─ ② GlobalKey (affectOverlay: true) ──────┤  全局快捷键（在 overlay 之前）
├─ ③ Overlay broadcast ────────────────────┤  活跃的叠加层（按 zIndex 升序）
├─ ④ GlobalSequence (affectOverlay: false) ┤  全局序列键（在 overlay 之后）
├─ ⑤ GlobalKey (affectOverlay: false) ─────┤  全局快捷键（在屏幕栈之前）
└─ ⑥ Screen stack (top → bottom) ─────────┘  当前屏幕 → 父屏幕 → … → 根屏幕
    │
    ▼
 丢弃（无人处理）
```

### 为什么是 6 个阶段

前两个阶段（① + ②）的 `affectOverlay: true` 版本**在 overlay 之前**触发，意味着你可以注册"即使有弹窗也能响应"的全局快捷键。默认的 `affectOverlay: false`（④ + ⑤）在 overlay **之后**触发——只有当活跃 overlay 没有消费事件时才会尝试。

阶段 ③ 负责将事件**广播**给所有活跃的 overlay（按 zIndex 从低到高排序）。每个 overlay 是一个独立的键盘层。

阶段 ⑥ 沿屏幕栈**从顶向底**遍历：当前屏幕 → 父屏幕 → 祖父屏幕 → … → 根屏幕。第一个匹配的绑定消费事件并停止传播。

---

## 核心机制（四种）

### 1. `boundKeyboard` — 屏幕层绑定

最常见的方式。在屏幕组件内注册按键绑定，绑定随组件卸载自动清理。

```tsx
useEffect(() => {
  return boundKeyboard(['s'], () => skip(Game, {}));
}, []);
```

支持 `focusId`（绑定到焦点目标）、`once`（单次触发后解绑）、`times`（连击 N 次触发）、`observer`（实时回调剩余次数）、`onlyThis`（仅当屏幕在栈顶时生效）、`when`（动态条件开关）。

### 2. `globalKeys` — 全局快捷键

独立于屏幕栈，在所有屏幕下都可用（除非 `category` 白名单限制）。

```tsx
globalKeys([
  { key: 'q', operate: () => process.exit() },
  { key: 'h', operate: showHelp, affectOverlay: true },
], { mode: 'add' });
```

### 3. `blockedKey` — 穿透（让路）

标记按键为"透明"，使其穿透当前层继续向下传播。

```
顶层绑定: blockedKey(['tab'])   ← tab 穿透
底层绑定: boundKeyboard(['tab'], handleTab)  ← 底层收到 tab
```

> 命名警示：`blockedKey` 的含义是"挡住这一层自己不处理"，不是"阻止按键"。

### 4. `stop` — 阻断（拦截）

阻止匹配的按键向更低层传播。

```
顶层绑定: stop(['escape'])      ← escape 到此为止
底层绑定: boundKeyboard(['escape'], handleEsc)  ← 永远收不到
```

---

## 焦点系统

每个屏幕层内部维护一组**焦点目标**（focus targets），通过 `focusId` 标识。同一层同时只有一个活跃焦点。

```
屏幕层 Menu:
  ├─ focusTarget: 'search' ── boundKeyboard(['a'..'z'], onSearchInput)
  │                           boundKeyboard(['escape'], clearSearch)
  │
  ├─ focusTarget: 'list'  ── boundKeyboard(['j','k'], navigateList)
  │                           boundKeyboard(['enter'], selectItem)
  │
  └─ 层内绑定 ─────────────── boundKeyboard(['tab'], focusNext)
```

Tab 在焦点间循环切换：`search → list → search → …`

只有**活跃焦点目标**的绑定才会被评估。层内绑定（无 focusId）始终评估，但在活跃焦点之后。

---

## 事件处理内部流程

当按键到达屏幕层（阶段 ⑥）时，`handleLayer` 按以下顺序评估：

```
1. Tab/Shift+Tab 焦点切换       ← 最高优先（仅栈顶层）
2. 过滤 blockedKey              ← 移除被"穿透"的键名
3. 通配符 * 优先模式（若启用）   ← 仅栈顶层
4. 序列匹配（boundSequence）     ← 仅栈顶层
5. 活跃焦点目标绑定              ← 精确匹配 + 通配符
6. 层内绑定                      ← 精确匹配 + 通配符
7. stop 检查                     ← 阻断向下传播
```

每一步消费事件后立即返回 `true`，跳过后续步骤。

---

## 序列键（Sequence）

序列键匹配**连续多个按键**，如 Vim 的 `gg`、`dd`。优先级高于普通单键绑定。

```tsx
boundSequence(['g', 'g'], () => gotoScreen(Top));
```

序列有**超时机制**（默认 500ms）——如果在超时前未完成序列，自动取消。支持 `exclusive` 模式（不匹配的键被吞掉）和 `onlyThis`/`focusId`。

全局序列（`globalSequence`）有额外维度：`affectOverlay`、`cover`、`category`。

---

## 设计原则

1. **事件消费即停止** — 一个管道阶段处理了按键，后续阶段不再收到。确保行为可预测。

2. **中间未达标的按键被吞掉** — `times` 模式下，第 1~(N-1) 次按键虽然未触发 handler，但返回 `true` 阻止向下传播。否则下层会"偷到"这些按键。

3. **绑定随组件卸载自动清理** — `boundKeyboard` 返回的 cleanup 函数在 `useEffect` 的 return 中执行，组件离开屏幕栈时绑定自动移除。

4. **Provider 嵌套顺序有要求** — `KeyboardProvider` 必须嵌套在 `ScenarioManagementProvider` 内部，否则无法获取屏幕栈信息。

5. **管道是纯函数链** — 每个处理器（processor）是独立的 `{ process(ctx) }` 对象，便于测试和扩展。

---

## 相关文档

| 文档 | 内容 |
|------|------|
| [keyboard.md](./keyboard.md) | 完整 API 参考 |
| [screen.md](./screen.md) | 屏幕导航系统 |
| [theme.md](./theme.md) | 主题系统 |
| [language.md](./language.md) | 国际化 |
| [storage.md](./storage.md) | JSON 持久化 |
| [binary-storage.md](./binary-storage.md) | 二进制 FIFO 存储 |
