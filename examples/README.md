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
| overlay | open/close/activate/deactivate overlays + persistent | `npx tsx examples/core/overlay.demo.tsx` |
| propagation | penetration and stop with overlay-screen layer interaction | `npx tsx examples/core/propagation.demo.tsx` |
| focus-management | focusId, Tab navigation, useFocusState, programmatic focus | `npx tsx examples/core/focus-management.demo.tsx` |
| modal | openModal/closeModal, renderNow, persistent, modal stacking | `npx tsx examples/core/modal.demo.tsx` |
| global-keys | globalKeys with cover, category, affectOverlay, times, observer | `npx tsx examples/core/global-keys.demo.tsx` |
| sequences | boundSequence + globalSequence, exclusive mode, timeouts | `npx tsx examples/core/sequences.demo.tsx` |
| pending-state | thereGlobalQueueWaiting + currentScreenHasSequenceWaiting with sync, pending-state UI feedback | `npx tsx examples/core/pending-state.tsx` |
| modal-keyboard | allowModal + useModalMissListener for pass-through and miss detection | `npx tsx examples/core/modal-keyboard.demo.tsx` |
| shortcut-actions | defineShortcutAction, add/remove/modify, rebindable controls | `npx tsx examples/core/shortcut-actions.demo.tsx` |
| wildcard | enableWildcardPriority + * binding for text capture mode | `npx tsx examples/core/wildcard.demo.tsx` |

## Component demos

| Component | Demo | Command |
|-----------|------|---------|
| Badge | `Badge.demo.tsx` | `npx tsx examples/badge/Badge.demo.tsx` |
| ConfirmDialog | `ConfirmDialog.demo.tsx` | `npx tsx examples/dialog/ConfirmDialog.demo.tsx` |
| Divider | `Divider.demo.tsx` | `npx tsx examples/divider/Divider.demo.tsx` |
| Fold | `Fold.demo.tsx` | `npx tsx examples/fold/Fold.demo.tsx` |
| Form | `Form.demo.tsx` | `npx tsx examples/form/Form.demo.tsx` |
| I18n | `I18n.demo.tsx` | `npx tsx examples/i18n/I18n.demo.tsx` |
| I18n (typed) | `I18n.typed.demo.tsx` | `npx tsx examples/i18n/I18n.typed.demo.tsx` |
| KeyHint | `KeyHint.demo.tsx` | `npx tsx examples/key-hint/KeyHint.demo.tsx` |
| MultiSelectInput | `MultiSelectInput.demo.tsx` | `npx tsx examples/multi-select/MultiSelectInput.demo.tsx` |
| NumberInput | `NumberInput.demo.tsx` | `npx tsx examples/number-input/NumberInput.demo.tsx` |
| ProgressBar | `ProgressBar.demo.tsx` | `npx tsx examples/progress-bar/ProgressBar.demo.tsx` |
| SearchBar | `SearchBar.demo.tsx` | `npx tsx examples/search-bar/SearchBar.demo.tsx` |
| SearchBar (multi) | `SearchBar.multi.demo.tsx` | `npx tsx examples/search-bar/SearchBar.multi.demo.tsx` |
| SearchInput | `SearchInput.demo.tsx` | `npx tsx examples/search-input/SearchInput.demo.tsx` |
| Spinner | `Spinner.demo.tsx` | `npx tsx examples/spinner/Spinner.demo.tsx` |
| Tabs | `Tabs.demo.tsx` | `npx tsx examples/tabs/Tabs.demo.tsx` |
| Theme | `Theme.demo.tsx` | `npx tsx examples/theme/Theme.demo.tsx` |
| Theme (typed) | `Theme.typed.demo.tsx` | `npx tsx examples/theme/Theme.typed.demo.tsx` |
