# Default groups and named groups

Sometimes we may want a single screen to have several focuses at the same time, and ink-cartridge provides a complete multi-focus group system.

## What are default groups and named groups

In the previous article we met focus and focus targets: a screen has only one active focus at a time, and Tab cycles between them. But have you ever wondered — these focuses aren't scattered around; they're gathered into **groups**, and everything from the previous article actually happens inside the **default group**.

A **group** is a container in the focus system. Each group maintains three things: its own set of focus targets, their registration order, and the currently active one. When you bind a key carrying a `focusId` via `boundKeyboard` without specifying a group name, that focus target goes into the **default group** — a group that needs no name, always exists, and takes in all "ownerless" targets.

A **named group** adds another dimension: you can give a set of focus targets a name and gather them into an independent group. Named groups follow the same rule as the default group — **each group allows only one active focus at a time** — but groups are independent of each other: the default group can hold an active focus while a group named `nav` also holds one, and neither "steps aside" for the other.

That's the meaning of "multi-focus". Inside a single group it's still "one microphone", but a screen can hang several microphones at once, one per group.

Back to the previous article's scene: the two select lists `select-a` and `select-b` are squeezed into the default group, and only one holds focus at a time. Now imagine a more complex interface — a navigation bar on the left, a settings form on the right. We want the up/down arrows to move inside the navigation bar while Tab jumps between form fields, both usable at the same time. If we stuff all four targets into the default group, they'd compete for the same active slot, and only one could ever be active.

Named groups are designed for exactly this. Put the navigation targets into a group named `nav` and the form-field targets into a group named `form`, and each group holds its own microphone:

```tsx
// Into the default group: focusId is a string
boundKeyboard(["up", "down"], handleNav, { focusId: "nav-item-1" })

// Into a named group called form: focusId is a { group, focusId } object
boundKeyboard(["tab"], handleForm, { focusId: { group: "form", focusId: "theme-field" } })
```

Note the two forms of `focusId`: a string means the **default group**; a `{ group, focusId }` object means the given **named group**. Internally the engine maintains separate registration order and activation state per group, and the `group` parameter of methods like `focusSet`, `focusNext` maps one-to-one onto them, telling the engine "which group to operate in".

> Note: a named group's focus won't "light up" by itself. The **first** focus created on the screen is auto-activated (the "auto-activation" rule from the previous article), but named groups created after that start dormant — even though they've registered focus targets, they don't hold a microphone until you explicitly activate them. That's exactly what `activateFocusGroup` (next section) is for.

## Using multi-focus groups with `boundKeyboard`

To gather focus targets into named groups, you still use `boundKeyboard` — just change `focusId` from a string to a `{ group, focusId }` object. The nav-bar + form scenario from the last section registers like this:

```tsx
useEffect(() => {
    // Navigation-bar target: into a group named nav
    const unUp = boundKeyboard(["up"], () => moveNav(-1),
        { focusId: { group: "nav", focusId: "nav-list" } })
    const unDown = boundKeyboard(["down"], () => moveNav(1),
        { focusId: { group: "nav", focusId: "nav-list" } })

    // Form-field target: into a group named form
    const unTab = boundKeyboard(["tab"], () => nextField(),
        { focusId: { group: "form", focusId: "field-1" } })

    // The form group doesn't light up automatically; wake it up explicitly
    activateFocusGroup("field-1", "form")

    return () => { unUp(); unDown(); unTab() }
}, [boundKeyboard, activateFocusGroup])
```

After registration, the engine maintains a separate focus table per group: `nav` has `nav-list`, `form` has `field-1`, each with its own registration order and activation state.

Here's the key difference — **in multi-focus mode, all active focuses listen for keys at the same time**. When the engine routes a key, it gathers the bindings of every group's currently active focus and tries them one by one:

- Pressing down → hits the binding on `nav`'s active focus `nav-list`, moving the nav bar down;
- Pressing Tab → hits the binding on `form`'s active focus `field-1`, switching to the next field.

Both stay online at once and don't interfere — this is what "one microphone per group" looks like in practice: whatever key you press is answered by the group holding that microphone. If two active focuses bind the same key, the conflict is resolved by activation order — the one earlier in `currentFocusIds` is tried first, and stops once hit.

> Note: `autoTab` only rotates focus inside the **default group**. If all your interactive targets live in named groups (like the example above), the default group has nothing to rotate, so enabling `autoTab` doesn't help; rotating inside a named group requires calling a group-scoped method like `focusNext("group-name")` manually — see the next section.

Back to the reminder from the last section: `nav-list` is the first focus created on the screen and lights up automatically; the `form` group, on the other hand, starts dormant, so its Tab binding isn't tried yet. The `activateFocusGroup("field-1", "form")` in the code is exactly what wakes it up — it makes `field-1` the `form` group's active focus. As for the full semantics of `activateFocusGroup`, we'll go over them together with `focusSet` and `kickFocusGroup` in the next section.

