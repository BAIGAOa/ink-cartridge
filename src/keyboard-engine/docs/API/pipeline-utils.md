# _insertRelative

Insert custom processors into a pipeline array relative to built-in processors.

## Signature

```ts
function _insertRelative(
  arr: PipelineProcessor[],
  items: KeyboardProcessorProps[],
): PipelineProcessor[]
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `arr` | `PipelineProcessor[]` | The current pipeline array. |
| `items` | `KeyboardProcessorProps[]` | Custom processors to insert, with positioning metadata. |

Each `KeyboardProcessorProps` describes where to insert a custom processor:

| Field | Type | Description |
|-------|------|-------------|
| `processor` | `PipelineProcessor` | The custom processor to insert. |
| `index` | `number` | (Optional) Insert at this 0-based position. |
| `target` | `BuiltinProcessorId` | (Optional) Target built-in processor ID. |
| `position` | `'before' \| 'after'` | (Optional) Insert before or after `target`. |

Positioning priorities (checked in order): `index` → `target` + `position` → append.

## Returns

A new `PipelineProcessor[]` array with the inserted processors. The original array is not mutated.

## Throws

- If a processor ID duplicates an existing processor in the array
- If the `target` processor is not found in the array

## Effect

None. This is a pure function — it reads the input arrays and produces a new array. No engine state is modified.

## Usage

```ts
import { _insertRelative } from '@cartridge-engine/keyboard-engine';

const basePipeline = [modalProcessor, overlayProcessor, screenStackProcessor];

const customPipeline = _insertRelative(basePipeline, [
  { processor: auditLogger, index: 0 },
  { processor: specialKeyHandler, target: 'modal', position: 'after' },
]);
```

## BuiltinProcessorId

```ts
type BuiltinProcessorId =
  | "modal"
  | "composition-overlay"
  | "global-sequence-overlay"
  | "global-key-overlay"
  | "overlay"
  | "composition-screen"
  | "global-sequence-screen"
  | "global-key-screen"
  | "screen-stack";
```

Known IDs of the 9 built-in pipeline processors. Use these as `target` values when calling `_insertRelative`, `addProcessor`, or the `processors` prop on `KeyboardProvider`.
