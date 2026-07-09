# @cartridge-engine/keyboard-engine

Framework-agnostic keyboard event engine for terminal UIs.

Powered by [ink-cartridge](https://github.com/BAIGAOa/ink-cartridge) — a React Ink component kit for building terminal UIs.

## Overview

`@cartridge-engine/keyboard-engine` is a framework-agnostic keyboard event engine designed for terminal user interfaces (TUIs). It provides complete keyboard binding, focus management, multi-key sequences, modal layers, global shortcuts, and an extensible pipeline processor architecture.

The engine has **zero framework dependencies** — just provide a `normalizeKeyNames` adapter and it works with any host framework (React, Vue, Svelte, raw Node.js, etc.).

## Installation

```bash
npm install @cartridge-engine/keyboard-engine
```

When used as a workspace dependency in the [ink-cartridge](https://github.com/BAIGAOa/ink-cartridge) monorepo:

```json
{
  "dependencies": {
    "@cartridge-engine/keyboard-engine": "*"
  }
}
```

## Core Concepts

- [KeyboardEngine](#keyboardengine)
- [7-Stage Pipeline](#7-stage-pipeline)
- [Layer System](#layer-system)
- [Focus Targets](#focus-targets)
- [Custom Processors](#custom-processors)

### KeyboardEngine

The engine centers on a single `KeyboardEngine` instance. It owns all mutable keyboard state — bindings, layers, focus targets, global keys, modes, conditions, and the processor pipeline — and interacts with the host framework through two key methods: `sync()` and `processKey()`.

```ts
import { KeyboardEngine } from '@cartridge-engine/keyboard-engine';

const engine = new KeyboardEngine({
  modes: ['normal', 'insert'],
  defaultMode: 'normal',
  normalizeKeyNames: (input, key) => {
    // Framework-specific key name normalization
  },
});

// Sync state on every render
engine.sync({ path, activeOverlayIds, displayedOverlays, activeModalId, displayedModals });

// Handle key events
useInput((input, key) => engine.processKey(input, key));
```

### 7-Stage Pipeline

Key events flow through each processor in priority order. The first processor that returns `true` (event consumed) stops the chain:

| Priority | Stage | Processor ID | Description |
|----------|-------|-------------|-------------|
| 0 (highest) | Modal intercept | `modal` | Active modal layer; blocks all lower events unless allowed |
| 1 | Global Sequence (overlay) | `global-sequence-overlay` | Global multi-key sequences with `affectOverlay: true` |
| 2 | Global Key (overlay) | `global-key-overlay` | Global single keys with `affectOverlay: true` |
| 3 | Overlay broadcast | `overlay` | All active overlays receive the event (non-blocking) |
| 4 | Global Sequence (screen) | `global-sequence-screen` | Global multi-key sequences with `affectOverlay: false` |
| 5 | Global Key (screen) | `global-key-screen` | Global single keys with `affectOverlay: false` |
| 6 (lowest) | Screen stack | `screen-stack` | Screen stack top-to-bottom; stops on first consumer |

### Layer System

Every screen component, overlay, and modal has its own keyboard layer (`ScreenKeyboardLayer`) containing:

- **bindings** — registered key bindings
- **penetrationKeys** — keys marked as transparent (pass through to lower layers)
- **stoppedKeys** — keys blocked from propagating downward
- **allowedKeys** — keys allowed through the modal barrier (modal layers only)
- **focusTargets** — named focus targets (independent binding namespaces)
- **sequences** — multi-key sequence bindings

### Focus Targets

Focus targets allow multiple controls on the same screen (inputs, lists, menus) to maintain independent key bindings. Navigate with Tab / Shift+Tab, or programmatically via `focusSet` / `focusNext` / `focusPrev`.

### Custom Processors

Insert custom processors into a specific engine instance's pipeline via `addProcessor`. Supports positioning by index, or before/after a named built-in processor.

## API Reference

### `new KeyboardEngine(props: EngineProps)`

Creates an engine instance.

```ts
interface EngineProps {
  modes?: string[];
  defaultMode?: string;
  processors?: KeyboardProcessorProps[];
  normalizeKeyNames: (input: string, key: unknown) => string[];
}
```

### `engine.sync(state)`

Pushes host-framework state into the engine. Call on every render.

```ts
engine.sync({
  path: TComponent[],
  activeOverlayIds: string[],
  displayedOverlays: EngineOverlayEntry[],
  activeModalId: string | null,
  displayedModals: EngineModalEntry[],
});
```

### `engine.processKey(input, key)`

Processes a single keyboard event through the pipeline. Returns `true` if consumed.

### Public Methods

| Method | Description |
|--------|-------------|
| `boundKeyboard(keys, handler, options?)` | Bind single or multiple keys |
| `boundSequence(keys, handler, options?)` | Bind a multi-key sequence |
| `penetration(keys, options?)` | Mark keys as transparent (pass-through) |
| `stop(keys, options?)` | Block keys from propagating downward |
| `allowModal(keys, options?)` | Allow keys through the modal barrier |
| `globalKeys(entries, options?)` | Register global key bindings |
| `globalSequence(entries, options?)` | Register global multi-key sequences |
| `focusSet(focusId)` | Activate a named focus target |
| `focusNext()` | Move focus to the next target |
| `focusPrev()` | Move focus to the previous target |
| `focusCurrent()` | Get the currently active focus target id |
| `focusUnregister(focusId)` | Remove a focus target |
| `subscribeFocus(listener)` | Subscribe to focus changes |
| `enableWildcardPriority()` | Enable wildcard `*` priority mode |
| `defineShortcutAction(entries)` | Register shortcut actions in bulk |
| `defineSequenceAction(entries)` | Register sequence actions in bulk |
| `addAction(entry)` | Register a single shortcut action |
| `addSequenceAction(entry)` | Register a single sequence action |
| `useModalMissListener(cb, options?)` | Subscribe to unhandled modal keystrokes |
| `readLayer(owner)` | Read-only layer lookup |
| `addMode(mode)` | Register a mode name |
| `setMode(mode)` | Switch to a specific mode |
| `nextMode()` | Cycle to the next mode |
| `prevMode()` | Cycle to the previous mode |
| `getCurrentMode()` | Get the active mode |
| `addCondition(id, defaultVal)` | Register a named condition |
| `setCondition(target, value)` | Update a condition value |
| `addProcessor(processor, options?)` | Insert a custom processor |
| `removeProcessor(processorId)` | Remove a processor |
| `getProcessors()` | Get the processor list |
| `resetProcessors()` | Reset to the default pipeline |
| `getGlobalPendingSequence()` | Get the full pending global sequence state, or null |
| `thereGlobalQueueWaiting(sync?)` | Check whether a global sequence is pending (boolean). Optional `sync` callback notifies the host framework to re-render after each key event. |
| `currentScreenHasSequenceWaiting(sync?)` | Check whether the current layer has a pending sequence (boolean). Optional `sync` callback notifies the host framework to re-render after each key event. |

### Sequence State Queries

While a multi-key sequence is in progress, the engine can report its pending state:

- **Global sequences** (registered via `globalSequence()`) use an engine-level pending state. The first matching key starts the pending state; subsequent keys complete or cancel it.
- **Local sequences** (registered via `boundSequence()`) use each layer's own pending state, scoped to that screen, overlay, or modal.

| Method | Scope | Returns |
|--------|-------|---------|
| `getGlobalPendingSequence()` | Engine | `GlobalPendingSequence \| null` — full state including remaining keys, timeout, and handler |
| `thereGlobalQueueWaiting(sync?)` | Engine | `boolean` — lightweight yes/no, equivalent to `getGlobalPendingSequence() !== null`. Optional `sync` callback triggers after each key event so the host framework can re-render. |
| `currentScreenHasSequenceWaiting(sync?)` | Current layer | `boolean` — `true` if the current owner's layer has a pending `boundSequence`. Throws if called outside a screen or overlay. Optional `sync` callback triggers after each key event so the host framework can re-render. |

#### Best Practice

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

## Framework Adapters

See the [docs/](./docs/) directory for detailed integration guides:

- [React / Ink (ink-cartridge)](./docs/react-ink.md)
- [Vue](./docs/vue.md)
- [Svelte](./docs/svelte.md)
- [Standalone (Node.js)](./docs/standalone.md)

### Quick Example: ink-cartridge (React)

```tsx
import { KeyboardProvider, useKeyboard } from 'ink-cartridge';

function App() {
  return (
    <KeyboardProvider modes={['normal', 'insert']}>
      <MyScreen />
    </KeyboardProvider>
  );
}

function MyScreen() {
  const { boundKeyboard } = useKeyboard();

  useEffect(() => {
    return boundKeyboard(['ctrl+s'], () => save());
  }, []);

  return <Text>Press Ctrl+S to save</Text>;
}
```

### Vue

Adapt the engine to Vue's composition API with a reactive wrapper.

```ts
// useKeyboardEngine.ts
import { ref, onMounted, onUnmounted } from 'vue';
import { KeyboardEngine } from '@cartridge-engine/keyboard-engine';

export function useKeyboardEngine(options: {
  modes?: string[];
  defaultMode?: string;
}) {
  const engine = new KeyboardEngine({
    modes: options.modes,
    defaultMode: options.defaultMode,
    normalizeKeyNames: (input, key) => {
      // Adapt Vue's KeyboardEvent to normalized key names
      const e = key as KeyboardEvent;
      const names: string[] = [];
      if (e.key) names.push(e.key.toLowerCase());
      if (e.ctrlKey && e.key) names.push(`ctrl+${e.key.toLowerCase()}`);
      if (e.metaKey && e.key) names.push(`meta+${e.key.toLowerCase()}`);
      return names;
    },
  });

  const currentMode = ref(engine.getCurrentMode());

  return {
    engine,
    currentMode,
    sync: (state: Parameters<typeof engine.sync>[0]) => engine.sync(state),
    processKey: (input: string, key: KeyboardEvent) => engine.processKey(input, key),
  };
}
```

```vue
<!-- MyComponent.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useKeyboardEngine } from './useKeyboardEngine';

const { engine, sync, processKey } = useKeyboardEngine({
  modes: ['normal', 'insert'],
});

sync({
  path: ['my-screen'],
  activeOverlayIds: [],
  displayedOverlays: [],
  activeModalId: null,
  displayedModals: [],
});

const onKeyDown = (e: KeyboardEvent) => processKey(e.key, e);

onMounted(() => window.addEventListener('keydown', onKeyDown));
onUnmounted(() => window.removeEventListener('keydown', onKeyDown));

const unbind = engine.boundKeyboard(['ctrl+s'], () => {
  console.log('Save triggered');
});
</script>
```

### Svelte

Wrap the engine in a Svelte store for reactive keyboard state.

```ts
// keyboardStore.ts
import { writable } from 'svelte/store';
import { KeyboardEngine } from '@cartridge-engine/keyboard-engine';

function createKeyboardEngine() {
  const engine = new KeyboardEngine({
    modes: ['normal', 'insert'],
    normalizeKeyNames: (input, key) => {
      const e = key as KeyboardEvent;
      const names: string[] = [];
      if (e.key) names.push(e.key.toLowerCase());
      if (e.ctrlKey && e.key) names.push(`ctrl+${e.key.toLowerCase()}`);
      if (e.metaKey && e.key) names.push(`meta+${e.key.toLowerCase()}`);
      return names;
    },
  });

  const mode = writable<string | null>(engine.getCurrentMode());

  engine.sync({
    path: ['app'],
    activeOverlayIds: [],
    displayedOverlays: [],
    activeModalId: null,
    displayedModals: [],
  });

  return { engine, mode };
}

export const keyboard = createKeyboardEngine();
```

```svelte
<!-- App.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { keyboard } from './keyboardStore';

  function handleKeydown(e: KeyboardEvent) {
    keyboard.engine.processKey(e.key, e);
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });

  $: currentMode = $keyboard.mode;
</script>

<div>Current mode: {currentMode}</div>
```

### Standalone (no framework)

Use the engine directly with raw Node.js `readline` or TTY streams.

```ts
import { KeyboardEngine } from '@cartridge-engine/keyboard-engine';
import * as readline from 'node:readline';

const engine = new KeyboardEngine({
  normalizeKeyNames: (input, key) => {
    if (key.name === 'return') return ['return'];
    if (key.name === 'escape') return ['escape'];
    if (key.name === 'tab') return ['tab'];
    if (key.ctrl && key.name) return [`ctrl+${key.name}`];
    return [key.name ?? input];
  },
});

engine.sync({
  path: ['app'],
  activeOverlayIds: [],
  displayedOverlays: [],
  activeModalId: null,
  displayedModals: [],
});

engine.boundKeyboard(['ctrl+c'], () => {
  console.log('Goodbye!');
  process.exit(0);
});

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.on('keypress', (_input, key) => {
  engine.processKey(_input ?? '', key);
});
```

## Architecture Diagram

```
┌────────────────────────────────────────────┐
│                KeyboardEvent                │
└──────────────────┬─────────────────────────┘
                   ▼
          ┌──────────────┐
          │ ① Modal       │ ← Active modal
          └──────┬────────┘    allowModal() can release keys
                 ▼
          ┌──────────────┐
          │ ② GlobalSeq   │ ← affectOverlay: true
          └──────┬────────┘
                 ▼
          ┌──────────────┐
          │ ③ GlobalKey   │ ← affectOverlay: true
          └──────┬────────┘
                 ▼
          ┌──────────────┐
          │ ④ Overlay     │ ← Broadcast to all active overlays
          └──────┬────────┘
                 ▼
          ┌──────────────┐
          │ ⑤ GlobalSeq   │ ← affectOverlay: false
          └──────┬────────┘
                 ▼
          ┌──────────────┐
          │ ⑥ GlobalKey   │ ← affectOverlay: false
          └──────┬────────┘
                 ▼
          ┌──────────────┐
          │ ⑦ ScreenStack │ ← Top → bottom, stops on consume
          └──────────────┘
```

## See Also

- [ink-cartridge](https://github.com/BAIGAOa/ink-cartridge) — React Ink component kit for building terminal UIs, built on this engine.

## License

MIT

## Author

BAIGAO
