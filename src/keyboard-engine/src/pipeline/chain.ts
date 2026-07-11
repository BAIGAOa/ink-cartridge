import type { KeyboardProcessorProps, PipelineProcessor } from "../types.js";

/** Known IDs of the 7 built-in pipeline processors. */
export type BuiltinProcessorId =
  | "modal"
  | "composition-overlay"
  | "global-sequence-overlay"
  | "global-key-overlay"
  | "overlay"
  | "composition-screen"
  | "global-sequence-screen"
  | "global-key-screen"
  | "screen-stack";

/**
 * Insert custom processors into a pipeline array relative to built-in processors.
 *
 * Supports three positioning modes (checked in order):
 * 1. `{ processor, index }` — insert at the given 0-based index
 * 2. `{ processor, target, position }` — insert before/after a named processor
 * 3. `{ processor }` — append to the end
 *
 * @throws If the target processor is not found, or if a duplicate ID is detected.
 */
function insertRelative(
  arr: PipelineProcessor[],
  items: KeyboardProcessorProps[],
): PipelineProcessor[] {
  let currentArr = [...arr];

  for (const each of items) {
    const { processor } = each;

    if (currentArr.some((p) => p.id === processor.id)) {
      throw new Error(
        `[ink-cartridge] Cannot insert processor: duplicate id "${processor.id}"`,
      );
    }

    if (typeof each.index === "number") {
      currentArr = [
        ...currentArr.slice(0, each.index),
        processor,
        ...currentArr.slice(each.index),
      ];
      continue;
    }

    if (each.target && each.position) {
      const idx = currentArr.findIndex((p) => p.id === each.target);
      if (idx === -1) {
        throw new Error(
          `[ink-cartridge] Cannot insert processor: target "${each.target}" not found`,
        );
      }
      const insertIdx = each.position === "before" ? idx : idx + 1;
      currentArr = [
        ...currentArr.slice(0, insertIdx),
        processor,
        ...currentArr.slice(insertIdx),
      ];
      continue;
    }

    // Default: append
    currentArr = [...currentArr, processor];
  }

  return currentArr;
}

/** @internal Exposed for testing and KeyboardEngine. */
export function _insertRelative(
  arr: PipelineProcessor[],
  items: KeyboardProcessorProps[],
): PipelineProcessor[] {
  return insertRelative(arr, items);
}
