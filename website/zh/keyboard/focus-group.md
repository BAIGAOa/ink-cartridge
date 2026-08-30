# 默认组与命名组

在一些时候，我们可能会期望一个屏幕可以同时存在多个焦点，而 ink-cartridge 提供了一套完整的多焦点组系统。

## 什么是默认组与命名组

上一篇文章里我们认识了焦点与焦点目标：一个屏幕在同一时刻只有一个激活的焦点，Tab 在它们之间轮转。但你有没有想过，这些焦点并不是散落一地的——它们被收进一个个**组**里，上一篇文章讲的一切，其实都发生在**默认组**之中。

**组**是焦点系统里的一层容器。每个组都维护三样东西：自己的一组焦点目标、它们的注册顺序、以及当前激活的那一个。当你用 `boundKeyboard` 绑定一条带 `focusId` 的按键、却没有额外指定组名时，这个焦点目标就被放进**默认组**——一个不需要命名、始终存在、承接所有"无主"目标的组。

而**命名组**多了一个维度：你可以给一组焦点目标起一个名字，把它们收进独立的组。命名组与默认组遵守同一条规则——**每个组内同时只有一个激活的焦点**——但组与组之间互不相干：默认组里激活着一个焦点，名为 `nav` 的组里也可以激活着一个焦点，彼此不会互相"让位"。

这正是"多焦点"的含义。单个组内依然是"一个话筒"，但一个屏幕可以同时挂着好几只话筒，每只话筒分属一个组。

回到上一篇文章的场景：`select-a`、`select-b` 两个选择栏挤在默认组里，同一时刻只有一个持有焦点。现在设想一个更复杂的界面——左侧导航栏，右侧设置表单。我们希望上下箭头在导航栏内移动，Tab 在表单字段之间跳转，二者同时可用。若把四个目标统统塞进默认组，它们会竞争同一个激活位置，永远只有其一处于激活状态。

命名组正是为此设计的。把导航栏的目标放进名为 `nav` 的组，表单字段的目标放进名为 `form` 的组，两个组各自握住一只话筒：

```tsx
// 放进默认组：focusId 传字符串
boundKeyboard(["up", "down"], handleNav, { focusId: "nav-item-1" })

// 放进名为 form 的命名组：focusId 传 { group, focusId } 对象
boundKeyboard(["tab"], handleForm, { focusId: { group: "form", focusId: "theme-field" } })
```

注意 `focusId` 的两种写法：字符串表示放进**默认组**；`{ group, focusId }` 对象表示放进指定的**命名组**。引擎在内部为每个组各自维护注册顺序与激活状态，而 `focusSet`、`focusNext` 这些方法的 `group` 参数与之一一对应，告诉引擎"在哪个组里操作"。

> 注意：命名组的焦点不会自己"点亮"。屏幕上**第一个**被创建的焦点会自动激活（即上一篇文章的"自动激活"规则），但此后创建的命名组默认处于熄灯状态——哪怕它注册了焦点目标，也不持有话筒，直到你显式激活它。这正是下一节要介绍的 `activateFocusGroup`。

## 使用多焦点组配合 `boundKeyboard`

把焦点目标收进命名组，用的仍然是 `boundKeyboard`，只需把 `focusId` 从字符串换成 `{ group, focusId }` 对象。上一节的导航栏 + 表单场景，注册代码长这样：

```tsx
useEffect(() => {
    // 导航栏目标：收进名为 nav 的组
    const unUp = boundKeyboard(["up"], () => moveNav(-1),
        { focusId: { group: "nav", focusId: "nav-list" } })
    const unDown = boundKeyboard(["down"], () => moveNav(1),
        { focusId: { group: "nav", focusId: "nav-list" } })

    // 表单字段目标：收进名为 form 的组
    const unTab = boundKeyboard(["tab"], () => nextField(),
        { focusId: { group: "form", focusId: "field-1" } })

    // form 组不会自动点亮，需要显式唤醒
    activateFocusGroup("field-1", "form")

    return () => { unUp(); unDown(); unTab() }
}, [boundKeyboard, activateFocusGroup])
```

