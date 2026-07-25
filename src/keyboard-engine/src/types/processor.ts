import CompositionEngine from "../CompositionEngine.js";
import { BuiltinProcessorId } from "../pipeline/chain.js";
import { ResolvedGlobalKeyEntry, ResolvedGlobalSequenceEntry } from "./entry.js";
import { PageKeyboardLayer } from "./page-layer.js";
import { GlobalPendingSequence } from "./pending-sequence.js";


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
  readonly input: string;
  readonly key: unknown;
  readonly eventNames: string[];
  readonly isNormalChar: (key: unknown) => boolean;
  readonly topComponent: TComponent | null;
  readonly globalKeys: ResolvedGlobalKeyEntry[];
  readonly globalSequences: ResolvedGlobalSequenceEntry[];
  readonly wildcardFirst: boolean;
  readonly pagePath: TComponent[];

  readonly elementsFromAllLayers: Map<string, PageKeyboardLayer[]>
  readonly elementsFromAllModalLayers: Map<string, PageKeyboardLayer[]>

  // --- Mutable refs (shared with engine instance) ---
  readonly layersRef: Map<unknown | string, PageKeyboardLayer>;
  readonly pendingSeqRef: GlobalPendingSequence | null;
  readonly notifyFocusChange: () => void;
  readonly notifyPendingSyncs: () => void;
  readonly currentMode: string | null;
  readonly conditions: Map<string, boolean>;
  readonly compositionEngineHandler: boolean;
  /** The shared composition engine instance. */
  readonly compositionEngine: CompositionEngine;
  /** Whether the engine auto-handles Tab/Shift+Tab for focus rotation. */
  readonly autoTab: boolean;
  readonly noActiveProcessor: string[]
}

/**
 * A single stage in the keyboard event pipeline.
 *
 * Each processor evaluates whether it should handle the current event.
 * If it consumes the event it returns `true` and the chain stops;
 * otherwise it returns `false` to pass the event to the next processor.
 */
export interface PipelineProcessor<TComponent> {
  process(ctx: PipelineContext<TComponent>): boolean;
  id: string;
}

/**
 * Per-instance custom processor injection for the engine.
 *
 * Supports the same positioning as {@link KeyboardEngine.addProcessor}:
 * - `{ processor, target, position }` — insert before/after a built-in processor
 * - `{ processor, index }`              — insert at a 0-based position
 * - `{ processor }`                      — append to the end of the chain
 */
export interface KeyboardProcessorProps<TComponent> {
  processor: PipelineProcessor<TComponent>;
  /** Target built-in processor ID. Use with {@link position}. */
  target?: BuiltinProcessorId;
  /** Insert before or after {@link target}. */
  position?: "before" | "after";
  /** Insert at this 0-based index. Overrides target/position. */
  index?: number;
}
