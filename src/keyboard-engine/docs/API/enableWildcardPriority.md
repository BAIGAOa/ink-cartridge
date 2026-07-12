# enableWildcardPriority

Enable wildcard-priority mode, where `"*"` (wildcard) key bindings take absolute priority over exact-key matches.

By default, exact-key bindings (`"return"`, `"ctrl+s"`) are checked before wildcard (`"*"`) bindings. When wildcard-priority mode is active, this is reversed: `"*"` bindings fire first. This is essential for screens that need to intercept *all* key presses (e.g. a text input that should capture every printable character, including those normally bound to other actions).

Uses **reference counting**: multiple callers can enable the mode independently. It only disables when the last caller calls its disable function.

## Signature

```ts
enableWildcardPriority(): () => void
```

## Returns

A disable function. When called, decrements the reference count. When the count reaches 0, wildcard priority is turned off and exact-key bindings regain default priority.

## Effect

Increments `wildcardPriorityCountRef` on the engine state. The pipeline context receives `wildcardFirst: true` when the count is > 0. The screen stack processor and global key processor check this flag and reverse their binding evaluation order accordingly.

## Usage

```ts
function useWildcardPriority() {
  const disable = engine.enableWildcardPriority();

  // All "*" bindings now have priority over specific-key bindings
  // ... text input captures every keystroke ...

  // When done, release:
  disable();
}

// Multiple callers can stack:
const d1 = engine.enableWildcardPriority();
const d2 = engine.enableWildcardPriority();
// Wildcard priority is on
d1();
// Still on — d2 hasn't released yet
d2();
// Now off
```

## API interactions

- **[`boundKeyboard`](./boundKeyboard.md)** — wildcard (`"*"`) bindings are affected by this mode
- **[`globalKeys`](./globalKeys.md)** — global wildcard entries are also affected
- **[`penetration`](./penetration.md)** — penetration keys are checked before bindings regardless of wildcard priority
- **[`stop`](./stop.md)** — stop barriers are also checked before bindings regardless of wildcard priority
