# Coding patterns

Project-specific patterns for `ink-cartridge` components and hooks.

## Focus target lifecycle

Separate `focusUnregister` from the keyboard binding effect. The binding effect re-runs on value changes; `focusUnregister` only on unmount.

```tsx
const focusIdRef = useRef(focusId);
focusIdRef.current = focusId;
useEffect(() => {
  return () => focusUnregister(focusIdRef.current);
}, []); // mount/unmount only

useEffect(() => {
  return boundKeyboard(['enter'], () => onSubmit());
}, [value]);
```

## Callback refs in empty-deps effects

When a keyboard handler needs the latest callback but the effect should not re-run on every callback change:

```tsx
const onCancelRef = useRef(onCancel);
onCancelRef.current = onCancel;
useEffect(() => {
  return boundKeyboard(['escape'], () => onCancelRef.current());
}, []);
```

## Defaults for prop accessors

All props accessed via `.length` / `.map()` must have runtime defaults:

```tsx
function KeyHint({ keys = [] }: Props) { ... }
function TextInput({ value = '' }: Props) { ... }
```

## globalKeys mode

Use `{ mode: 'add' }` when registering alongside other consumers. Default (`replace`) silently deletes entries from other components.

```tsx
kb.globalKeys(['ctrl+o'], openHandler, { mode: 'add' });
```

## Mount guard for async operations

```tsx
const mountedRef = useRef(true);
useEffect(() => { return () => { mountedRef.current = false; }; }, []);

async function loadData() {
  const data = await fetchData();
  if (!mountedRef.current) return;
  setData(data);
}
```

## Hook encapsulation rule

When the same `useEffect` + `useRef` pattern appears in 3+ components, extract it into a custom hook. (The `focusUnregister` pattern in 8+ components is a candidate for `useFocusLifecycle`.)
