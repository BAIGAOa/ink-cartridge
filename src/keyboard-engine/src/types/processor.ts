import CompositionEngine from "../CompositionEngine.js";
import {
  ResolvedGlobalKeyEntry,
  ResolvedGlobalSequenceEntry,
} from "./entry.js";
import { KeyboardLayer } from "./keyboard-layer.js";
import { LayerKeyboardLayer, PageKeyboardLayer } from "./page-layer.js";
import { GlobalPendingSequence } from "./pending-sequence.js";

/**
 * A mutable reference used to share engine state with pipeline stages.
 */
export type MutableRef<T> = {
  /** The wrapped value, mutable by any holder of the reference. */
  current: T;
};

/**
 * Snapshot of all mutable state needed to process a single key event
 * through the keyboard pipeline.
 *
 * Created once per event by {@link KeyboardEngine.buildPipelineContext}.
 * Immutable snapshot fields reflect the state at the moment the event
 * arrived; mutable coordination fields allow cross-processor communication
 * within a single pipeline run.
 */
export interface PipelineContext<TComponent> {
  /** Raw input string from the terminal (empty for special keys). */
  readonly input: string;
  /** Raw key descriptor object (Ink's `useInput` second argument). */
  readonly key: unknown;
  /** Normalized key names to match (e.g. `"s"`, `"ctrl+q"`). */
  readonly eventNames: string[];
  /** Predicate deciding whether a key is a normal printable character. */
  readonly isNormalChar: (key: unknown) => boolean;
  /** The topmost component in the page stack, or null when no page is registered. */
  readonly topComponent: TComponent | null;
  /** Resolved global single-key entries. */
  readonly globalKeys: ResolvedGlobalKeyEntry[];
  /** Resolved global sequence entries. */
  readonly globalSequences: ResolvedGlobalSequenceEntry[];
  /** Whether wildcard `*` bindings take priority over other bindings. */
  readonly wildcardFirst: boolean;
  /** The current page stack, bottom to top. */
  readonly pagePath: TComponent[];

  /** Snapshot of all open non-modal layers. */
  readonly allLayers: KeyboardLayer[];
  /** Snapshot of all open modal layers. */
  readonly allModalLayers: KeyboardLayer[];

  // Mutable refs (shared with the engine instance).
  /** Component or page-id → page keyboard data. */
  readonly layersRef: Map<unknown | string, PageKeyboardLayer>;
  /** Layer-id → keyboard data for all elements registered on that layer. */
  readonly layerKeyboardRefs: Map<string, LayerKeyboardLayer>;
  /** The active global pending sequence, if any. */
  readonly pendingSeqRef: MutableRef<GlobalPendingSequence | null>;
  /** Notifies the engine that focus changed. */
  readonly notifyFocusChange: () => void;
  /** Notifies the engine that pending-sequence state changed. */
  readonly notifyPendingSyncs: () => void;
  /** The active mode name, or null when no mode is set. */
  readonly currentMode: string | null;
  /** Named conditions currently active. */
  readonly conditions: Map<string, boolean>;
  /** Whether a composition chain is currently being handled. */
  readonly compositionEngineHandler: boolean;
  /** The shared composition engine instance. */
  readonly compositionEngine: CompositionEngine;
  /** Whether the engine auto-handles Tab/Shift+Tab for focus rotation. */
  readonly autoTab: boolean;
  /** Key name used for Tab auto-focus rotation. */
  readonly autoTabKey: string;
}

/**
 * A single stage in the keyboard event pipeline.
 *
 * This is the runtime shape the engine stores: the fields beyond `id` and
 * `process` are stamped by the engine when a processor is registered, so
 * callers never construct one of these directly — use {@link ProcessorInput}
 * with {@link KeyboardEngine.addProcessor} and let the engine fill the rest.
 *
 * Each processor evaluates whether it should handle the current event. If it
 * consumes the event it returns `true` and the chain stops; otherwise it
 * returns `false` to pass the event to the next processor.
 *
 * @example
 * ```ts
 * // A stored processor after addProcessor has stamped the runtime fields
 * const p: PipelineProcessor<Comp> = {
 *   id: 'keystroke-logger',
 *   process(ctx) { return false; },
 *   active: true,
 *   weight: 0,
 *   createAt: 3,
 * };
 * ```
 */
export interface PipelineProcessor<TComponent> {
  /**
   * Process one key event.
   *
   * @param ctx - Snapshot of the engine state for this event.
   * @returns `true` to consume the event and stop the pipeline,
   *          `false` to pass it to the next processor.
   */
  process(ctx: PipelineContext<TComponent>): boolean;
  /** Built-in processor id or custom name, unique in the pipeline and usable
   *  as an insertion target or for kick/activate toggles. */
  id: string;
  /** Whether the stage runs. `processKey` skips stages with `active: false`. */
  active: boolean;
  /** Priority — higher runs first; equal weights are ordered by registration time. */
  weight: number;
  /** Registration order, stamped by the engine; breaks weight ties (earlier first). */
  createAt: number;
}

/**
 * What a caller hands to {@link KeyboardEngine.addProcessor} before the engine
 * stamps runtime state.
 *
 * Only `id` and `process` are required. Priority is expressed through
 * `addProcessor`'s `options` (`weight`, or a `before`/`after`/`index` sugar),
 * and `createAt` is injected by the engine as the registration order used to
 * break weight ties. The engine normalizes this into a full
 * {@link PipelineProcessor}, so stored processors always carry `weight`,
 * `createAt`, and `active`.
 */
export interface ProcessorInput<TComponent> {
  /**
   * Process one key event.
   *
   * @param ctx - Snapshot of the engine state for this event.
   * @returns `true` to consume the event and stop the pipeline,
   *          `false` to pass it to the next processor.
   */
  process(ctx: PipelineContext<TComponent>): boolean;
  /** Processor id (built-in or custom); must be unique in the pipeline. */
  id: string;
  /** Whether the processor runs. Defaults to `true`. */
  active?: boolean;
}

/**
 * Per-instance custom processor injection for the engine.
 *
 * Supports the same positioning as {@link KeyboardEngine.addProcessor}:
 * - `{ processor, target, position }` — insert before/after a named processor (built-in or custom)
 * - `{ processor, index }`             — insert at a 0-based position
 * - `{ processor }`                     — append to the end of the chain
 */
export interface KeyboardProcessorProps<TComponent> {
  /** The custom processor to inject into the pipeline. */
  processor: ProcessorInput<TComponent>;
  /** Target processor ID to insert relative to. Use with {@link position}. */
  target?: string;
  /** Insert before or after {@link target}. */
  position?: "before" | "after";
  /** Insert at this 0-based index. Overrides target/position. */
  index?: number;
}
