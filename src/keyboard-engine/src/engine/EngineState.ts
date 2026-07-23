import {
  EngineModalEntry,
  EngineOverlayEntry,
  GlobalPendingSequence,
  KeyboardProcessorProps,
  MutableRef,
  PipelineProcessor,
  ResolvedGlobalKeyEntry,
  ResolvedGlobalSequenceEntry,
  ScreenKeyboardLayer,
} from "../types.js";
import type CompositionEngine from "../CompositionEngine.js";

/**
 * Configuration passed to {@link KeyboardEngine} at construction time.
 */
export interface EngineProps<TComponent> {
  /** Registered mode names (e.g. `["normal", "insert"]`). */
  modes?: string[];
  /** Default mode — must be null (no-mode) or a member of `modes`. */
  defaultMode?: string;
  /** Per-instance custom processors injected into the pipeline at init time. */
  processors?: KeyboardProcessorProps<TComponent>[];
  /**
   * Converts a framework-specific key event into normalized key-name strings
   * for matching. Required so the engine stays framework-agnostic — each host
   * framework provides its own adapter.
   *
   * @example Ink
   * ```ts
   * normalizeKeyNames: (input, key) => normalizeKeyNames(input, key as Key)
   * ```
   * @example Vue
   * ```ts
   * normalizeKeyNames: (input, key) => {
   *   const e = key as KeyboardEvent
   *   return [e.key.toLowerCase()]
   * }
   * ```
   */
  normalizeKeyNames: (input: string, key: unknown) => string[];

  /**
   * Determines whether a key event should match the wildcard `"*"` binding.
   *
   * The engine calls this predicate on every `"*"` match attempt. It should
   * return `true` when the key is a special key (arrows, return, escape, tab,
   * backspace, delete, pageup, pagedown, home, end), a modifier key (ctrl,
   * meta, super, hyper), or a release event — in other words, anything that
   * is NOT a normal text character.
   *
   * Required so the engine stays framework-agnostic — each host framework
   * provides its own adapter that knows its Key shape.
   *
   * @example Ink
   * ```ts
   * isNormalChar: (input, key) => isNormalCharacter(input, key, k =>
   *   k.upArrow || k.downArrow || k.leftArrow || k.rightArrow
   *   || k.pageDown || k.pageUp || k.home || k.end
   *   || k.return || k.escape || k.tab || k.backspace || k.delete
   *   || k.ctrl || k.meta || k.super || k.hyper
   *   || k.eventType === 'release'
   * )
   * ```
   */
  isNormalChar: (key: unknown) => boolean;

  /**
   * Whether the engine automatically handles Tab / Shift+Tab for focus
   * rotation. Defaults to `false`.
   *
   * When `true`, the engine intercepts Tab/Shift+Tab and cycles focus
   * automatically. When `false` or `undefined`, developers must call
   * `focusNext` / `focusPrev` manually.
   */
  autoTab?: boolean;
}

export default class EngineState<TComponent> {
  /**
   * Current navigation path from root to active screen.
   * Updated by {@link sync}.
   */
  path: TComponent[] = [];
  /** Set of overlay IDs currently receiving keyboard events. */
  activeOverlayIds: Set<string> = new Set();
  /** All open overlays, sorted by zIndex ascending. */
  displayedOverlays: EngineOverlayEntry[] = [];
  /** ID of the currently active modal (highest zIndex), or null. */
  activeModalIdRef: string | null = null;
  /** All open modals, sorted by zIndex ascending. */
  displayedModalsRef: EngineModalEntry[] = [];

  /** Set of registered mode names. */
  modesRef: Set<string>;
  /** Currently active mode, or null (no-mode). */
  currentModeRef: string | null;

  /**
   * Named boolean conditions used by `when: "conditionId"` in binding options.
   * Stored separately from modes because conditions are evaluated per-key
   * (dynamic toggles) while mode is a single global state.
   */
  conditions: Map<string, boolean> = new Map();

