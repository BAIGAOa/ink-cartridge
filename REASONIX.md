# REASONIX.md

## Stack
- TypeScript 5.x, strict mode, Node16 modules, ES2022 target
- React 19 + Ink 7 (terminal UI framework)
- vitest 4.x with `@testing-library/react` + `ink-testing-library`

## Layout
- `src/screen/` — tree-based screen navigation: register, skip, back, gotoScreen, overlay
- `src/keyboard/` — layered keyboard events with focus management and shortcut actions
- `src/components/` — SelectInput, MultiSelectInput, TextInput, ConfirmDialog
- `src/index.ts` — public API barrel export
- `src/__tests__/` — all tests organized by subsystem
- `src/projectTest/` — manual test/demo screens (not part of build)
- `dist/` — build output (.gitignored)

## Commands
```bash
npm run build       # tsc --locale zh-CN
npm run watch       # tsc --watch --locale zh-CN
npm run test        # vitest run
npm run test:watch  # vitest
npm run clean       # rm -rf dist
```

## Conventions
- Components use **JSX** syntax. `React.createElement` in existing code is a historical legacy from before the project adopted JSX — do NOT use it for new components.
- Tests under `src/__tests__/` — `*.ink.test.ts(x)` runs in node env, `*.test.ts(x)` in jsdom
- `registerComponent()` required before any screen appears in a provider tree
- `clearRegistry()` in test `beforeEach` — registry is a module-level Map
- Navigation functions (`skip`, `back`, `gotoScreen`, `overlay`, `closeOverlay`) work both as hooks and module-level imports via `_dispatch` ref
- `KeyboardProvider` MUST be nested inside `ScenarioManagementProvider`

## Coding Conventions

### Focus target lifecycle
Separate `focusUnregister` from the keyboard binding `useEffect`. The binding effect may re-run on value changes; `focusUnregister` should only run on unmount.

```tsx
const focusIdRef = useRef(focusId);
focusIdRef.current = focusId;
useEffect(() => {
  return () => focusUnregister(focusIdRef.current);
}, []); // mount/unmount only

useEffect(() => {
  // boundKeyboard(...)
  return () => { /* unbind keyboard handlers only */ };
}, [value, /* ... */]);
```

### Callback refs in empty-deps effects
When a `useEffect` has `[]` deps, capture callbacks via `useRef` to avoid stale closures.

```tsx
const onCancelRef = useRef(onCancel);
onCancelRef.current = onCancel;
useEffect(() => {
  return boundKeyboard(['escape'], () => onCancelRef.current());
}, []);
```

### Defaults for prop accessors
All props whose values are accessed via `.length` / `.map()` / etc. must have a runtime default.

```tsx
function KeyHint({ keys = [] }: Props) { ... }
function TextInput({ value = '' }: Props) { ... }
```

### globalKeys mode
Use `{ mode: 'add' }` when registering global keys alongside other consumers. Default (replace) silently deletes entries from other components.

```tsx
globalKeys([{ key: 'ctrl+s', operate: handleSubmit }], { mode: 'add' });
```

### Mount guard for async operations
Use a `mountedRef` to prevent callbacks from running after unmount.

```tsx
const mountedRef = useRef(true);
useEffect(() => { return () => { mountedRef.current = false; }; }, []);
```

### No decorative delimiter comments
Do NOT use separator lines like `// ──` or `// ===` or `// ═══` to visually group code.
Write comments that explain **why**, not banners that claim territory. If a section is
long enough to need a delimiter, extract it to a separate function or file.

```tsx
// ❌ Bad
// ── Validation ──

// ✅ Good
// Trim whitespace before comparing to avoid false negatives on user input
```

### Public API requires JSDoc in English
Every export in `src/index.ts` and every public type/function must have a JSDoc
comment in English. The comment should describe **what** the function does and
**when** to use it.

```tsx
/**
 * A single-select list component integrated with the ink-kit keyboard and
 * focus system. Supports virtual scrolling, custom item rendering, and
 * Tab / Shift+Tab focus navigation.
 */
export function SelectInput(...) { ... }
```

Internal helpers and module-level state can omit JSDoc or use short inline comments.

### Hook encapsulation rule
When the same `useEffect` + `useRef` pattern appears in 3+ components, extract it
into a custom hook in the shared system module.

```tsx
// src/keyboard/useFocusLifecycle.ts
export function useFocusLifecycle(focusId: string) {
  const { focusUnregister } = useKeyboard();
  const focusIdRef = useRef(focusId);
  focusIdRef.current = focusId;
  useEffect(() => {
    return () => focusUnregister(focusIdRef.current);
  }, []);
}
```

### Tests must find bugs and prevent regressions
No "happy tests" (tests that only verify the obvious and never fail).
Every test should target a **specific behavior** that could break:

- Test **edge cases** (empty, zero, boundary, unexpected input)
- Test **failure modes** (what happens when validation fails, component unmounts mid-operation)
- Test **state transitions** (did state A correctly transition to state B?)
- Test **regression** (did a fix for one issue introduce another?)

Strive for **broad scenario coverage** — not line coverage percentage, but
coverage of real user flows (input → navigate → validate → submit → error → recover).

```tsx
describe('submit', () => {
  it('rejects empty email with specific error message');   // validation logic
  it('clears error after user starts typing');              // state transition
  it('does not call onSubmit after unmount');               // regression guard
  it('focuses the first invalid field on error');           // user flow
  it('handles rapid consecutive submits without crash');    // edge case
});
```

A test that never failed while you developed the feature is a test that
doesn't test anything worthwhile. If you find yourself writing
`it('renders correctly', () => { expect(true).toBe(true); })`, delete it.

## Watch out for
- `blockedKey` means "pass-through" (penetration), NOT "block" — makes keys transparent to lower layers
- `_dispatch` is set in `useEffect` — not available during `componentDidCatch`. If an error boundary calls `overlay()` in `componentDidCatch`, `_dispatch` is `null`
- `clearShortcutOperations` is a no-op at module level — keyboard state is per-instance via `useRef`
- `ScenarioManagementProvider` nested first, then `KeyboardProvider` inside it. Reversed order silently breaks keyboard
- Overlay automatically closes on `skip`/`back`/`gotoScreen` (handled in reducer)
- Double `<` in TSX generics e.g. `useRef<<T>` is parsed as JSX tag — must be `useRef<T>` (single)