注册之后，引擎为每个组单独维护一张焦点表：`nav` 组里有 `nav-list`，`form` 组里有 `field-1`，各自持有独立的注册顺序与激活状态。

关键区别就在这里——**多焦点模式下，所有处于激活状态的焦点会同时监听按键**。引擎路由一个按键时，会把每个组当前激活的焦点的绑定全部收集起来，依次尝试匹配：

- 按下箭头 → 命中 `nav` 组激活焦点 `nav-list` 上的绑定，导航栏上移；
- 按 Tab → 命中 `form` 组激活焦点 `field-1` 上的绑定，切到下一个字段。

两者同时在线、互不干扰——这正是"每个组一只话筒"的具体表现：你按下什么键，就由握持对应话筒的组来应答。如果两个激活的焦点绑定了同一个按键，冲突按激活顺序解决——`currentFocusIds` 里靠前的先被尝试，命中即停。

> 注意：`autoTab` 只会在**默认组**内轮转焦点。若你的交互目标全部收在命名组里（像上面的例子这样），默认组里无目标可轮，开启 `autoTab` 帮不上忙；命名组内的轮转需要手动调用 `focusNext("组名")` 之类的组内方法，见下一节。

回到上一节的提醒：`nav-list` 是屏幕上第一个被创建的焦点，会自动点亮；而 `form` 组默认处于熄灯状态，它的 Tab 绑定暂时不会被尝试。代码里的 `activateFocusGroup("field-1", "form")` 正是用来唤醒它的——把 `field-1` 设为 `form` 组的激活焦点。至于 `activateFocusGroup` 的完整语义，与 `focusSet`、`kickFocusGroup` 一起在下一节细讲。

## 使用 `focusSet` 等方法配合焦点组

真正"操纵"这些组的是引擎提供的一组方法。它们大多接受一个可选的 `group` 参数；**缺省时作用于默认组**——上一篇文章里 `focusSet("select-b")`、`focusNext()` 的行为，其实正是"组参数缺省"的特例。

### 点亮与熄灭：`activateFocusGroup` / `kickFocusGroup`

命名组默认熄灯，`activateFocusGroup(focusId, group)` 负责唤醒：

```tsx
const { activateFocusGroup } = useKeyboard()

// 让 form 组的 field-1 持有该组的话筒
activateFocusGroup("field-1", "form")
```

它有两点值得注意：

- **只对"熄灯"的组生效**：如果 `form` 组当前已有一个激活焦点，调用会返回 `false` 且不做任何事——它不会在组内切换焦点，切换请用 `focusSet`；
- 组未注册、或组内不存在 `focusId` 时，同样返回 `false`。

与之相对的 `kickFocusGroup(group)`，把整组的激活焦点移除，让组回到熄灯状态：

```tsx
const { kickFocusGroup } = useKeyboard()

// 熄灭 form 组：它不再持有任何焦点
kickFocusGroup("form")
```

`kickFocusGroup` 成功移除时返回 `true`；组内本就没有激活焦点、或组未注册时返回 `false`。被熄灭的组，其成员的绑定不再被路由；想重新点亮，再次调用 `activateFocusGroup` 即可。`kickFocusGroup` 缺省组名时，熄灭的是默认组。

### 组内切换：`focusSet` / `focusNext` / `focusPrev`

组被点亮后，在组内移动焦点与默认组并无二致，只是每个方法多带一个 `group`：

```tsx
// 在 form 组内强制切到另一个字段
focusSet("password-field", "form")

// 在 form 组内按注册顺序前进 / 后退（Tab / Shift+Tab 行为）
focusNext("form")
focusPrev("form")
```

- `focusSet(focusId, group)`：**强制切换**，直接替换掉 `group` 当前的激活焦点。指向未注册的组、或组内不存在的 `focusId` 时，引擎会抛出错误：
  ```
  [keyboard-engine] focusSet("password-field", "form"): Focus group form is not registered...
  ```
