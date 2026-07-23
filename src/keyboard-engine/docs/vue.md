# Vue

Adapt `@cartridge-engine/keyboard-engine` to Vue's composition API with a reactive wrapper.

## Setup

```bash
npm install @cartridge-engine/keyboard-engine
```

## Adapter Implementation

```ts
// composables/useKeyboardEngine.ts
import { ref, onMounted, onUnmounted } from 'vue';
import { KeyboardEngine } from '@cartridge-engine/keyboard-engine';
import type { EngineProps } from '@cartridge-engine/keyboard-engine';

export function useKeyboardEngine(options?: {
  modes?: string[];
  defaultMode?: string | null;
}) {
  function isSpecialKey(key: unknown): boolean {
    const k = key as KeyboardEvent;
    return k.key === 'ArrowUp' || k.key === 'ArrowDown' || k.key === 'ArrowLeft'
      || k.key === 'ArrowRight' || k.key === 'Enter' || k.key === 'Escape'
      || k.key === 'Tab' || k.key === 'Backspace' || k.key === 'Delete'
      || k.key === 'PageUp' || k.key === 'PageDown' || k.key === 'Home'
      || k.key === 'End' || k.ctrlKey || k.metaKey || k.altKey;
  }

  const engine = new KeyboardEngine({
    modes: options?.modes,
    defaultMode: options?.defaultMode ?? undefined,
    isNormalChar: isSpecialKey,
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

  const currentMode = ref(engine.getCurrentMode());

  function sync(state: Parameters<typeof engine.sync>[0]) {
    engine.sync(state);
  }

  function processKey(input: string, key: KeyboardEvent) {
    return engine.processKey(input, key);
  }

  const subscribeFocus = (listener: () => void) => {
    return engine.subscribeFocus(listener);
  };

  onMounted(() => {
    engine.sync({
      path: ['app'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
  });

  return {
    engine,
    currentMode,
    sync,
    processKey,
    subscribeFocus,
  };
}
```

## Component Usage

```vue
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useKeyboardEngine } from './composables/useKeyboardEngine';

const { engine, sync, processKey } = useKeyboardEngine({
  modes: ['normal', 'insert'],
  defaultMode: 'normal',
});

sync({
  path: ['edit-view'],
  activeOverlayIds: [],
  displayedOverlays: [],
  activeModalId: null,
  displayedModals: [],
});

const onKeyDown = (e: KeyboardEvent) => processKey(e.key || '', e);

onMounted(() => window.addEventListener('keydown', onKeyDown));
onUnmounted(() => window.removeEventListener('keydown', onKeyDown));

// Bind keyboard shortcuts
const unbindSave = engine.boundKeyboard(['ctrl+s'], () => {
  console.log('Save triggered');
});
</script>

<template>
  <div>Press Ctrl+S to save</div>
</template>
```

## Modal Management

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useKeyboardEngine } from './composables/useKeyboardEngine';

const { engine, sync, processKey } = useKeyboardEngine();
const showModal = ref(false);
const modalId = 'confirm-modal';

function openModal() {
  showModal.value = true;
  sync({
    path: ['app'],
    activeOverlayIds: [],
    displayedOverlays: [],
    activeModalId: modalId,
    displayedModals: [{ id: modalId }],
  });

  // Modal key bindings
  engine.boundKeyboard(['y'], () => {
    console.log('Confirmed');
    closeModal();
  });
  engine.boundKeyboard(['n'], () => closeModal());
  engine.allowModal(['escape']);
}

function closeModal() {
  showModal.value = false;
  sync({
    path: ['app'],
    activeOverlayIds: [],
    displayedOverlays: [],
    activeModalId: null,
    displayedModals: [],
  });
}
</script>
```

## See Also

- [@cartridge-engine/keyboard-engine on npm](https://www.npmjs.com/package/@cartridge-engine/keyboard-engine)
- [ink-cartridge](https://github.com/BAIGAOa/ink-cartridge) — React / Ink integration reference
