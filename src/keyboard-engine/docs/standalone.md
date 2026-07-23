# Standalone (Node.js)

Use `@cartridge-engine/keyboard-engine` directly with raw Node.js `readline` or TTY streams — no UI framework required.

## Setup

```bash
npm install @cartridge-engine/keyboard-engine
```

## Basic TTY Keyboard Handler

```ts
import { KeyboardEngine } from '@cartridge-engine/keyboard-engine';
import * as readline from 'node:readline';

function isSpecialKey(key: unknown): boolean {
  const k = key as Record<string, unknown>;
  if (k.ctrl || k.meta || k.shift) return true;
  return (k.name === 'return' || k.name === 'escape' || k.name === 'tab'
    || k.name === 'backspace' || k.name === 'delete'
    || k.name === 'up' || k.name === 'down' || k.name === 'left' || k.name === 'right'
    || k.name === 'pageup' || k.name === 'pagedown' || k.name === 'home' || k.name === 'end');
}

const engine = new KeyboardEngine({
  isNormalChar: isSpecialKey,
  normalizeKeyNames: (input, key) => {
    if (key.name === 'return') return ['return'];
    if (key.name === 'escape') return ['escape'];
    if (key.name === 'tab') return ['tab'];
    if (key.name === 'backspace') return ['backspace'];
    if (key.name === 'up') return ['up'];
    if (key.name === 'down') return ['down'];
    if (key.ctrl && key.name) return [`ctrl+${key.name}`];
    if (key.shift && key.name) return [`shift+${key.name.toLowerCase()}`];
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
  console.log('\nGoodbye!');
  process.exit(0);
});

engine.boundKeyboard(['up'], () => {
  console.log('Arrow up pressed');
});

// Capture all normal character input
engine.boundKeyboard(['*'], (input) => {
  console.log(`Typed: ${input}`);
});

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

process.stdin.on('keypress', (_input, key) => {
  engine.processKey(_input ?? '', key);
});

console.log('Terminal keyboard engine ready. Press Ctrl+C to exit.');
```

## Mode-Based Editor (vim-like)

```ts
import { KeyboardEngine } from '@cartridge-engine/keyboard-engine';
import * as readline from 'node:readline';

const engine = new KeyboardEngine({
  modes: ['normal', 'insert'],
  defaultMode: 'normal',
  isNormalChar: isSpecialKey,
  normalizeKeyNames: (input, key) => {
    if (key.name === 'return') return ['return'];
    if (key.name === 'escape') return ['escape'];
    if (key.ctrl && key.name) return [`ctrl+${key.name}`];
    // ... other special keys
    return [key.name ?? input];
  },
});

engine.sync({
  path: ['editor'],
  activeOverlayIds: [],
  displayedOverlays: [],
  activeModalId: null,
  displayedModals: [],
});

// Normal mode bindings
engine.boundKeyboard(['i'], () => engine.setMode('insert'), { mode: 'normal' });
engine.boundKeyboard(['h'], () => console.log('Move left'), { mode: 'normal' });
engine.boundKeyboard(['j'], () => console.log('Move down'), { mode: 'normal' });
engine.boundKeyboard(['k'], () => console.log('Move up'), { mode: 'normal' });
engine.boundKeyboard(['l'], () => console.log('Move right'), { mode: 'normal' });

// Insert mode bindings
engine.boundKeyboard(['*'], (input) => {
  process.stdout.write(input);
}, { mode: 'insert' });

// Global bindings (all modes)
engine.boundKeyboard(['escape'], () => engine.setMode('normal'));
engine.boundKeyboard(['ctrl+q'], () => process.exit(0));

console.log(`Mode: ${engine.getCurrentMode()}`);

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

process.stdin.on('keypress', (_input, key) => {
  engine.processKey(_input ?? '', key);
});
```

## Custom Processor

```ts
import { KeyboardEngine } from '@cartridge-engine/keyboard-engine';

const engine = new KeyboardEngine({
  isNormalChar: isSpecialKey,
  normalizeKeyNames: (input, key) => {
    if (key.name) return [key.name];
    return [input];
  },
});

// Insert a logging processor between the modal and global-sequence stages
engine.addProcessor(
  {
    id: 'key-logger',
    process: (ctx) => {
      console.log(`[key-logger] keys=${ctx.eventNames} mode=${ctx.currentMode}`);
      return false; // Never consume — always pass through
    },
  },
  { after: 'modal' },
);

console.log(engine.getProcessors().map(p => p.id));
// ['modal', 'key-logger', 'composition-overlay', 'global-sequence-overlay', ...]
```

