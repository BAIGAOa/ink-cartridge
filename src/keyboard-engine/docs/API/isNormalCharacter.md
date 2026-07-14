# isNormalCharacter

Check whether a keyboard event represents a normal (printable) character — no modifier keys, no special keys. A pure utility function (no engine state involved).

## Signature

```ts
function isNormalCharacter(input: string, key: unknown): boolean
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `input` | `string` | The character input from the host framework. |
| `key` | `unknown` | The raw key event object from the host framework. |

## Returns

`boolean` — `true` if the event is a normal character (no ctrl, meta, shift, or special keys).

## Effect

None. This is a pure function — it reads no engine state and produces no side effects.

## Usage

```ts
import { isNormalCharacter } from '@cartridge-engine/keyboard-engine';

function normalizeBlessedKey(input: string, key: unknown): string[] {
  if (isNormalCharacter(input, key)) {
    return [input];
  }
  // Handle special keys...
  return [/* ... */];
}
```

Common uses:
- In `normalizeKeyNames` adapters to filter printable vs special keys
- In custom input components to distinguish text input from command keys
- In pipeline processors to decide whether an event should be consumed or passed through
