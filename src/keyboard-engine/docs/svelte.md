# Svelte

Wrap `@cartridge/keyboard-engine` in a Svelte store for reactive keyboard state.

## Setup

```bash
npm install @cartridge/keyboard-engine
```

## Store Implementation

```ts
// lib/keyboardStore.ts
import { writable } from 'svelte/store';
import { KeyboardEngine } from '@cartridge/keyboard-engine';
import type { EngineOverlayEntry, EngineModalEntry } from '@cartridge/keyboard-engine';

function createKeyboardEngine() {
  const engine = new KeyboardEngine({
    modes: ['normal', 'insert'],
    normalizeKeyNames: (input, key) => {
      const e = key as KeyboardEvent;
      const names: string[] = [];
      if (e.key) names.push(e.key.toLowerCase());
      if (e.ctrlKey && e.key) names.push(`ctrl+${e.key.toLowerCase()}`);
      if (e.metaKey && e.key) names.push(`meta+${e.key.toLowerCase()}`);
      if (e.shiftKey && e.key) names.push(`shift+${e.key.toLowerCase()}`);
      return names;
    },
  });

  const mode = writable<string | null>(engine.getCurrentMode());
  const focusId = writable<string | null>(engine.focusCurrent());

  engine.subscribeFocus(() => {
    focusId.set(engine.focusCurrent());
  });

  function sync(state: {
    path: string[];
    activeOverlayIds: string[];
    displayedOverlays: EngineOverlayEntry[];
    activeModalId: string | null;
    displayedModals: EngineModalEntry[];
  }) {
    engine.sync(state);
  }

  return { engine, mode, focusId, sync };
}

export const keyboard = createKeyboardEngine();
```

## Component Usage

```svelte
<!-- App.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { keyboard } from '../lib/keyboardStore';

  function handleKeydown(e: KeyboardEvent) {
    keyboard.engine.processKey(e.key || '', e);
  }

  onMount(() => {
    keyboard.sync({
      path: ['app'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });

    // Bind keyboard shortcuts
    keyboard.engine.boundKeyboard(['ctrl+s'], () => {
      console.log('Save triggered');
    });

    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });

  $: currentMode = $keyboard.mode;
</script>

<main>
  <p>Current mode: {currentMode}</p>
  <p>Press Ctrl+S to save</p>
</main>
```

## Focus Tracking

```svelte
<!-- FocusIndicator.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { keyboard } from '../lib/keyboardStore';

  $: activeFocus = $keyboard.focusId;
</script>

<div class:active={activeFocus === 'search'}>
  Search input is {activeFocus === 'search' ? 'focused' : 'blurred'}
</div>
```

## Mode Switching

```svelte
<script lang="ts">
  import { keyboard } from '../lib/keyboardStore';

  function enterInsertMode() {
    keyboard.engine.setMode('insert');
    $keyboard.mode = keyboard.engine.getCurrentMode();
  }

  function enterNormalMode() {
    keyboard.engine.setMode('normal');
    $keyboard.mode = keyboard.engine.getCurrentMode();
  }
</script>

<button on:click={enterInsertMode}>Insert Mode</button>
<button on:click={enterNormalMode}>Normal Mode</button>
```

## See Also

- [@cartridge/keyboard-engine on npm](https://www.npmjs.com/package/@cartridge/keyboard-engine)
- [ink-cartridge](https://github.com/BAIGAOa/ink-cartridge) — React / Ink integration reference