## Composition Engine

The composition engine enables building compound key actions using flag/needs chains.

```ts
// Register composition keys on the engine
engine.registryCompositionKey({
  key: '3',
  flags: [],
  alternativeFlag: 'times',
  needs: [],
  execute: (ctx) => ({ value: 3, lastFlag: 'times', steps: [...ctx.steps, '3'] }),
});

engine.registryCompositionKey({
  key: 'w',
  flags: [],
  alternativeFlag: 'action',
  needs: ['times'],
  optional: true,
  execute: (ctx) => {
    const times = (ctx.value as number) ?? 1;
    console.log(`Performing action ${times} times`);
    return { value: times, lastFlag: 'action', steps: [...ctx.steps, 'w'] };
  },
});

// Press 3 then w → performs action 3 times
// Press w alone → performs action 1 time (optional head key)

// Query pending state
if (engine.hasPendingComposition()) {
  console.log('Composition chain:', engine.getCompositionContext().steps);
  engine.abortComposition(); // cancel if needed
}
```

### Dependent Flags (chooseFlag)

A key can declare multiple potential flags via the `flags` table. The engine picks
the right one based on the preceding key's `lastFlag`:

```ts
engine.registryCompositionKey({
  key: 'w',
  flags: [
    { need: 'times', become: 'scalar' },
    { need: 'word',  become: 'delete' },
  ],
  alternativeFlag: 'action',
  needs: ['times', 'word'],
  optional: true,
  execute: (ctx) => ({
    value: ctx.value,
    lastFlag: null,  // null → engine picks from flags table
    steps: [...ctx.steps, 'w'],
  }),
});
```

When `execute` returns `lastFlag: null`, the engine auto-propagates:
- **Head key** → uses `alternativeFlag`
- **Chain key** → runs `chooseFlag`, matching `need` → `become`; no match → falls back to `alternativeFlag`

All composition methods are available directly on the engine instance:
`registryCompositionKey`, `removeCompositionKey`, `clearAllCompositionKeys`,
`hasPendingComposition`, `getCompositionContext`, `abortComposition`,
`updateCompositionKey`, `undoComposition`, `bufferedCompositionCount`,
`clearCompositionBuffers`, `setValueSchema`, `subscribeComposition`,
`getLastCompositionEvent`.

### Undo

After a composition chain completes (timeout fires), the engine buffers its history.
Call `undoComposition()` to reverse the last completed sequence by running each key's
`undoAction` in reverse order:

```ts
engine.registryCompositionKey({
  key: '3',
  flags: [],
  alternativeFlag: 'times',
  needs: [],
  execute: (ctx) => ({ value: 3, lastFlag: 'times', steps: [...ctx.steps, '3'] }),
  undoAction: (ctx) => ({ value: undefined, lastFlag: null, steps: [] }),
});

// ... chain completes ...

const ctx = engine.undoComposition();   // undo most recent sequence
engine.undoComposition(2);              // undo last 2 sequences
engine.undoComposition(3, { byKey: true });  // undo last 3 keys
engine.undoComposition(4, { isolated: true, byKey: true });  // undo 4 keys, per-sequence ctx
```

### Composition Events (Pub/Sub)

Subscribe to state changes to trigger UI re-renders or logging:

```ts
const unsub = engine.subscribeComposition(() => {
  const e = engine.getLastCompositionEvent();
  if (!e) return;
  console.log(`[composition] ${e.type}`, e);
});

// Later: unsub();
```

Event types: `started`, `continued`, `completed`, `aborted`, `broken`, `consumed`, `undone`, `cleared`.

### Runtime Validation

Pass a `ValueSchema` to validate `execute` and `undo` values at runtime:

```ts
engine.setValueSchema({
  times: (v): v is number => typeof v === 'number',
  action: (v): v is number => typeof v === 'number',
});
```

## See Also

- [@cartridge-engine/keyboard-engine on npm](https://www.npmjs.com/package/@cartridge-engine/keyboard-engine)
- [ink-cartridge](https://github.com/BAIGAOa/ink-cartridge) — React / Ink integration for terminal UIs
