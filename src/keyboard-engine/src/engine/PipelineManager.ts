import { createModalProcessor } from "../processors/modal.js";
import { createCompositionProcessor } from "../processors/globalComposition.js";
import { createGlobalSequenceProcessor } from "../processors/globalSequence.js";
import { createGlobalKeyProcessor } from "../processors/globalKey.js";
import { createLayerProcessor } from "../processors/layer.js";
import { createScreenStackProcessor } from "../processors/screenStack.js";
import { _insertRelative, BuiltinProcessorId } from "../pipeline/chain.js";
import EngineState from "./EngineState.js";
import { KeyboardProcessorProps, PipelineProcessor } from "../types/processor.js";

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
 * {@link addProcessor} (or the constructor's `processors` prop), and the
 * built-in stages can be temporarily disabled via {@link kickProcessor}.
 * All pipeline state is **per-instance** — each `KeyboardEngine` manages
 * its own pipeline independently.
 */
export default class PipelineManager<TComponent> {
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
	 * When `custom` processors are provided they are merged into the chain
	 * via `_insertRelative`, which positions each entry by `index`,
	 * `target` + `position`, or appends when neither is given.
	 */
	_buildDefaultProcessors(
		custom?: KeyboardProcessorProps<TComponent>[],
	): PipelineProcessor<TComponent>[] {
		const defaults: PipelineProcessor<TComponent>[] = [
			createModalProcessor(),
			createCompositionProcessor({ affectOverlay: true }),
			createGlobalSequenceProcessor({ affectOverlay: true }),
			createGlobalKeyProcessor({ affectOverlay: true }),
			createLayerProcessor(),
			createCompositionProcessor({ affectOverlay: false }),
			createGlobalSequenceProcessor({ affectOverlay: false }),
			createGlobalKeyProcessor({ affectOverlay: false }),
			createScreenStackProcessor(),
		];

		if (!custom || custom.length === 0) return defaults;

		return _insertRelative(defaults, custom);
	}

	/**
	 * Insert a custom processor into this engine instance's pipeline.
	 *
	 * Positioning options (checked in order):
	 * - `{ index: n }` — insert at the given 0-based index
	 * - `{ before: "id" }` / `{ after: "id" }` — insert relative to a named
	 *   processor (any built-in id, e.g. `"modal"`, `"layer"`)
	 * - omitted — append to the end of the pipeline
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
		processor: PipelineProcessor<TComponent>,
		options?: { before?: string } | { after?: string } | { index?: number },
	): void {
		if (this.state._processors.some((p) => p.id === processor.id)) {
			throw new Error(
				`[ink-cartridge] Cannot add processor "${processor.id}": duplicate id`,
			);
		}

		const opts = options ?? {};

		if ("index" in opts && typeof opts.index === "number") {
			this.state._processors.splice(opts.index, 0, processor);
			return;
		}

		const target =
			"before" in opts ? opts.before : "after" in opts ? opts.after : undefined;

		if (target) {
			const kind = "before" in opts ? "before" : "after";
			const idx = this.state._processors.findIndex((p) => p.id === target);
			if (idx === -1) {
				throw new Error(
					`[ink-cartridge] Cannot insert ${kind} "${target}": processor not found`,
				);
			}
			this.state._processors.splice(
				kind === "before" ? idx : idx + 1,
				0,
				processor,
			);
			return;
		}

		this.state._processors.push(processor);
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
	 * (not a copy) — it includes kicked processors, which are never removed
	 * from the pipeline array by kick/activate toggles.
	 */
	getProcessors(): readonly PipelineProcessor<TComponent>[] {
		return this.state._processors;
	}

	/**
	 * Restore the processor pipeline to the default 9-stage chain.
	 *
	 * Removes all custom processors — any processor state they held is lost.
	 * Does NOT clear the kicked list (`noActiveProcessor`): processors
	 * disabled via {@link kickProcessor} remain disabled after a reset;
	 * call {@link activeProcessor} to re-enable them.
	 */
	resetProcessors(): void {
		this.state._processors = this._buildDefaultProcessors();
	}

	/**
	 * Re-enable a previously kicked built-in processor by removing it from
	 * the disabled list (`noActiveProcessor`). The processor resumes normal
	 * operation on the next {@link processKey} call.
	 *
	 * Neither this method nor {@link kickProcessor} changes the pipeline
	 * array — {@link getProcessors} returns the same list regardless of
	 * kick/activate state. Only `removeProcessor` and `resetProcessors`
	 * alter the pipeline array.
	 *
	 * @param id - The built-in processor id to re-enable.
	 * @returns `true` if the processor was re-activated, `false` if it was
	 *          already active (no-op).
	 */
	activeProcessor(id: BuiltinProcessorId) {
        if (this.state.noActiveProcessor.includes(id)){
            const index = this.state.noActiveProcessor.indexOf(id)

            if (index === -1) {
                return false
            }

            this.state.noActiveProcessor.splice(index, 1)
            return true
        }

        return false
    }

    /**
     * Disable a built-in processor at runtime without removing it from the
     * pipeline.
     *
     * The id is pushed into the disabled list (`noActiveProcessor`), which
     * {@link buildPipelineContext} passes to every processor as
     * `ctx.noActiveProcessor`. Each built-in processor factory checks
     * `ctx.noActiveProcessor.includes(this.id)` as the first guard in its
     * `process()` method and returns `false` immediately — the key event
     * falls through to the next pipeline stage as if the kicked processor
     * did not exist.
     *
     * @param id - The built-in processor id to disable.
     * @returns `true` if the processor was kicked, `false` if it was
     *          already in the disabled list (no-op).
     */
    kickProcessor(id: BuiltinProcessorId) {
        if (this.state.noActiveProcessor.includes(id)) {
            return false
        }

        this.state.noActiveProcessor.push(id)
        return true
    }
}