- `focusNext(group)` / `focusPrev(group)`：**循环移动**，沿组内注册顺序走、末尾回绕。与默认组相同的两条细节也成立：组内没有激活焦点时它们什么都不做——只"接着当前的走"，不会凭空点亮一个组；组内只有一个目标时原地不动。组未注册时同样抛错。

> 注意：被唤醒后想在 `form` 组内用 Tab 轮转，可以手动绑定 `boundKeyboard(["tab"], () => focusNext("form"))`——`autoTab` 不会替你轮命名组。

### 按组查询：`focusCurrent` / `useFocusState`

`focusCurrent(group)` 按组读取当前激活的焦点：

```tsx
const result = focusCurrent("form")
// result 形如 { result: { id: "field-1", fromGroup: "form" } }
// 组熄灯或未注册时返回 { noFound: true }
```

`useFocusState(focusId, group)` 则是声明式的版本，跟随焦点变化自动重渲染，适合驱动组内的焦点高亮：

```tsx
const focused = useFocusState("field-1", "form")
// form 组的激活焦点是 field-1 时为 true
```

### 注销组内焦点：`focusUnregister`

`focusUnregister(focusId, group)` 从命名组里注销一个目标。若它恰好是该组当前的激活焦点，焦点会移交给组内注册顺序中的第一个剩余目标；组内已空时，该组的激活条目一并消失，组重新回到熄灯状态。

## 完整例子

到这里，我们把多焦点组串成一个**完整可运行**的应用——一张"双核"控制台：左侧设备列表是命名组 `devices`，右侧设置面板是命名组 `settings`。两个区域各自拥有多个控件，每个控件在组内都是独立的焦点目标，且两组**同时**处于激活状态、互不抢占。将下面的代码保存为 `.tsx` 文件，执行 `npx tsx <文件名>.tsx` 即可运行。

