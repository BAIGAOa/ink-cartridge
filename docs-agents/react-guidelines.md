# React guidelines

Project-specific React conventions for `ink-cartridge`.

## Dependency arrays

Dependency arrays must be complete and correct. Include every value referenced from the component scope.

**Correct** (complete dependencies):
```ts
useEffect(() => {
  console.log(value);
}, [value]);
```

**Wrong** (missing dependency):
```ts
useEffect(() => {
  console.log(value);
}, []); // value changes but effect never re-runs
```

## useCallback and useMemo

- Use `useCallback` for functions passed as props to child components that rely on referential equality.
- Use `useMemo` for expensive computations.
- Do NOT wrap every function in `useCallback` — only when it provides a measurable benefit or stabilizes a dependency chain.

## Stale closures

Avoid stale closures in `useEffect` that reference state or props. Include them in the dependency array, or use refs if you intentionally want the latest value without re-running the effect.

```tsx
// Using a ref to always access the latest value without re-running the effect
const valueRef = useRef(value);
valueRef.current = value;
useEffect(() => {
  const timer = setInterval(() => {
    console.log(valueRef.current);
  }, 1000);
  return () => clearInterval(timer);
}, []); // intentionally empty — ref handles the latest value
```

## Rules of hooks

Call hooks only at the top level, only inside React function components or custom hooks.
