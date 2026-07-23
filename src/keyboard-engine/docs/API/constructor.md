# constructor

Create a new `KeyboardEngine` instance — the framework-agnostic keyboard state machine.

The engine owns all mutable keyboard state (bindings, layers, focus targets, global keys, modes, conditions, and the processor pipeline) without depending on any specific UI framework. Each host framework creates its own instance, feeds it screen-path state via [`sync`](./sync.md), and forwards keyboard events via [`processKey`](./processKey.md).

## Signature

```ts
import { KeyboardEngine } from '@cartridge-engine/keyboard-engine';

new KeyboardEngine(props: EngineProps): KeyboardEngine
```

## Configuration

```ts
interface EngineProps {
  normalizeKeyNames: (input: string, key: unknown) => string[];
  isNormalChar: (key: unknown) => boolean;
  modes?: string[];
  defaultMode?: string | null;
  processors?: KeyboardProcessorProps[];
  defaultTimeout?: number;
  valueSchema?: ValueSchema;
  autoTab?: boolean;
}
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `normalizeKeyNames` | `(input, key) => string[]` | yes | Converts framework-specific key events into normalized key-name strings. Each host framework provides its own adapter. |
| `isNormalChar` | `(key: unknown) => boolean` | yes | Determines whether a key is a special key (arrow, navigation, modifier, or release). Returns `true` when the key is NOT a normal character. Each host framework provides its own adapter that inspects its native Key shape. |
| `modes` | `string[]` | no | Registered mode names (e.g. `["normal", "insert"]`). |
| `defaultMode` | `string \| null` | no | Active mode on construction. Must be `null` or a member of `modes`. |
| `processors` | `KeyboardProcessorProps[]` | no | Custom processors injected into the pipeline at construction time. |
| `defaultTimeout` | `number` | no | Default composition chain timeout in ms. Defaults to 400. |
| `valueSchema` | `ValueSchema` | no | Initial runtime type guards for composition chain values. See [`setValueSchema`](./composition/setValueSchema.md). |
| `autoTab` | `boolean` | no | When `true`, the engine automatically intercepts Tab / Shift+Tab to cycle focus targets. Defaults to `false` — developers must call `focusNext()` / `focusPrev()` manually. |

## Returns

A `KeyboardEngine` instance. The instance is designed to be stored in a stable reference (e.g. `useRef` in React, a class field in Vue/Svelte) — it persists for the lifetime of the host component.

## Effect

Creates the internal state tree:

- **EngineState** — path, overlay/modal IDs, modes, conditions, global keys, global sequences, shortcut/sequence operation registries, owner stack
- **LayerManager** — keyboard layer creation and cleanup
- **PipelineManager** — the 9-stage processor chain (constructed from built-in processors + any custom `processors`)
- **BindingService** — bound keyboard, bound sequence, penetration, stop, allow modal registration
- **OperationRegistry** — shortcut/sequence actions, modes, conditions, wildcard priority
- **CompositionEngine** — multi-key composition chains (initialized with `defaultTimeout` and `valueSchema`)

## Usage

```ts
import { KeyboardEngine } from '@cartridge-engine/keyboard-engine';

function normalizeKeyNames(input: string, key: unknown): string[] {
  // Adapter: convert host framework key shape to normalized names
  return [input.toLowerCase()];
}

function isSpecialKey(key: unknown): boolean {
  const k = key as Record<string, unknown>;
  return k.ctrl || k.meta || k.return || k.escape || k.tab
    || k.upArrow || k.downArrow || k.leftArrow || k.rightArrow
    || k.backspace || k.delete || k.pageDown || k.pageUp
    || k.home || k.end || k.eventType === 'release';
}

const engine = new KeyboardEngine({
  normalizeKeyNames,
  isNormalChar: isSpecialKey,
  modes: ['normal', 'insert'],
  defaultMode: 'normal',
  defaultTimeout: 400,
});
```

With value schema:

```ts
const engine = new KeyboardEngine({
  normalizeKeyNames,
  isNormalChar: isSpecialKey,
  valueSchema: {
    times: (v): v is number => typeof v === 'number',
    action: (v): v is number => typeof v === 'number',
  },
});
```

## API interactions

- **[`sync`](./sync.md)** — call on every render before processing events, pushes current screen/overlay state into the engine
- **[`processKey`](./processKey.md)** — call for every keyboard event, runs it through the pipeline
- **[`addProcessor`](./addProcessor.md)** / **[`removeProcessor`](./removeProcessor.md)** — dynamically modify the pipeline after construction
- **[`setValueSchema`](./composition/setValueSchema.md)** — set or replace value schema at runtime (alternative to the constructor option)
- **[`addMode`](./mode-system.md)** — register additional modes after construction
