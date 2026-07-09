# KeyboardEngine

Framework-agnostic keyboard state machine. Owns all keyboard state — bindings, layers, focus targets, global keys, modes, conditions, and the processor pipeline — without depending on any specific UI framework.

A host framework creates an instance, calls `sync()` on each render to push screen state, and calls `processKey()` for every keyboard event.

## Signature

```ts
class KeyboardEngine<TComponent = unknown> {
  constructor(props: EngineProps)
}
```

### EngineProps

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `normalizeKeyNames` | `(input: string, key: unknown) => string[]` | yes | Converts framework key events to normalized key-name strings |
| `modes` | `string[]` | no | Initial mode names |
| `defaultMode` | `string \| null` | no | Active mode on init |
| `processors` | `KeyboardProcessorProps[]` | no | Per-instance custom processors |

## Core Loop

Every framework integration follows the same pattern:

```ts
const engine = new KeyboardEngine({ normalizeKeyNames })

// 1. Push screen state on every render
engine.sync({ path, activeOverlayIds, displayedOverlays, activeModalId, displayedModals })

// 2. Clean up removed layers after render
engine.cleanLayers()
engine.cleanOverlayLayers()
engine.cleanModalLayers()

// 3. Process keyboard events
engine.processKey(input, key) // → boolean (consumed?)
```

## Framework Examples

### Blessed

```ts
import { KeyboardEngine } from 'ink-cartridge'
import blessed from 'blessed'

function normalizeBlessedKey(input: string, key: unknown): string[] {
  const ch = key as string
  const names: string[] = [ch]
  if (ch === '\r') return ['return']
  if (ch === '\x1b') return ['escape']
  if (ch === '\t') return ['tab']
  if (ch === '\x7f') return ['backspace']
  return [ch]
}

const engine = new KeyboardEngine({
  normalizeKeyNames: normalizeBlessedKey,
})

const screen = blessed.screen({ smartCSR: true })
screen.key(['q', 'C-c'], () => process.exit(0))

screen.on('keypress', (ch, key) => {
  // Blessed delivers full keyspec as second argument
  const consumed = engine.processKey(ch, key.full ?? ch)
  if (consumed) return

  // Fall through to framework-level handling
  screen.render()
})

// Bind keyboard actions at screen level
function renderMainMenu() {
  engine.sync({
    path: ['MainMenu' as any],
    activeOverlayIds: [],
    displayedOverlays: [],
    activeModalId: null,
    displayedModals: [],
  })

  const unbindNav = engine.boundKeyboard('j', () => moveDown())
  const unbindEnter = engine.boundKeyboard('return', () => select())

  return () => { unbindNav(); unbindEnter() }
}
```

### Vue

```ts
import { KeyboardEngine } from 'ink-cartridge'
import { ref, onMounted, onUnmounted, watchEffect } from 'vue'

function normalizeVueKey(input: string, key: unknown): string[] {
  const e = key as KeyboardEvent
  const names: string[] = [e.key.toLowerCase()]
  if (e.ctrlKey) names.push('ctrl')
  if (e.shiftKey) names.push('shift')
  return names
}

const engine = new KeyboardEngine({
  modes: ['normal', 'insert'],
  defaultMode: 'normal',
  normalizeKeyNames: normalizeVueKey,
})

const currentScreen = ref('menu')

// Sync on every render
watchEffect(() => {
  engine.sync({
    path: [currentScreen.value as any],
    activeOverlayIds: [],
    displayedOverlays: [],
    activeModalId: null,
    displayedModals: [],
  })
})

// Wire keyboard events
function onKeyDown(e: KeyboardEvent) {
  const consumed = engine.processKey(e.key, e)
  if (consumed) e.preventDefault()
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
```

### Raylib (C/Go/WASM-based TUIs)

