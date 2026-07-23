# isNormalCharacter

Check whether a keyboard event represents a normal (printable) character — no modifier keys, no special keys. A pure utility function (no engine state involved).

The engine stays framework-agnostic: callers pass an `isSpecialKey` predicate that inspects the host framework's native Key shape. All built-in logic (empty-input guard, wildcard integration) lives in this function; only the "what makes a key special?" question is delegated to the adapter.

## Signature

```ts
function isNormalCharacter(
  input: string,
  key: unknown,
  isSpecialKey: (key: unknown) => boolean,
): boolean
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `input` | `string` | The character input from the host framework. |
| `key` | `unknown` | The raw key event object from the host framework. |
| `isSpecialKey` | `(key: unknown) => boolean` | Framework-provided predicate that returns `true` for arrows, navigation keys, modifiers, and release events — anything that is NOT a normal character. |

## Returns

`boolean` — `true` if the event is a normal character (non-empty input and `isSpecialKey` returns `false`).

## Effect

None. This is a pure function — it reads no engine state and produces no side effects.

## Usage

```ts
import { isNormalCharacter } from '@cartridge-engine/keyboard-engine';

// Ink adapter: pass a predicate that inspects Ink's Key shape
import { isInkSpecialKey } from './keyNormalizer.js';

if (isNormalCharacter(input, key, isInkSpecialKey)) {
  // input is a normal printable character
}
```

```ts
// Custom framework adapter example:
function mySpecialKeyChecker(key: unknown): boolean {
  const k = key as Record<string, unknown>;
  return k.ctrl || k.meta || k.return || k.escape || k.tab
    || k.upArrow || k.downArrow || k.leftArrow || k.rightArrow;
}

isNormalCharacter('a', myKey, mySpecialKeyChecker); // true
isNormalCharacter('', myKey, mySpecialKeyChecker);  // false (empty input)
```

Common uses:
- In `normalizeKeyNames` adapters to filter printable vs special keys
- In custom input components to distinguish text input from command keys
- In pipeline processors to decide whether an event should be consumed or passed through