::: details 点击展开完整示例代码（约 190 行）
```tsx
import React, { useEffect, useState } from 'react';
import { Box, Text, render } from 'ink';
import {
  CurrentScreen,
  KeyboardProvider,
  ScenarioManagementProvider,
  registerComponent,
  useFocusState,
  useKeyboard,
} from 'ink-cartridge';

// 右侧设置面板各字段的可选项
const THEMES = ['深色', '浅色', '跟随系统'];
const VOLUMES = ['20%', '40%', '60%', '80%', '100%'];
const LANGUAGES = ['中文', 'English', '日本語'];

// 左侧设备列表
const DEVICES = [
  { id: 'device-cpu', label: 'CPU', defaultOn: true },
  { id: 'device-gpu', label: 'GPU', defaultOn: true },
  { id: 'device-fan', label: 'FAN', defaultOn: false },
  { id: 'device-led', label: 'LED', defaultOn: true },
];

// 左侧设备行：devices 组内的独立焦点，Enter 只开关当前选中的设备
function DeviceItem({
  id,
  label,
  defaultOn,
}: {
  id: string;
  label: string;
  defaultOn: boolean;
}) {
  const active = useFocusState(id, 'devices');
  const { boundKeyboard } = useKeyboard();
  const [on, setOn] = useState(defaultOn);

  useEffect(() => {
    return boundKeyboard(['return'], () => setOn((v) => !v), {
      focusId: { group: 'devices', focusId: id },
    });
  }, [boundKeyboard, id]);

  return (
    <Box flexDirection="row" gap={1}>
      <Text color={active ? 'cyan' : undefined} bold={active}>
        {active ? '▶' : ' '} {label}
      </Text>
      <Text color={on ? 'green' : 'red'} bold>{on ? '[ON]' : '[OFF]'}</Text>
    </Box>
  );
}

// 右侧设置行：settings 组内的独立焦点，只有被激活的行才响应 ←→
function SettingRow({
  id,
  label,
  options,
}: {
  id: string;
  label: string;
  options: string[];
}) {
  const active = useFocusState(id, 'settings');
  const { boundKeyboard } = useKeyboard();
  const [value, setValue] = useState(options[0]);

  useEffect(() => {
    const unDec = boundKeyboard(['left'], () =>
      setValue((v) => options[(options.indexOf(v) - 1 + options.length) % options.length]),
      { focusId: { group: 'settings', focusId: id } },
    );
    const unInc = boundKeyboard(['right'], () =>
      setValue((v) => options[(options.indexOf(v) + 1) % options.length]),
      { focusId: { group: 'settings', focusId: id } },
    );
    return () => { unDec(); unInc(); };
  }, [boundKeyboard, options, id]);

  return (
    <Box flexDirection="row" gap={1}>
      <Text color={active ? 'magenta' : undefined} bold={active}>
        {active ? '●' : '○'} {label}
      </Text>
      <Text dimColor>:</Text>
      <Text color={active ? 'magenta' : undefined} bold={active}>
        {value}
      </Text>
      <Text dimColor>{active ? '◀ ▶' : ''}</Text>
    </Box>
  );
}

// 底栏状态：订阅焦点变化，实时显示两个组各自激活的焦点
function GroupStatusBar() {
  const { focusCurrent, subscribeFocus } = useKeyboard();
  const [devId, setDevId] = useState<string | undefined>(() => focusCurrent('devices').result?.id);
  const [setId, setSetId] = useState<string | undefined>(() => focusCurrent('settings').result?.id);

  useEffect(() => {
    return subscribeFocus(() => {
      setDevId(focusCurrent('devices').result?.id);
      setSetId(focusCurrent('settings').result?.id);
    });
  }, [subscribeFocus, focusCurrent]);

  return (
    <Box flexDirection="row" gap={3} paddingX={2}>
      <Text color="cyan">● devices → {devId ?? '(熄灭)'}</Text>
      <Text color="magenta">● settings → {setId ?? '(熄灭)'}</Text>
    </Box>
  );
}

function ConsoleScreen() {
  const {
    boundKeyboard, focusNext, focusPrev,
    activateFocusGroup, kickFocusGroup, focusCurrent,
  } = useKeyboard();
  const [settingsLit, setSettingsLit] = useState(true);

  useEffect(() => {
    // 屏幕级按键：↑↓ 在 devices 组内移动设备选择，Tab/Shift+Tab 在 settings 组内切换字段
    const unUp = boundKeyboard(['up'], () => focusPrev('devices'));
    const unDown = boundKeyboard(['down'], () => focusNext('devices'));
    const unTab = boundKeyboard(['tab'], () => focusNext('settings'));
    const unShiftTab = boundKeyboard(['shift+tab'], () => focusPrev('settings'));

    // b 开关右侧面板：用 focusCurrent 判断当前是否点亮，再决定熄灭或唤醒
    const unToggle = boundKeyboard(['b'], () => {
      const lit = focusCurrent('settings').result !== undefined;
      if (lit) {
        kickFocusGroup('settings');
        setSettingsLit(false);
      } else {
        activateFocusGroup('settings-theme', 'settings');
        setSettingsLit(true);
      }
    });

    // 点亮两个组：devices 组的第一个控件会自动激活，这里再显式唤醒 settings 组
    activateFocusGroup('device-cpu', 'devices');
    activateFocusGroup('settings-theme', 'settings');

    return () => { unUp(); unDown(); unTab(); unShiftTab(); unToggle(); };
  }, [boundKeyboard, focusNext, focusPrev, activateFocusGroup, kickFocusGroup, focusCurrent]);

  return (
    <Box flexDirection="column" padding={1}>
      {/* 标题栏 */}
      <Box borderStyle="single" borderColor="cyan" paddingX={2}>
        <Text bold color="cyan">SYSTEM CONSOLE</Text>
        <Text dimColor>  ·  两个焦点组同时激活</Text>
      </Box>

      {/* 双栏主体 */}
      <Box flexDirection="row" gap={1} marginTop={1}>
        {/* 左侧：设备（devices 组） */}
        <Box width={26} borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1} paddingY={1}>
          <Text bold underline color="cyan">Devices · devices</Text>
          <Box flexDirection="column" marginTop={1} gap={1}>
            {DEVICES.map((d) => (
              <DeviceItem key={d.id} id={d.id} label={d.label} defaultOn={d.defaultOn} />
            ))}
          </Box>
          <Box marginTop={1}>
            <Text dimColor>↑↓ 选择 · Enter 开关</Text>
          </Box>
        </Box>

        {/* 右侧：设置（settings 组） */}
        <Box flexGrow={1} borderStyle="round" borderColor={settingsLit ? 'magenta' : 'gray'} flexDirection="column" paddingX={1} paddingY={1}>
          <Text bold underline color={settingsLit ? 'magenta' : undefined}>
            Settings · settings{settingsLit ? '' : '（已熄灭）'}
          </Text>
          <Box flexDirection="column" marginTop={1} gap={1}>
            <SettingRow id="settings-theme" label="主题" options={THEMES} />
            <SettingRow id="settings-volume" label="音量" options={VOLUMES} />
            <SettingRow id="settings-lang" label="语言" options={LANGUAGES} />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>{settingsLit ? 'Tab 切换字段 · ←→ 调整值' : '按 b 唤醒该面板'}</Text>
          </Box>
        </Box>
      </Box>

      {/* 底栏：实时焦点状态 + 按键提示 */}
      <Box flexDirection="column" marginTop={1}>
        <GroupStatusBar />
        <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={2}>
          <Text dimColor>
            ↑↓ 设备 · Enter 开关 · ←→ 调整 · Tab 切字段 · b 开关右侧 · q 退出
          </Text>
        </Box>
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

一进程序，你看到的是一张"双核"控制台：左侧设备列表与右侧设置面板**同时**处于激活状态——这正是多焦点组的核心能力。

| 按键 | 作用 | 所属组 |
|------|------|--------|
| `↑` / `↓` | 在左侧设备列表中移动选择 | 命名组 `devices` |
| `Enter` | 开关当前选中的设备 | 命名组 `devices`（仅选中项响应） |
| `Tab` / `Shift+Tab` | 在右侧设置面板中切换字段 | 命名组 `settings` |
| `←` / `→` | 调整当前字段的值（循环切换选项） | 命名组 `settings`（仅激活字段响应） |
| `b` | 熄灭 / 唤醒右侧 `settings` 组 | — |
| `q` | 退出程序 | — |

### 你应该观察到的效果

1. **两个焦点组同时在线**：程序启动后，左侧第一台设备与右侧"主题"字段同时高亮，底栏同时显示 `devices → device-cpu` 与 `settings → settings-theme`。两个命名组各握一只话筒，互不抢占。

2. **每个控件都是组内的独立焦点**：`Enter` 只开关当前选中的设备——把选择移到 `GPU` 上再按 `Enter`，翻转的是 `GPU` 而不是 `CPU`；`←` / `→` 只调整当前字段的值。每个控件都拥有自己的焦点目标，只有激活的那一个才会响应按键。

3. **互不干扰的操作**：按 `↑` / `↓` 移动设备选择时，右侧设置纹丝不动；按 `←` / `→` 调整值时，左侧设备保持不变。按下哪个键，就由握持对应话筒的组来应答——两个区域可以穿插操作，无需任何"切换模式"。

4. **整组熄灭与唤醒**：按 `b` 熄灭 `settings` 组——右侧面板变暗、字段提示消失，此时 `←` / `→` 与 `Tab` 全部失效，但左侧 `devices` 组依然正常工作；再按 `b` 重新点亮，一切恢复。

## 下一步

- 学习 ink-cartridge 的快捷键动作系统与 `boundKeyboard` 的三种重载，把回调与按键解耦。[快捷键与动作](/zh/keyboard/shortcuts-actions)

