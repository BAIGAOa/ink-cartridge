import { createModalProcessor } from "../processors/modal.js";
import { createCompositionProcessor } from "../processors/globalComposition.js";
import { createGlobalSequenceProcessor } from "../processors/globalSequence.js";
import { createGlobalKeyProcessor } from "../processors/globalKey.js";
import { createLayerProcessor } from "../processors/layer.js";
import { createScreenStackProcessor } from "../processors/screenStack.js";
import EngineState from "./EngineState.js";
import {
  KeyboardProcessorProps,
  PipelineProcessor,
  ProcessorInput,
} from "../types/processor.js";
import { builtinProcessorWeights } from "../processors/weights.js";

/**
 * Owns the processor pipeline for an engine instance: default 9-stage
 * construction, insertion, removal, reset, and kick/activate toggles.
 *
 * The default pipeline is a 9-stage chain (highest priority first):
 * `modal` → `composition-overlay` → `global-sequence-overlay` →
 * `global-key-overlay` → `layer` → `composition-screen` →
 * `global-sequence-screen` → `global-key-screen` → `screen-stack`.
 *
 * Custom processors can be injected at any position via
 * {@link addProcessor} (or the constructor's `processors` prop), and any
 * stage can be temporarily disabled via {@link kickProcessor}.
 * All pipeline state is **per-instance** — each `KeyboardEngine` manages
 * its own pipeline independently.
 */
export default class PipelineManager<TComponent> {
  /** Monotonic registration counter, stamped onto `createAt` on insert. */
  private _serial = 0;

  constructor(
    private state: EngineState<TComponent>,
    custom?: KeyboardProcessorProps<TComponent>[],
  ) {
    this.state._processors = this._buildDefaultProcessors(custom);
  }

  /**
   * Build the default 9-stage pipeline, in order:
   * `modal` (modal barrier) → `composition-overlay` (composition chains,
   * affectOverlay: true) → `global-sequence-overlay` (global sequences,
   * affectLayer: true) → `global-key-overlay` (global keys,
   * affectLayer: true) → `layer` (layer broadcast) →
   * `composition-screen` (composition chains, affectOverlay: false) →
   * `global-sequence-screen` (global sequences, affectLayer: false) →
   * `global-key-screen` (global keys, affectLayer: false) → `screen-stack`
   * (screen stack, top to bottom).
   *
   * Every built-in is registered through {@link addProcessor} with its weight
   * from {@link builtinProcessorWeights}, so it gets a fresh `createAt` and
   * the array ends up sorted. `custom` processors (the constructor's
   * `processors` prop) are applied afterwards through the same path, using
   * their `index` / `target` + `position`, or appended when neither is given.
   */
  _buildDefaultProcessors(
    custom?: KeyboardProcessorProps<TComponent>[],
  ): PipelineProcessor<TComponent>[] {
    this.state._processors = [];

    this.addProcessor(createModalProcessor(), {
      weight: builtinProcessorWeights.modal,
    });
    this.addProcessor(createCompositionProcessor({ affectOverlay: true }), {
      weight: builtinProcessorWeights["composition-overlay"],
    });
    this.addProcessor(createGlobalSequenceProcessor({ affectOverlay: true }), {
      weight: builtinProcessorWeights["global-sequence-overlay"],
    });
    this.addProcessor(createGlobalKeyProcessor({ affectOverlay: true }), {
      weight: builtinProcessorWeights["global-key-overlay"],
    });
    this.addProcessor(createLayerProcessor(), {
      weight: builtinProcessorWeights.layer,
    });
    this.addProcessor(createCompositionProcessor({ affectOverlay: false }), {
      weight: builtinProcessorWeights["composition-screen"],
    });
    this.addProcessor(createGlobalSequenceProcessor({ affectOverlay: false }), {
      weight: builtinProcessorWeights["global-sequence-screen"],
    });
    this.addProcessor(createGlobalKeyProcessor({ affectOverlay: false }), {
      weight: builtinProcessorWeights["global-key-screen"],
    });
    this.addProcessor(createScreenStackProcessor(), {
      weight: builtinProcessorWeights["screen-stack"],
    });

    for (const entry of custom ?? []) {
      if (entry.index !== undefined) {
        this.addProcessor(entry.processor, { index: entry.index });
      } else if (entry.target && entry.position) {
        this.addProcessor(
          entry.processor,
          entry.position === "before"
            ? { before: entry.target }
            : { after: entry.target },
        );
      } else {
        this.addProcessor(entry.processor);
      }
    }

    return this.state._processors;
  }