```ts
import { KeyboardEngine } from 'ink-cartridge'

function normalizeRaylibKey(input: string, key: unknown): string[] {
  const code = key as number
  const map: Record<number, string> = {
    256: 'escape', 257: 'return', 258: 'tab',
    259: 'backspace', 263: 'tab',
    264: 'down', 265: 'up', 262: 'right', 263: 'left',
  }
  const name = map[code] ?? String.fromCharCode(code).toLowerCase()
  return [name]
}

const engine = new KeyboardEngine({
  normalizeKeyNames: normalizeRaylibKey,
})

// In your game loop:
function update(screenPath: string[]) {
  engine.sync({
    path: screenPath as any,
    activeOverlayIds: [],
    displayedOverlays: [],
    activeModalId: null,
    displayedModals: [],
  })

  const keyCode = getKeyPressed() // your game's input polling
  if (keyCode !== 0) {
    engine.processKey('', keyCode)
  }

  engine.cleanLayers()
}
```

### Ink (React)

The built-in `KeyboardProvider` already wraps the engine for Ink:

```tsx
import { KeyboardProvider } from 'ink-cartridge'

<KeyboardProvider modes={['normal', 'insert']} defaultMode="normal">
  <CurrentScreen />
</KeyboardProvider>
```

Under the hood:

```ts
import { KeyboardEngine } from 'ink-cartridge'
import { normalizeKeyNames } from 'ink-cartridge/keyNormalizer'
import { useInput } from 'ink'

const engine = new KeyboardEngine({
  modes: ['normal', 'insert'],
  defaultMode: 'normal',
  normalizeKeyNames, // built-in Ink adapter
})

// In component body:
engine.sync({ path, activeOverlayIds, displayedOverlays, activeModalId, displayedModals })
useInput((input, key) => engine.processKey(input, key))
```

## Lifecycle Methods

| Method | When to call |
|--------|-------------|
| `sync(state)` | Every render, before key events |
| `cleanLayers()` | Post-render, when screen path changes |
| `cleanOverlayLayers()` | Post-render, when overlays change |
| `cleanModalLayers()` | Post-render, when modals change |

## Sequence State Queries

While a multi-key sequence is in progress, the engine can report its pending state:

- **Global sequences** (registered via `globalSequence()`) use an engine-level pending state. The first matching key starts the pending state; subsequent keys complete or cancel it.
- **Local sequences** (registered via `boundSequence()`) use each layer's own pending state, scoped to that screen, overlay, or modal.

| Method | Scope | Returns |
|--------|-------|---------|
| `getGlobalPendingSequence()` | Engine | `GlobalPendingSequence \| null` — full state including remaining keys, timeout, and handler |
| `thereGlobalQueueWaiting(sync?)` | Engine | `boolean` — lightweight yes/no, equivalent to `getGlobalPendingSequence() !== null`. Optional `sync` callback triggers after each key event so the host framework can re-render. |
| `currentScreenHasSequenceWaiting(sync?)` | Current layer | `boolean` — `true` if the current owner's layer has a pending `boundSequence`. Throws if called outside a screen or overlay. Optional `sync` callback triggers after each key event so the host framework can re-render. |

### Best Practice

```ts
// Guard navigation while a local sequence is in progress
if (engine.currentScreenHasSequenceWaiting()) {
  return; // let the sequence complete first
}

// Defer work while a global sequence is pending
if (engine.thereGlobalQueueWaiting()) {
  return;
}

// Inspect the pending global sequence for debug/tooltip purposes
const pending = engine.getGlobalPendingSequence();
if (pending) {
  console.log(`Waiting for key ${pending.nextIndex + 1}/${pending.sequences.length}`);
}
```

## Instance vs Global Processors

The engine supports processor injection at the instance level:

| Level | Method | Scope |
|-------|--------|-------|
| Instance | Constructor `processors` prop or `engine.addProcessor()` | This engine only |

Prefer instance-level — it avoids cross-app contamination.

## See Also

- [KeyboardProvider](./KeyboardProvider-API.md) — React/Ink adapter
- [addProcessor](./addProcessor-API.md) — Per-instance processor injection
- [boundKeyboard](./boundKeyboard-API.md) — Key binding API
- [boundSequence](./boundSequence-API.md) — Local multi-key sequences
- [globalSequence](./globalSequence-API.md) — Global multi-key sequences
- [Mode System](./mode-system-API.md) — Modal modes
