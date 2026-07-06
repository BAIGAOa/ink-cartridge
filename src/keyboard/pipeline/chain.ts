import type {
  KeyboardProcessorProps,
  PipelineContext,
  PipelineProcessor,
} from "../types.js";
import { createModalProcessor } from "../modal-processor/index.js";
import { createGlobalSequenceProcessor } from "../global-sequence-processor/index.js";
import { createGlobalKeyProcessor } from "../global-key-processor/index.js";
import { createOverlayProcessor } from "../overlay-processor/index.js";
import { createScreenStackProcessor } from "../screen-stack-processor/index.js";

/** Known IDs of the 7 built-in pipeline processors. */
export type BuiltinProcessorId =
  | "modal"
  | "global-sequence-overlay"
  | "global-key-overlay"
  | "overlay"
  | "global-sequence-screen"
  | "global-key-screen"
  | "screen-stack";

let _processors: PipelineProcessor[] = [
  createModalProcessor(),
  createGlobalSequenceProcessor({ affectOverlay: true }),
  createGlobalKeyProcessor({ affectOverlay: true }),
  createOverlayProcessor(),
  createGlobalSequenceProcessor({ affectOverlay: false }),
  createGlobalKeyProcessor({ affectOverlay: false }),
  createScreenStackProcessor(),
];

function thereIsRepetition(processors: PipelineProcessor[]): {
  hasRepetition: boolean;
  duplicateIds: BuiltinProcessorId[];
} {
  const seenIds = new Set<string>();
  const duplicateIds = new Set<string>();

  for (const processor of processors) {
    if (seenIds.has(processor.id)) {
      duplicateIds.add(processor.id);
    }
    seenIds.add(processor.id);
  }

  return {
    hasRepetition: duplicateIds.size > 0,
    duplicateIds: Array.from(duplicateIds) as BuiltinProcessorId[],
  };
}

/**
 * Register a custom processor into the pipeline at a specified position.
 *
 * @param processor - The processor to insert.
 * @param options - Positioning:
 *   - `{ before: "processorId" }` — insert before the named processor
 *   - `{ after: "processorId" }`  — insert after the named processor
 *   - `{ index: n }`             — insert at the n-th position (0-based)
 *   - omitted                    — append to the end
 *
 * @throws If `processor.id` duplicates an existing processor, or the
 *         `before`/`after` target is not found.
 *
 * @example
 * ```ts
 * import { addProcessor } from './chain.js';
 * import { createMyProcessor } from './my-processor/index.js';
 *
 * addProcessor(createMyProcessor(), { after: 'modal' });
 * ```
 */
export function addProcessor(
  processor: PipelineProcessor,
  options?:
    | { before?: BuiltinProcessorId | (string & {}) }
    | { after?: BuiltinProcessorId | (string & {}) }
    | { index?: number },
): void {
  // Validate no duplicate ID
  const { hasRepetition, duplicateIds } = thereIsRepetition([
    ..._processors,
    processor,
  ]);
  if (hasRepetition) {
    throw new Error(
      `[ink-cartridge] Cannot add processor "${processor.id}": duplicate id "${duplicateIds[0]}"`,
    );
  }

  const opts = options ?? {};

  if ("index" in opts && typeof opts.index === "number") {
    _processors.splice(opts.index, 0, processor);
    return;
  }

  const target =
    "before" in opts ? opts.before : "after" in opts ? opts.after : undefined;

  if (target) {
    const kind = "before" in opts ? "before" : "after";
    const idx = _processors.findIndex((p) => p.id === target);
    if (idx === -1) {
      throw new Error(
        `[ink-cartridge] Cannot insert ${kind} "${target}": processor not found`,
      );
    }
    _processors.splice(kind === "before" ? idx : idx + 1, 0, processor);
    return;
  }

  // Default: append
  _processors.push(processor);
}

/**
 * Remove a processor from the pipeline by its ID.
 *
 * Works on any processor — both built-in and custom. If you remove a
 * built-in processor, use {@link resetProcessors} to restore the default
 * pipeline in tests.
 *
 * @param processorId — The `id` of the processor to remove.
 * @returns `true` if the processor was found and removed, `false` if no
 *          processor with the given ID exists in the pipeline.
 *
 * @example
 * ```ts
 * import { addProcessor, removeProcessor } from 'ink-cartridge';
 *
 * addProcessor({ id: 'my-logger', process: () => false });
 * removeProcessor('my-logger'); // true
 * removeProcessor('my-logger'); // false (already removed)
 * ```
 */
export function removeProcessor(processorId: string): boolean {
  const idx = _processors.findIndex((each) => each.id === processorId);

  if (idx === -1) {
    return false;
  }

  _processors.splice(idx, 1);
  return true;
}

/**
 * Build the canonical 7-stage processor chain.
 *
 * Priority order (highest first):
 *   ⓪ Modal                                    — active modal, always blocks
 *   ① GlobalSequence (affectOverlay: true)  — pending + start
 *   ② GlobalKey      (affectOverlay: true)  — fire before overlays
 *   ③ Overlay broadcast                      — all active overlays, zIndex asc
 *   ④ GlobalSequence (affectOverlay: false) — pending + start
 *   ⑤ GlobalKey      (affectOverlay: false) — fire before screen stack
 *   ⑥ Screen stack                           — top → bottom, only if no overlay consumed
 *
 * @2026-06-22 v3.6.1
 */
function buildProcessors(): PipelineProcessor[] {
  return _processors;
}

/**
 * Insert custom processors into the pipeline array relative to built-in processors.
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

/**
 * Run a keyboard event through the full processor chain.
 *
 * Each processor's `PipelineProcessor.process` is called in order.
 * The first processor to return `true` (event consumed) stops the chain.
 *
 * @param ctx - Snapshot context built by {@link buildPipelineContext}.
 */
export function runPipeline(
  ctx: PipelineContext,
  extra?: KeyboardProcessorProps[],
): void {
  let processors = buildProcessors();
  if (extra) {
    processors = insertRelative(processors, extra);
  }
  for (const processor of processors) {
    if (processor.process(ctx)) return;
  }
}

/** @internal Reset the processor array to its default state (for testing). */
export function resetProcessors(): void {
  _processors.length = 0;
  _processors.push(
    createModalProcessor(),
    createGlobalSequenceProcessor({ affectOverlay: true }),
    createGlobalKeyProcessor({ affectOverlay: true }),
    createOverlayProcessor(),
    createGlobalSequenceProcessor({ affectOverlay: false }),
    createGlobalKeyProcessor({ affectOverlay: false }),
    createScreenStackProcessor(),
  );
}

/** @internal Exposed for testing. */
export function _thereIsRepetition(processors: PipelineProcessor[]): {
  hasRepetition: boolean;
  duplicateIds: BuiltinProcessorId[];
} {
  return thereIsRepetition(processors);
}

/** @internal Exposed for testing. */
export function _getProcessors(): readonly PipelineProcessor[] {
  return _processors;
}

/** @internal Exposed for testing. */
export function _insertRelative(
  arr: PipelineProcessor[],
  items: KeyboardProcessorProps[],
): PipelineProcessor[] {
  return insertRelative(arr, items);
}
