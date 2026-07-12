# Mode System

Named modes that segment key bindings into separate contexts — like Vim's normal/insert/visual modes.

Bindings tagged with `mode: "insert"` only fire when the engine is in insert mode. Bindings tagged with `mode: "normal"` only fire in normal mode. Bindings without a `mode` option fire in all modes (including no-mode).

## API surface

```ts
addMode(mode: string): boolean
removeMode(mode: string): boolean
setMode(mode: string | null): boolean
nextMode(): void
prevMode(): void
getCurrentMode(): string | null
```

## Method details

### addMode

Register a new mode name. Modes must be registered before they can be set or referenced by bindings.

Returns `true` if added, `false` if already registered.

```ts
engine.addMode('insert');
```

### removeMode

Unregister a mode. Returns `true` if it existed and was removed. If the removed mode is currently active, the engine does **not** auto-switch — call `setMode(null)` to exit.

```ts
engine.removeMode('visual');
```

### setMode

Switch to a specific mode. Pass `null` to exit all modes (no-mode state). Returns `true` on success, `false` if the mode is not registered.

```ts
engine.setMode('insert');  // enter insert mode
engine.setMode(null);      // exit to no-mode
```

### nextMode / prevMode

Cycle to the next/previous mode in registration order. Wrap around at the ends. In no-mode state, `nextMode` enters the first registered mode.

```ts
engine.nextMode();  // normal → insert → visual → normal → ...
engine.prevMode();  // visual → insert → normal → visual → ...
```

### getCurrentMode

Return the active mode name, or `null` in no-mode state.

## Effect

The active mode is stored in `currentModeRef` and written into every `PipelineContext` as `currentMode`. Each processor that evaluates bindings (screen stack, global keys, global sequences, composition) checks `entry.mode` against `ctx.currentMode` and skips entries whose mode doesn't match.

## Usage

```ts
// Setup
engine.addMode('normal');
engine.addMode('insert');
engine.setMode('normal');

// Bindings gated by mode
engine.boundKeyboard('i', enterInsertMode, { mode: 'normal' });
engine.boundKeyboard('escape', exitInsertMode, { mode: 'insert' });
engine.globalKeys([{ key: 'ctrl+q', operate: quit, mode: 'normal' }]);

// Reactive mode indicator
function getModeIndicator(): string {
  const mode = engine.getCurrentMode();
  return mode ? `-- ${mode.toUpperCase()} --` : '';
}
```

## API interactions

- **[`constructor`](./constructor.md)** — modes can be pre-registered via `EngineProps.modes` and `EngineProps.defaultMode`
- **[`boundKeyboard`](./boundKeyboard.md)** — bindings with `mode` option are skipped when the active mode doesn't match
- **[`boundSequence`](./boundSequence.md)** — sequences support mode tagging
- **[`globalKeys`](./globalKeys.md)** / **[`globalSequence`](./globalSequence.md)** — global entries support `mode` field
- **[`CompositionEngine`](./composition/)** — `CompositioKey` entries support `mode` tagging
- **[`Condition System`](./condition-system.md)** — conditions provide finer-grained, runtime-dynamic gating; modes are for discrete, named states