  /**
   * Insert a custom processor into this engine instance's pipeline.
   *
   * The pipeline is kept sorted by weight — higher weight runs first. Equal
   * weights are ordered by registration time: `createAt` is assigned by the
   * engine on insert.
   *
   * Priority is expressed through `options`:
   * - `{ weight: n }` — explicit priority, higher runs first
   * - `{ index: n }` — place at that sorted slot
   * - `{ before: "id" }` / `{ after: "id" }` — resolve relative to a named
   *   processor (e.g. `"modal"`, `"layer"`)
   * - omitted — weight `0`, i.e. after all built-in stages
   *
   * The insertion takes effect immediately — the next {@link processKey}
   * call uses the updated pipeline. A processor whose `process(ctx)`
   * returns `true` consumes the event and stops the chain; `false` lets
   * it continue to the next stage.
   *
   * @example
   * ```ts
   * // Logging — insert at front to trace every keystroke
   * engine.addProcessor({
   *   id: 'keystroke-logger',
   *   process(ctx) {
   *     console.log(`[key] input=${ctx.input} names=${ctx.eventNames}`);
   *     return false; // don't consume
   *   },
   * }, { index: 0 });
   *
   * // Intercept before the modal barrier
   * engine.addProcessor({
   *   id: 'emergency-exit',
   *   process(ctx) {
   *     if (ctx.input === '\x03') { process.exit(0); return true; }
   *     return false;
   *   },
   * }, { before: 'modal' });
   *
   * // Run after the layer broadcast stage
   * engine.addProcessor(myAuditProcessor, { after: 'layer' });
   * ```
   *
   * @throws If `processor.id` duplicates an existing processor id, or the
   *         `before`/`after` target is not found in the pipeline.
   */
  addProcessor(
    processor: ProcessorInput<TComponent>,
    options?:
      | { weight?: number }
      | { before?: string }
      | { after?: string }
      | { index?: number },
  ): void {
    if (this.state._processors.some((p) => p.id === processor.id)) {
      throw new Error(
        `[ink-cartridge] Cannot add processor "${processor.id}": duplicate id`,
      );
    }

    const arr = this.state._processors;
    const opts = options ?? {};
    let targetIndex: number | undefined;

    if ("index" in opts && typeof opts.index === "number") {
      targetIndex = opts.index;
    } else {
      const target =
        "before" in opts
          ? opts.before
          : "after" in opts
            ? opts.after
            : undefined;
      if (target) {
        const kind = "before" in opts ? "before" : "after";
        const idx = arr.findIndex((p) => p.id === target);
        if (idx === -1) {
          throw new Error(
            `[ink-cartridge] Cannot insert ${kind} "${target}": processor not found`,
          );
        }
        targetIndex = kind === "before" ? idx : idx + 1;
      }
    }

    // Priority: explicit `weight`, else the positional sugar resolves to the
    // weight of the slot it occupies, else the default 0 (after built-ins).
    let weight: number;
    if ("weight" in opts && typeof opts.weight === "number") {
      weight = opts.weight;
    } else if (targetIndex !== undefined) {
      weight = this._weightForSlot(arr, targetIndex);
    } else {
      weight = 0;
    }

    const full: PipelineProcessor<TComponent> = {
      process: processor.process,
      id: processor.id,
      active: processor.active ?? true,
      weight,
      createAt: this._serial++,
    };

    arr.push(full);
    this._sortByWeight();
  }

  /**
   * Compute a weight that would sort a new processor exactly at `slot`,
   * bisecting the weights of the processors surrounding the slot so the
   * sorted order is preserved without disturbing existing entries.
   */
  private _weightForSlot(
    arr: PipelineProcessor<TComponent>[],
    slot: number,
  ): number {
    const weightOf = (p?: PipelineProcessor<TComponent>) =>
      p === undefined ? undefined : p.weight;
    const above = slot > 0 ? weightOf(arr[slot - 1]) : undefined;
    const below = slot < arr.length ? weightOf(arr[slot]) : undefined;

    if (above !== undefined && below !== undefined) {
      return above > below ? below + (above - below) / 2 : above;
    }
    if (below !== undefined) {
      return below + 1000; // insert at the very front
    }
    if (above !== undefined) {
      return above - 1000; // insert at the very end
    }
    return 0;
  }

