# Standalone (Node.js)

Use `@cartridge/keyboard-engine` directly with raw Node.js `readline` or TTY streams — no UI framework required.

## Setup

```bash
npm install @cartridge/keyboard-engine
```

## Basic TTY Keyboard Handler

```ts
import { KeyboardEngine } from '@cartridge/keyboard-engine';
import * as readline from 'node:readline';

const engine = new KeyboardEngine({
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
import { KeyboardEngine } from '@cartridge/keyboard-engine';
import * as readline from 'node:readline';

const engine = new KeyboardEngine({
  modes: ['normal', 'insert'],
  defaultMode: 'normal',
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
import { KeyboardEngine } from '@cartridge/keyboard-engine';

const engine = new KeyboardEngine({
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
// ['modal', 'key-logger', 'global-sequence-overlay', ...]
```

## See Also

- [@cartridge/keyboard-engine on npm](https://www.npmjs.com/package/@cartridge/keyboard-engine)
- [ink-cartridge](https://github.com/BAIGAOa/ink-cartridge) — React / Ink integration for terminal UIs