## Using `focusSet` and other methods with focus groups

The methods that truly "drive" these groups are provided by the engine. Most accept an optional `group` parameter; **when omitted, they operate on the default group** — the `focusSet("select-b")` and `focusNext()` behavior from the previous article is really just the "omitted group parameter" special case.

### Lighting up and turning off: `activateFocusGroup` / `kickFocusGroup`

Named groups start dormant, and `activateFocusGroup(focusId, group)` wakes one up:

```tsx
const { activateFocusGroup } = useKeyboard()

// Make field-1 hold the microphone of the form group
activateFocusGroup("field-1", "form")
```

Two things worth noting:

- **Only works on a "dormant" group**: if the `form` group already has an active focus, the call returns `false` and does nothing — it won't switch focus inside a group; use `focusSet` for switching;
- It also returns `false` when the group isn't registered, or the `focusId` doesn't exist in it.

The counterpart is `kickFocusGroup(group)`, which removes the group's active focus and sends the group back to dormancy:

```tsx
const { kickFocusGroup } = useKeyboard()

// Turn off the form group: it no longer holds any focus
kickFocusGroup("form")
```

`kickFocusGroup` returns `true` when it successfully removes the focus; `false` when the group had no active focus, or isn't registered. Once a group is turned off, its members' bindings are no longer routed; to light it up again, call `activateFocusGroup` once more. When the group name is omitted, `kickFocusGroup` turns off the default group.

### Switching inside a group: `focusSet` / `focusNext` / `focusPrev`

Once a group is lit, moving focus inside it is no different from the default group — each method just carries a `group`:

```tsx
// Force-switch to another field inside the form group
focusSet("password-field", "form")

// Move forward / backward inside the form group by registration order (Tab / Shift+Tab behavior)
focusNext("form")
focusPrev("form")
```

- `focusSet(focusId, group)`: **force-switches**, directly replacing the group's current active focus. When it points at an unregistered group, or a `focusId` that doesn't exist in the group, the engine throws:
  ```
  [keyboard-engine] focusSet("password-field", "form"): Focus group form is not registered...
  ```
- `focusNext(group)` / `focusPrev(group)`: **cycle**, moving along the group's registration order and wrapping at the end. The same two details as the default group hold: when the group has no active focus they do nothing — they only "continue from the current one", never lighting up a group out of thin air; when the group has only one target they stay put. They also throw when the group isn't registered.

> Note: after waking a group, if you want Tab to rotate inside the `form` group, bind `boundKeyboard(["tab"], () => focusNext("form"))` manually — `autoTab` won't rotate named groups for you.

### Querying per group: `focusCurrent` / `useFocusState`

`focusCurrent(group)` reads the currently active focus of a group:

```tsx
const result = focusCurrent("form")
// result looks like { result: { id: "field-1", fromGroup: "form" } }
// returns { noFound: true } when the group is dormant or unregistered
```

`useFocusState(focusId, group)` is the declarative version — it follows focus changes and re-renders automatically, perfect for driving focus highlighting inside a group:

```tsx
const focused = useFocusState("field-1", "form")
// true while the form group's active focus is field-1
```

### Unregistering a focus inside a group: `focusUnregister`

`focusUnregister(focusId, group)` unregisters a target from a named group. If it happens to be the group's current active focus, focus is handed to the first remaining target in the group's registration order; when the group becomes empty, its active entry disappears too, and the group returns to dormancy.

## Complete example

By now we can tie multi-focus groups together into a **fully runnable** app — a "dual-core" console: the left device list is the named group `devices`, and the right settings panel is the named group `settings`. Each region has several controls, every control is an independent focus target inside its group, and both groups are **active at the same time** without stealing focus from each other. Save the code below as a `.tsx` file and run `npx tsx <file-name>.tsx`.

::: details Click to expand the full example (~190 lines)
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

// Options for each field in the right settings panel
const THEMES = ['Dark', 'Light', 'Follow system'];
const VOLUMES = ['20%', '40%', '60%', '80%', '100%'];
const LANGUAGES = ['Chinese', 'English', 'Japanese'];

// Left device list
const DEVICES = [
  { id: 'device-cpu', label: 'CPU', defaultOn: true },
  { id: 'device-gpu', label: 'GPU', defaultOn: true },
  { id: 'device-fan', label: 'FAN', defaultOn: false },
  { id: 'device-led', label: 'LED', defaultOn: true },
];

// Left device row: an independent focus inside the devices group;
// Enter only toggles the currently selected device
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

// Right settings row: an independent focus inside the settings group;
// only the active row responds to ←→
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