  /**
   * Re-sort the pipeline by weight (descending), tie-broken by registration
   * order (`createAt`).
   */
  private _sortByWeight(): void {
    this.state._processors.sort(
      (a, b) => b.weight - a.weight || a.createAt - b.createAt,
    );
  }

  /**
   * Remove a processor from this instance's pipeline by its id.
   *
   * Works on both custom processors (added via {@link addProcessor} or the
   * constructor's `processors` option) and built-in processors. Removing a
   * built-in processor alters keyboard behavior — for example, removing
   * `"modal"` disables the modal barrier entirely. The engine keeps
   * functioning normally (no error is thrown), but that pipeline stage is
   * gone; call {@link resetProcessors} to restore the defaults.
   *
   * The removal is immediate — the next {@link processKey} call uses the
   * updated pipeline — and the removed id can be reused immediately by
   * {@link addProcessor}.
   *
   * @param processorId - The `id` of the processor to remove.
   * @returns `true` if the processor was found and removed, `false` if no
   *          processor with the given id exists.
   */
  removeProcessor(processorId: string): boolean {
    const idx = this.state._processors.findIndex(
      (each) => each.id === processorId,
    );

    if (idx === -1) {
      return false;
    }

    this.state._processors.splice(idx, 1);
    return true;
  }

  /**
   * Return a read-only snapshot of the current processor pipeline.
   *
   * Useful for debugging and introspection. The array is the live pipeline
   * (not a copy) — it includes inactive processors, which are never removed
   * from the pipeline array by kick/activate toggles.
   */
  getProcessors(): readonly PipelineProcessor<TComponent>[] {
    return this.state._processors;
  }

  /**
   * Restore the processor pipeline to the default 9-stage chain.
   *
   * Removes all custom processors — any processor state they held is lost.
   * The built-in processors are rebuilt fresh with `active: true`, so any
   * kick/activate state is cleared by a reset.
   */
  resetProcessors(): void {
    this.state._processors = this._buildDefaultProcessors();
  }

  /**
   * Re-enable a processor by flipping its `active` flag back on. The
   * processor resumes normal operation on the next {@link processKey}
   * call.
   *
   * Neither this method nor {@link kickProcessor} changes the pipeline
   * array — {@link getProcessors} returns the same list regardless of
   * kick/activate state. Only `removeProcessor` and `resetProcessors`
   * alter the pipeline array.
   *
   * @param id - The processor id to re-enable (built-in or custom).
   * @returns `true` if the processor was re-activated, `false` if it was
   *          already active or no processor with that id exists.
   */
  activeProcessor(id: string): boolean {
    const target = this.state._processors.find((p) => p.id === id);
    if (!target || target.active) {
      return false;
    }
    target.active = true;
    return true;
  }

  /**
   * Disable a processor at runtime without removing it from the pipeline
   * by flipping its `active` flag off.
   *
   * The processor is skipped on the next {@link processKey} call — it is
   * excluded before `process()` runs, so the key event falls through to
   * the next pipeline stage as if the disabled processor did not exist.
   * Works on both built-in stages and custom processors added via
   * {@link addProcessor}.
   *
   * @param id - The processor id to disable (built-in or custom).
   * @returns `true` if the processor was kicked, `false` if it was
   *          already inactive or no processor with that id exists.
   */
  kickProcessor(id: string): boolean {
    const target = this.state._processors.find((p) => p.id === id);
    if (!target || !target.active) {
      return false;
    }
    target.active = false;
    return true;
  }

  /**
   * Reassign a processor's priority weight at runtime and re-sort the
   * pipeline, letting applications reorder stages without removing and
   * re-adding them.
   *
   * Higher weight runs first. Ties keep the original registration order
   * (`createAt` is unchanged), so setting two processors to the same weight
   * keeps whichever was registered earlier ahead. The processor's `active`
   * flag is untouched.
   *
   * Works on both built-in stages and custom processors. Use
   * {@link builtinProcessorWeights} as a reference when computing a target
   * weight (e.g. `builtinProcessorWeights.modal - 1` to run just after the
   * modal barrier).
   *
   * @param id - The processor id to re-weight (built-in or custom).
   * @param weight - The new weight.
   * @returns `true` if the processor was found and updated, `false` if no
   *          processor with that id exists.
   */
  setProcessorWeight(id: string, weight: number): boolean {
    const target = this.state._processors.find((p) => p.id === id);
    if (!target) {
      return false;
    }
    target.weight = weight;
    this._sortByWeight();
    return true;
  }
}
