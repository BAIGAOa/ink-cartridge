# Mode System

A lightweight modal-editing layer inspired by Vim. Declare named modes (e.g. `"normal"`, `"insert"`), tag key bindings with a mode, and switch between modes at runtime. Bindings that don't match the active mode are silently skipped.

## Why

Within a single screen layer, different interaction states need different key maps. A `TextInput` in insert mode should capture every keystroke; in normal mode the same keys should navigate. Mode makes this declarative — annotate the binding once, switch with a single call.

## Setup

```tsx
<KeyboardProvider modes={["normal", "insert"]} defaultMode="normal">
  <App />
</KeyboardProvider>
```

Or register dynamically:

```tsx
const { addMode } = useKeyboard();
useEffect(() => { addMode("visual"); }, []);
```

---

## API

### getCurrentMode

Returns the active mode without triggering a re-render (reads from a ref). Safe to call inside keyboard handlers.

```ts
function getCurrentMode(): string | null
```

### addMode

Register a new mode. Idempotent — duplicate names are silently ignored.

```ts
function addMode(mode: string): boolean
```

**Returns** `true` if added, `false` if already registered.

### removeMode

Unregister a mode. Does NOT clear the active mode if it was the removed one — exit first with `setMode(null)`.

```ts
function removeMode(mode: string): boolean
```

**Returns** `true` if the mode existed and was removed.

### setMode

Switch to a specific mode. Pass `null` to exit all modes (no-mode state). The target mode must be registered — otherwise the call is rejected.

```ts
function setMode(mode: string | null): boolean
```

**Returns** `true` if the switch succeeded, `false` if the mode is not registered.

Mode changes take effect synchronously for the next key event. They do NOT trigger a React re-render — modes are stored in a ref for zero-overhead access in the hot keyboard path.

### nextMode

Cycle to the next registered mode (in registration order). Wraps around. No-op when no modes are registered.

```ts
function nextMode(): void
```

### prevMode

Cycle to the previous registered mode. Wraps around. No-op when no modes are registered.

```ts
function prevMode(): void
```

---

## Binding `mode` option

Every key-binding entry accepts `{ mode }`:

| API | Option location |
|-----|----------------|
| `boundKeyboard` | `BoundKeyboardOptions.mode` |
| `boundSequence` | `SequenceOptions.mode` (inherits from `BoundKeyboardOptions`) |
| `globalKeys` | `GlobalKeyEntry.mode` |
| `globalSequence` | `GlobalSequenceEntry.mode` |

Within each matching stage, `mode` is checked **before** `when`. The full evaluation order is:

```
mode → onlyThis → focusId → when → keyMatch
```

---

## Full example

```tsx
function Editor() {
  const { boundKeyboard, setMode, nextMode, globalKeys } = useKeyboard();

  // Normal-mode bindings — only active when mode === "normal"
  useEffect(() => boundKeyboard("h", moveLeft,     { mode: "normal" }), []);
  useEffect(() => boundKeyboard("j", moveDown,     { mode: "normal" }), []);
  useEffect(() => boundKeyboard("k", moveUp,       { mode: "normal" }), []);
  useEffect(() => boundKeyboard("l", moveRight,    { mode: "normal" }), []);
  useEffect(() => boundKeyboard("i", () => setMode("insert"), { mode: "normal" }), []);

  // Insert-mode bindings — only active when mode === "insert"
  useEffect(() => boundKeyboard("*", handleInput,  { mode: "insert" }), []);
  useEffect(() => boundKeyboard("escape", nextMode, { mode: "insert" }), []);

  // Global: ctrl+q quits regardless of mode (no mode tag)
  useEffect(() => globalKeys([{ key: "ctrl+q", operate: quit }]), []);

  return <Text>...</Text>;
}
```

## Best Practice

- **Register modes upfront** via the `modes` prop. Use `addMode`/`removeMode` only for dynamic mode sets.
- **Read mode in render** via a component-local `useState` synced on mode change — `getCurrentMode()` is for handler callbacks, not render logic.
- **Always provide an escape hatch** — bind `escape` to `nextMode` or `setMode("normal")` so users can always return to a known state.