// Bottom status bar: subscribes to focus changes and shows each group's
// active focus in real time
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
      <Text color="cyan">● devices → {devId ?? '(dormant)'}</Text>
      <Text color="magenta">● settings → {setId ?? '(dormant)'}</Text>
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
    // Screen-level keys: ↑↓ move the device selection inside the devices
    // group, Tab/Shift+Tab switch fields inside the settings group
    const unUp = boundKeyboard(['up'], () => focusPrev('devices'));
    const unDown = boundKeyboard(['down'], () => focusNext('devices'));
    const unTab = boundKeyboard(['tab'], () => focusNext('settings'));
    const unShiftTab = boundKeyboard(['shift+tab'], () => focusPrev('settings'));

    // b toggles the right panel: use focusCurrent to check whether it's lit,
    // then turn it off or wake it up
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

    // Light up both groups: the devices group's first control is
    // auto-activated; here we explicitly wake the settings group
    activateFocusGroup('device-cpu', 'devices');
    activateFocusGroup('settings-theme', 'settings');

    return () => { unUp(); unDown(); unTab(); unShiftTab(); unToggle(); };
  }, [boundKeyboard, focusNext, focusPrev, activateFocusGroup, kickFocusGroup, focusCurrent]);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Title bar */}
      <Box borderStyle="single" borderColor="cyan" paddingX={2}>
        <Text bold color="cyan">SYSTEM CONSOLE</Text>
        <Text dimColor>  ·  two focus groups active together</Text>
      </Box>

      {/* Two-column body */}
      <Box flexDirection="row" gap={1} marginTop={1}>
        {/* Left: devices (devices group) */}
        <Box width={26} borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1} paddingY={1}>
          <Text bold underline color="cyan">Devices · devices</Text>
          <Box flexDirection="column" marginTop={1} gap={1}>
            {DEVICES.map((d) => (
              <DeviceItem key={d.id} id={d.id} label={d.label} defaultOn={d.defaultOn} />
            ))}
          </Box>
          <Box marginTop={1}>
            <Text dimColor>↑↓ select · Enter toggle</Text>
          </Box>
        </Box>

        {/* Right: settings (settings group) */}
        <Box flexGrow={1} borderStyle="round" borderColor={settingsLit ? 'magenta' : 'gray'} flexDirection="column" paddingX={1} paddingY={1}>
          <Text bold underline color={settingsLit ? 'magenta' : undefined}>
            Settings · settings{settingsLit ? '' : ' (off)'}
          </Text>
          <Box flexDirection="column" marginTop={1} gap={1}>
            <SettingRow id="settings-theme" label="Theme" options={THEMES} />
            <SettingRow id="settings-volume" label="Volume" options={VOLUMES} />
            <SettingRow id="settings-lang" label="Language" options={LANGUAGES} />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>{settingsLit ? 'Tab switches field · ←→ adjusts value' : 'Press b to wake this panel'}</Text>
          </Box>
        </Box>
      </Box>

      {/* Bottom bar: live focus status + key hints */}
      <Box flexDirection="column" marginTop={1}>
        <GroupStatusBar />
        <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={2}>
          <Text dimColor>
            ↑↓ device · Enter toggle · ←→ adjust · Tab switch field · b toggle right · q quit
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

### Controls

When the program starts, you'll see a "dual-core" console: the left device list and the right settings panel are **both** active at once — that's the core capability of multi-focus groups.

| Key | Action | Group |
|------|------|--------|
| `↑` / `↓` | Move the selection in the left device list | named group `devices` |
| `Enter` | Toggle the currently selected device on / off | named group `devices` (only the selected item responds) |
| `Tab` / `Shift+Tab` | Switch fields in the right settings panel | named group `settings` |
| `←` / `→` | Adjust the value of the current field (cycles through options) | named group `settings` (only the active field responds) |
| `b` | Turn the right `settings` group on / off | — |
| `q` | Quit | — |

### What you should observe

1. **Two focus groups online at once**: after the program starts, the first device and the "Theme" field are highlighted simultaneously, and the bottom bar shows both `devices → device-cpu` and `settings → settings-theme` at the same time. Two named groups each hold a microphone and never steal focus from each other.

2. **Every control is an independent focus inside its group**: `Enter` only toggles the currently selected device — move the selection to `GPU` and press `Enter`, and it flips `GPU`, not `CPU`; `←` / `→` only adjust the current field's value. Every control has its own focus target, and only the active one responds to keys.

3. **Independent operations**: press `↑` / `↓` to move the device selection — the right settings panel doesn't move at all; press `←` / `→` to adjust a value — the left devices stay unchanged. Whatever key you press is answered by the group holding that microphone — you can operate the two regions interchangeably with no "mode switching".

4. **Turning an entire group off and on**: press `b` to turn off the `settings` group — the right panel dims, the field hint disappears, `←` / `→` and `Tab` all stop working, but the left `devices` group keeps working normally; press `b` again to light it back up and everything resumes.

## Next steps

- Learn ink-cartridge's shortcut action system and the three `boundKeyboard` overloads, which decouple callbacks from keys — [Shortcuts & Actions](/keyboard/shortcuts-actions)
