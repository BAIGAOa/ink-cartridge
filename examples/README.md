# Examples

Single-API demos for ink-cartridge components. Each directory contains one demo file per component variant.

## Running a demo

Before running any demo, build the workspace package:

```bash
npm run build -w @cartridge-engine/keyboard-engine
```

Then run the demo:

```bash
npx tsx examples/<component>/<Demo>.demo.tsx
```

## Core System Demos

Screen navigation and keyboard system demos. Each demo is a self-contained file showcasing a specific scenario.

| Demo | Description | Command |
|------|-------------|---------|
| composition | registryCompositionKey, flag/needs chains, pending state, abort | `npx tsx examples/core/composition.demo.tsx` |
| counter | boundKeyboard with once, times, when, observer | `npx tsx examples/core/counter.demo.tsx` |
| conditions | addCondition, setCondition, removeCondition + when: string | `npx tsx examples/core/conditions.demo.tsx` |
| navigation | skip, back, gotoScreen with multi-level tree | `npx tsx examples/core/navigation.demo.tsx` |
| overlay | openLayer/applyElement/closeLayer + activateElement/deactivateElement + crossPage | `npx tsx examples/core/overlay.demo.tsx` |
| propagation | penetration and stop with layer-screen interaction | `npx tsx examples/core/propagation.demo.tsx` |
| focus-management | focusId, Tab navigation, useFocusState, programmatic focus | `npx tsx examples/core/focus-management.demo.tsx` |
| modal | openModalLayer/applyElementToModalLayer, closeModalLayer/closeAllModalLayer, crossPage, modal stacking | `npx tsx examples/core/modal.demo.tsx` |
| global-keys | globalKeys with cover, category, affectOverlay, times, observer | `npx tsx examples/core/global-keys.demo.tsx` |
| sequences | boundSequence + globalSequence, exclusive mode, timeouts | `npx tsx examples/core/sequences.demo.tsx` |
| pending-state | thereGlobalQueueWaiting + currentScreenHasSequenceWaiting with sync, pending-state UI feedback | `npx tsx examples/core/pending-state.tsx` |
| pipeline | Custom processor injection via KeyboardProvider's processors prop | `npx tsx examples/core/pipeline.demo.tsx` |
| modal-keyboard | allowModal + useModalMissListener inside modal layers for pass-through and miss detection | `npx tsx examples/core/modal-keyboard.demo.tsx` |
| shortcut-actions | defineShortcutAction, add/remove/modify, rebindable controls | `npx tsx examples/core/shortcut-actions.demo.tsx` |
| wildcard | enableWildcardPriority + * binding for text capture mode | `npx tsx examples/core/wildcard.demo.tsx` |
| layer-system | Layer A/B z-index order, layer broadcast, bubbling, penetration, stop, modal barrier | `npx tsx examples/layer-system/LayerSystem.demo.tsx` |
| takeover-scope | `automaticTakeoverKeyboard` with a page list (array): layer bindings go dormant only on listed pages and stay active elsewhere | `npx tsx examples/core/takeover-scope.demo.tsx` |

## Mouse demos

Mouse support is built on the `xterm-mouse` fork shipped inside `@cartridge-engine/keyboard-engine`. The React adapter (`KeyboardProvider mouse` + `useMouseRegion`) registers measured element rectangles with the engine, which hit-tests xterm-mouse events against them.

| Demo | Description | Command |
|------|-------------|---------|
| mouse-hit-test | Click hit-testing against an 8x8 Ink box via `useMouseRegion` | `npx tsx examples/xterm-mouse/MouseHitTest.demo.tsx` |
| mouse-layer-stack | Mouse hit priority across stacked layers (layer beats page, root fallback); `applyElement` with typed props | `npx tsx examples/xterm-mouse/MouseLayerStack.demo.tsx` |
| mouse-controls | Clickable `[x]`/`[OK]` buttons on a panel (child regions win via `priority`) | `npx tsx examples/xterm-mouse/MouseControls.demo.tsx` |
| mouse-drag | Drag a window via the press→drag→release capture lifecycle | `npx tsx examples/xterm-mouse/MouseDrag.demo.tsx` |
| mouse-sequence | Click-to-focus fire panels driven by all three `boundSequence` calling conventions (explicit keys + actionId, explicit keys + callback, actionId with preset keys) | `npx tsx examples/xterm-mouse/SequenceMouse.demo.tsx` |

## Component demos

| Component | Demo | Command |
|-----------|------|---------|
| Badge | `Badge.demo.tsx` | `npx tsx examples/badge/Badge.demo.tsx` |
| ConfirmDialog | `ConfirmDialog.demo.tsx` | `npx tsx examples/dialog/ConfirmDialog.demo.tsx` |
| Divider | `Divider.demo.tsx` | `npx tsx examples/divider/Divider.demo.tsx` |
| Fold | `Fold.demo.tsx` | `npx tsx examples/fold/Fold.demo.tsx` |
| Form | `Form.demo.tsx` | `npx tsx examples/form/Form.demo.tsx` |
| KeyHint | `KeyHint.demo.tsx` | `npx tsx examples/key-hint/KeyHint.demo.tsx` |
| MultiSelectInput | `MultiSelectInput.demo.tsx` | `npx tsx examples/multi-select/MultiSelectInput.demo.tsx` |
| NumberInput | `NumberInput.demo.tsx` | `npx tsx examples/number-input/NumberInput.demo.tsx` |
| ProgressBar | `ProgressBar.demo.tsx` | `npx tsx examples/progress-bar/ProgressBar.demo.tsx` |
| SearchBar | `SearchBar.demo.tsx` | `npx tsx examples/search-bar/SearchBar.demo.tsx` |
| SearchBar (multi) | `SearchBar.multi.demo.tsx` | `npx tsx examples/search-bar/SearchBar.multi.demo.tsx` |
| SearchInput | `SearchInput.demo.tsx` | `npx tsx examples/search-input/SearchInput.demo.tsx` |
| Spinner | `Spinner.demo.tsx` | `npx tsx examples/spinner/Spinner.demo.tsx` |
| Tabs | `Tabs.demo.tsx` | `npx tsx examples/tabs/Tabs.demo.tsx` |
