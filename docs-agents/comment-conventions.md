# Comment conventions

## 1. No decorative comments or separators

Comments must explain **why**, not restate what the code does.

**Correct** (explains why):
```ts
// We use a ref here because the callback must be stable across re-renders,
// but the actual value may change. Storing it in a ref prevents unnecessary
// re-binding of the keyboard handler.
const onCancelRef = useRef(onCancel);
```

**Wrong** (decorative separator):
```ts
// ─────────────────────────────────────────────
// Component rendering
// ─────────────────────────────────────────────
```

**Wrong** (states "what"):
```ts
// Set the value to 42
setValue(42);
```

## 2. Explain "why", not "what"

**Correct** (explains design decision):
```ts
// We cannot use the regular `focusSet` here because the overlay may not
// be mounted yet. Instead, we defer focus via a ref.
deferredFocusRef.current = focusId;
```

**Wrong** (repeats code):
```ts
// Increment the counter
counter++;
```

## 3. Internal implementation must have clear comments

For complex logic, non-obvious edge cases, performance optimizations, or concurrency controls, always add comments explaining the underlying principles.

**Correct**:
```ts
// The write queue is a promise chain. We use `.then(task, task)` so that
// even if a previous write rejects, the next write still executes.
// Without the second argument, a rejection would break the chain forever.
this.pending = this.pending.then(task, task);
```

## 4. Public API must have English JSDoc

Every public function, component, type, or constant exported from `src/index.ts` must have an English JSDoc comment.

**Correct** (complete JSDoc):
```ts
/**
 * Register a component as a screen in the navigation tree.
 *
 * @param component - The React component (used as the unique token).
 * @param template  - Default props for the component.
 * @param options   - Optional registration options (e.g. `parent`).
 * @throws {Error} If the component has already been registered.
 * @example
 * ```tsx
 * registerComponent(Menu, {});
 * registerComponent(Game, { level: 1 }, { parent: Menu });
 * ```
 */
export function registerComponent(...): void;
```

**Wrong** (missing or one-line):
```ts
// Register a component
export function registerComponent(...) { ... }
```

## 5. Timestamp large comment blocks

Any comment block spanning **more than 5 lines** MUST end with a timestamp (date + project version from `package.json`):

```
// @2026-06-14 v3.1.0
```

**Correct** (6-line block with timestamp):
```ts
// The write queue is a promise chain. We use `.then(task, task)` so
// that even if a previous write rejects, the next write still executes.
// Without the second argument, a rejection would break the chain forever.
// This is critical because the queue is shared across all writers and
// one failing writer must not block subsequent writes.
// @2026-06-14 v3.1.0
this.pending = this.pending.then(task, task);
```

**Wrong** (8-line block, missing timestamp):
```ts
// We need to iterate in reverse order because the keyboard event
// must be offered to the topmost layer first. If the top layer
// does not handle the key, we try the next one below it and so
// on until someone consumes it or we run out of layers.
// The reverse loop also correctly handles the case where a layer
// is removed mid-iteration.
for (let i = path.length - 1; i >= 0; i--) { ... }
```