  globalKeysRef: ResolvedGlobalKeyEntry[] = [];
  /**
   * Registered listeners notified whenever the active focus target changes.
   * Used by UI components to re-render focus indicators.
   */
  focusSubscribersRef: Set<() => void> = new Set<() => void>();
  /**
   * Registered sync callbacks from {@link currentScreenHasSequenceWaiting}
   * and {@link thereGlobalQueueWaiting}. Called after each
   * {@link processKey} so the host framework can re-render.
   */
  pendingSyncs: Set<() => void> = new Set<() => void>();
  /**
   * Reference count for wildcard-priority mode.
   * When > 0, `"*"` bindings fire before exact-key bindings.
   * Multiple callers can enable independently; the mode disables at 0.
   */
  wildcardPriorityCountRef: number = 0;

  /** Registered global multi-key sequences. */
  globalSequencesRef: ResolvedGlobalSequenceEntry[] = [];

  /**
   * Currently pending global sequence state.
   * Written directly by the global-sequence processor between consecutive
   * key presses; must be mutable and shared across pipeline invocations.
   */
  globalPendingSeqRef: GlobalPendingSequence | null = null;

  /**
   * Maps actionId → { action, keys }.
   * The actionId is the map key, NOT stored in the value — if it were, a
   * stale reference to an old key could leak through typed access.
   */
  shortcutOperationsRef: Map<string, { action: () => void; keys?: string[] }> =
    new Map();

  /**
   * Maps sequenceActionId → { action, keys, timeout }.
   * Same key-not-in-value pattern as shortcutOperationsRef.
   */
  sequenceOperationsRef: Map<
    string,
    { action: () => void; keys?: string[]; timeout?: number }
  > = new Map();

  /**
   * Owner stack — top of stack is the current "owner" for keyboard bindings.
   * Overlays push their ID onto this stack so that `getCurrentOwner()` returns
   * the overlay instead of the underlying screen during overlay rendering.
   */
  ownerStackRef: (TComponent | string)[] = [];

  /**
   * All keyboard layers, keyed by component or overlay/modal ID.
   * Layers are created lazily by {@link getLayer} and cleaned up by
   * {@link cleanLayers}, {@link cleanOverlayLayers}, and {@link cleanModalLayers}.
   */
  layersRef: Map<TComponent | string, ScreenKeyboardLayer> = new Map();

  /** The active processor pipeline for this engine instance. */
  _processors: PipelineProcessor<TComponent>[] = [];

  /** The host-provided key-name normalizer, wired at construction. */
  _normalizeKeyNames: (input: string, key: unknown) => string[];

  /** The host-provided normal-character checker, wired at construction. */
  _isNormalChar: (key: unknown) => boolean;

  /**
   * Persistent wrapper for `layersRef` so pipeline processors see the same
   * Map across invocations. Processors mutate the Map in place (get/set/delete),
   * so reassignment is never needed — a plain `{ current }` object is sufficient.
   */
  _layersWrapper: MutableRef<Map<unknown | string, ScreenKeyboardLayer>>;
  /**
   * Persistent wrapper for `globalPendingSeqRef` that propagates writes back
   * to the engine property. Uses a getter/setter because the global-sequence
   * processor reassigns `pendingSeqRef.current` (it does NOT mutate in place),
   * and without write-back the next `processKey` call would see a stale value.
   */
  _pendingSeqWrapper: MutableRef<GlobalPendingSequence | null>;

  /**
   * Indicates which processor is waiting to process the sequence at this point
   */
  compositionEngineHandle: boolean = false;

  /** Whether the engine auto-handles Tab/Shift+Tab for focus rotation. */
  autoTab: boolean;

  /** The composition engine instance, assigned by KeyboardEngine after construction. */
  compositionEngine!: CompositionEngine<TComponent>;

  noActiveProcessor: string[] = []

  constructor(props: EngineProps<TComponent>) {
    this.modesRef = new Set(props.modes ?? []);
    this.currentModeRef = props.defaultMode ?? null;
    this._normalizeKeyNames = props.normalizeKeyNames;
    this._isNormalChar = props.isNormalChar;
    this.autoTab = props.autoTab ?? false;
    this._layersWrapper = { current: this.layersRef };
    const self = this;
    this._pendingSeqWrapper = {
      get current() {
        return self.globalPendingSeqRef;
      },
      set current(v) {
        self.globalPendingSeqRef = v;
      },
    };
  }
}
