---
name: components
description: Coding conventions for components under src/components/ — JSX, focusId, lifecycle, and patterns
paths: ["src/components/**"]
---

## JSX

All new code MUST use JSX syntax. `React.createElement` is forbidden.

## focusId

All interactive components must accept `focusId` and integrate with the keyboard focus system.

## Props with .length/.map()

Always provide runtime defaults:

```tsx
function KeyHint({ keys = [] }: Props) { ... }
function TextInput({ value = '' }: Props) { ... }
```

## Focus target lifecycle

Separate `focusUnregister` from the keyboard binding effect. The binding effect re-runs on value changes; `focusUnregister` only on unmount.

```tsx
const focusIdRef = useRef(focusId);
focusIdRef.current = focusId;
useEffect(() => {
  return () => focusUnregister(focusIdRef.current);
}, []); // mount/unmount only

useEffect(() => {
  return boundKeyboard([...], handler);
}, [value]);
```

## Callback refs in empty-deps effects

```tsx
const onCancelRef = useRef(onCancel);
onCancelRef.current = onCancel;
useEffect(() => {
  return boundKeyboard(['escape'], () => onCancelRef.current());
}, []);
```

## globalKeys mode

Use `{ mode: 'add' }` when registering alongside other consumers. Default (`replace`) silently deletes entries from other components.

## Mount guard for async operations

```tsx
const mountedRef = useRef(true);
useEffect(() => { return () => { mountedRef.current = false; }; }, []);
```

## Hook encapsulation

When the same `useEffect` + `useRef` pattern appears in 3+ components, extract into a custom hook.
