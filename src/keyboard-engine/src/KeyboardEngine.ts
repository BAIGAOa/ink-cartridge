import EngineState from "./engine/EngineState.js";
import LayerManager from "./engine/LayerManager.js";
import PipelineManager from "./engine/PipelineManager.js";
import BindingService from "./engine/BindingService.js";
import OperationRegistry from "./engine/OperationRegistry.js";
import MouseRegionService from "./engine/MouseRegionService.js";
import CompositionEngine, {
  CompositioKey,
  ValueSchema,
  Flags,
  CompositionEvent,
  MappingKeyEvent,
  MappingKeyEntry,
} from "./CompositionEngine.js";
import { BuiltinProcessorId } from "./pipeline/chain.js";
import { SyncState } from "./types/state-sync.js";
import { HoveredRegion, MouseRegionEntry } from "./types/mouse-region.js";
import type { MouseEvent as XtermMouseEvent } from "./xterm-mouse/types/index.js";
import {
  GlobalKeyEntry,
  GlobalSequenceEntry,
  ResolvedGlobalKeyEntry,
  ResolvedGlobalSequenceEntry,
  SequenceOperationEntry,
  ShortcutOperationEntry,
} from "./types/entry.js";
import { GlobalPendingSequence } from "./types/pending-sequence.js";
import {
  KeyboardProcessorProps,
  PipelineContext,
  PipelineProcessor,
} from "./types/processor.js";
import { KeyHandler } from "./types/binding.js";
import { FocusSetOptions } from "./types/focus.js";
import {
  AllowModalOptions,
  BoundKeyboardOptions,
  ModalMissOptions,
  PenetrationOptions,
  SequenceOptions,
  StopOptions,
} from "./types/options.js";
import { ModalMissCallback } from "./types/modal.js";

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
   * Determines whether a key is a special key (NOT a normal character).
   *
   * Required so the engine stays framework-agnostic — each host framework
   * provides its own adapter that inspects its native Key shape.
   *
   * @example Ink
   * ```ts
   * isNormalChar: (key) => {
   *   const k = key as Record<string, unknown>;
   *   return k.upArrow || k.downArrow || k.leftArrow || k.rightArrow
   *     || k.pageDown || k.pageUp || k.home || k.end
   *     || k.return || k.escape || k.tab || k.backspace || k.delete
   *     || k.ctrl || k.meta || k.super || k.hyper
   *     || k.eventType === 'release';
   * }
   * ```
   */
  isNormalChar: (key: unknown) => boolean;

  /**
   * Default composition chain timeout in ms. Defaults to 400.
   */
  defaultTimeout?: number;

  /**
   * Optional runtime type schema for composition chain value validation.
   *
   * Maps flag names to type guard functions. When provided, the
   * CompositionEngine validates every execute callback's input and
   * output values at runtime. Validation failures clear the pending
   * chain and emit a `console.warn` in development.
   *
   * @example
   * ```ts
   * const engine = new KeyboardEngine({
   *   normalizeKeyNames,
   *   valueSchema: {
   *     times: (v): v is number => typeof v === 'number',
   *     action: (v): v is number => typeof v === 'number',
   *   },
   * });
   * ```
   */
  valueSchema?: ValueSchema;

  /**
   * Whether the engine automatically handles Tab / Shift+Tab for focus
   * rotation. Defaults to `false`.
   *
   * When `true`, the engine intercepts Tab/Shift+Tab and cycles focus
   * automatically. When `false` or `undefined`, developers must call
   * `focusNext` / `focusPrev` manually.
   */
  autoTab?: boolean;

  /**
   * Override the key name used for automatic focus rotation when
   * {@link autoTab} is `true`.
   *
   * The value must be a key name that {@link normalizeKeyNames} can
   * produce — the engine matches via `eventNames.includes(thisKey)`,
   * so the string must exactly match a normalized name the adapter emits.
   *
   * When omitted, the engine defaults to `"tab"` (and `"shift+tab"`
   * for reverse rotation). Provide a custom value when your host
   * framework's key normalizer produces a different name (e.g. `"Tab"`
   * with capital T, or `"<Tab>"`).
   *
   * @example
   * ```ts
   * // Ink's normalizeKeyNames emits lowercase "tab", so the default works.
   * // A framework that normalizes to "Tab" would need:
   * new KeyboardEngine({
   *   normalizeKeyNames,
   *   autoTab: true,
   *   tabKey: "Tab",
   * });
   * ```
   */
  tabKey?: string
}

/**
 * Framework-agnostic keyboard state machine.
 *
 * Owns all mutable keyboard state — bindings, layers, focus targets, global
 * keys, modes, conditions, and the processor pipeline — without depending on
 * any specific UI framework. A host framework (React, Vue, Blessed, etc.)
 * creates an instance, calls {@link sync} on each render to push page-path,
 * layer, and modal-layer state, and calls {@link processKey} for every
 * keyboard event.
 *
 * The generic `TComponent` represents the host framework's component type.
 * It defaults to `unknown` so the engine never constrains the host — all
 * framework-specific detail lives in the `normalizeKeyNames` adapter and
 * the custom processors.
 *
 * @typeParam TComponent - The host framework's component reference type.
 *
 * @example React (via KeyboardProvider)
 * ```tsx
 * const engine = useRef(new KeyboardEngine({
 *   modes: ['normal', 'insert'],
 *   normalizeKeyNames,
 * })).current;
 *
 * engine.sync({
 *   pagePath: ['app'],
 *   layers: [],
 *   modalLayers: [],
 * });
 * useInput((input, key) => engine.processKey(input, key));
 * ```
 *
 * @example Standalone (Node.js, no framework)
 * ```ts
 * import { KeyboardEngine } from '@cartridge-engine/keyboard-engine';
 * import * as readline from 'node:readline';
 *
 * function isSpecialKey(key: unknown): boolean {
 *   const k = key as Record<string, unknown>;
 *   return !!(k.ctrl || k.meta || k.shift || k.name === 'escape' || k.name === 'tab');
 * }
 *
 * const engine = new KeyboardEngine({
 *   isNormalChar: isSpecialKey,
 *   normalizeKeyNames: (input, key) => {
 *     const k = key as Record<string, unknown>;
 *     if (k.ctrl && k.name) return [`ctrl+${k.name}`];
 *     return [k.name ? String(k.name) : input];
 *   },
 * });
 *
 * engine.sync({ pagePath: ['app'], layers: [], modalLayers: [] });
 *
 * engine.boundKeyboard(['ctrl+c'], () => {
 *   console.log('Goodbye!');
 *   process.exit(0);
 * });
 *
 * readline.emitKeypressEvents(process.stdin);
 * if (process.stdin.isTTY) process.stdin.setRawMode(true);
 * process.stdin.on('keypress', (_input, key) => {
 *   engine.processKey(_input ?? '', key);
 * });
 *
 * // Mouse events (from the bundled Mouse helper) are fed the same way:
 * // mouse.on('click', (event) => engine.processMouseEvent(event));
 * ```
 */
export default class KeyboardEngine<TComponent = unknown> {
  private state: EngineState<TComponent>;
  private layers: LayerManager<TComponent>;
  private pipeline: PipelineManager<TComponent>;
  private bindings: BindingService<TComponent>;
  private registry: OperationRegistry<TComponent>;
  private mouseRegions: MouseRegionService;

  /**
   * Create a new engine instance.
   *
   * Builds the internal state tree: `EngineState` (path, layer/modal-layer
   * ids, modes, conditions, global keys/sequences, operation registries,
   * owner stack), `LayerManager`, `PipelineManager` (the built-in 9-stage
   * chain plus any custom `processors`), `BindingService`, `OperationRegistry`
   * and the `CompositionEngine` (initialized with `defaultTimeout` and
   * `valueSchema`).
   *
   * The instance is meant to persist for the lifetime of the host component —
   * store it in a stable reference (e.g. `useRef` in React, a class field in
   * Vue/Svelte).
   *
   * @param props - Engine configuration.
   *   `normalizeKeyNames` is required — the engine has no built-in default
   *   so each framework must provide its own adapter.
   *
   * @example
   * ```ts
   * const engine = new KeyboardEngine({
   *   normalizeKeyNames: (input, key) => {
   *     const k = key as Record<string, unknown>;
   *     return [k.name ? String(k.name) : input];
   *   },
   *   isNormalChar: (key) => {
   *     const k = key as Record<string, unknown>;
   *     return !!(k.ctrl || k.meta || k.escape || k.tab || k.upArrow || k.downArrow);
   *   },
   *   modes: ['normal', 'insert'],
   *   defaultMode: 'normal',
   * });
   * ```
   */
  constructor(props: EngineProps<TComponent>) {
    this.state = new EngineState(props);
    this.layers = new LayerManager(this.state);
    this.pipeline = new PipelineManager(this.state, props.processors);
    this.bindings = new BindingService(this.state, this.layers);
    this.registry = new OperationRegistry(this.state, this.layers);
    this.mouseRegions = new MouseRegionService();
    this.state.compositionEngine = new CompositionEngine(
      this.state,
      props.defaultTimeout,
      props.valueSchema,
    );
  }

  /** The composition engine for composing multi-key compound actions. */
  get composition(): CompositionEngine<TComponent> {
    return this.state.compositionEngine;
  }

  /**
   * Register a composition key entry.
   * See {@link CompositionEngine#registryCompositionKey}.
   */
  registryCompositionKey(entry: CompositioKey<TComponent>) {
    return this.state.compositionEngine.registryCompositionKey(entry);
  }

  /**
   * Remove all composition entries registered under `key`.
   * See {@link CompositionEngine#removeCompositionKey}.
   */
  removeCompositionKey(key: string) {
    return this.state.compositionEngine.removeCompositionKey(key);
  }

  /** Clear all registered composition keys. */
  clearAllCompositionKeys() {
    this.state.compositionEngine.clearAllCompositionKeys();
  }

  /** Whether a composition chain is currently pending. */
  hasPendingComposition(): boolean {
    return this.state.compositionEngine.hasPending();
  }

  /** Return a copy of the current composition context. */
  getCompositionContext() {
    return this.state.compositionEngine.getContext();
  }

  /** Cancel the current composition chain immediately. */
  abortComposition() {
    this.state.compositionEngine.abort();
  }

  /**
   * Set or replace the runtime value schema for composition chain validation.
   * See {@link CompositionEngine#setValueSchema}.
   */
  setValueSchema(schema: ValueSchema) {
    this.state.compositionEngine.setValueSchema(schema);
  }

  /**
   * Undo one or more completed composition sequences.
   * See {@link CompositionEngine#undo}.
   * @param steps - Number of past sequences to undo. Defaults to 1.
   * @param options.isolated - When true, each sequence's ctx is isolated.
   * @returns The final context after undo, or `null` if nothing was undone.
   * @throws If `steps` exceeds the number of buffered sequences.
   */
  undoComposition(
    steps?: number,
    options?: { isolated?: boolean; byKey?: boolean },
  ) {
    return this.state.compositionEngine.undo(steps, options);
  }

  /** Number of completed sequences available for undo. */
  bufferedCompositionCount(): number {
    return this.state.compositionEngine.bufferedCount();
  }

  /** Clear all buffered undo history. */
  clearCompositionBuffers(): void {
    this.state.compositionEngine.clearBuffers();
  }

  /**
   * Subscribe to composition state changes. See {@link CompositionEngine#subscribe}.
   * @returns An unsubscribe function.
   */
  subscribeComposition(fn: () => void): () => void {
    return this.state.compositionEngine.subscribe(fn);
  }

  /**
   * Return the most recent composition event. See {@link CompositionEngine#getLastEvent}.
   */
  getLastCompositionEvent(): CompositionEvent | null {
    return this.state.compositionEngine.getLastEvent();
  }

  /**
   * Register a mapping key entry. See {@link CompositionEngine#addMapping}.
   *
   * @returns `true` if registered, `false` if `base` is empty, any `target`
   *          key is not registered, or an identical `base` already exists.
   */
  addMapping(
    base: string[],
    target: string[],
    options?: Omit<MappingKeyEntry<TComponent>, "keys" | "target">,
  ) {
    return this.state.compositionEngine.addMapping(base, target, options);
  }

  /**
   * Remove a mapping key entry by its exact key sequence.
   * See {@link CompositionEngine#removeMappingKey}.
   *
   * @returns `true` if found and removed, `false` otherwise.
   */
  removeMappingKey(keys: string[]) {
    return this.state.compositionEngine.removeMappingKey(keys);
  }

  /**
   * Remove all mapping key entries whose head key matches `firstKey`.
   * See {@link CompositionEngine#removeMapping}.
   *
   * @returns `true` if any entries were removed, `false` if the head key
   *          was not registered.
   */
  removeMapping(firstKey: string) {
    return this.state.compositionEngine.removeMapping(firstKey);
  }

  /**
   * Subscribe to mapping-key state changes. See {@link CompositionEngine#subscribeMapping}.
   * Independent from {@link subscribeComposition} — mapping events do not
   * fire composition subscribers and vice versa.
   *
   * @returns An unsubscribe function.
   */
  subscribeMapping(fn: () => void): () => void {
    return this.state.compositionEngine.subscribeMapping(fn);
  }

  /**
   * Return the most recent mapping-key event. See {@link CompositionEngine#getLastMappingEvent}.
   */
  getLastMappingEvent(): MappingKeyEvent | null {
    return this.state.compositionEngine.getLastMappingEvent();
  }

  /**
   * Update a composition entry identified by `key` + `flag`.
   * See {@link CompositionEngine#updateCompositionKey}.
   */
  updateCompositionKey(
    key: string,
    flags: Flags,
    updates: Partial<Omit<CompositioKey<TComponent>, "key" | "flags">>,
  ) {
    return this.state.compositionEngine.updateCompositionKey(
      key,
      flags,
      updates,
    );
  }

  /**
   * Push page-path, layer, and modal-layer state into the engine.
   *
   * The engine does not observe the host framework's component tree — it
   * relies on `sync` being called on every render to build an accurate
   * snapshot. Call this synchronously on every render (before any keyboard
   * events) so that {@link processKey} reads a fresh snapshot. Cleanup
   * methods ({@link cleanLayers}, etc.) should be called in a post-render
   * effect so they compare the pre- and post-sync state.
   *
   * The write is a direct field assignment — no merging, no diffing, no
   * incremental update. `layers` and `modalLayers` are expected sorted by
   * zIndex ascending.
   *
   * @param state - Current screen system state from the host framework.
   *
   * @example
   * ```ts
   * // Call synchronously on every render — before any processKey() calls
   * engine.sync({
   *   pagePath: getCurrentPath(),
   *   layers: getLayers(),
   *   modalLayers: getModalLayers(),
   * });
   *
   * // Post-render — remove keyboard data for detached pages/layers
   * engine.cleanLayers();
   * engine.cleanOverlayLayers();
   * engine.cleanModalLayers();
   * ```
   */
  sync(state: SyncState<TComponent>) {
    this.state.synchronizedData = state;
  }

  /**
   * Remove keyboard layers for screens that are no longer in the current path.
   *
   * This is the cleanup side of the {@link sync} lifecycle: `sync` pushes
   * new state, these methods remove stale state from the previous render
   * cycle. Designed to be called in a post-render effect (e.g. `useEffect`
   * in React) so they compare against the state pushed by the most recent
   * `sync`.
   *
   * Also clears any pending sequence timers on removed layers to prevent
   * stale timeouts from firing after the layer is gone.
   *
   * @example
   * ```ts
   * useEffect(() => { engine.cleanLayers(); }, [currentPath, engine]);
   * useEffect(() => { engine.cleanOverlayLayers(); }, [allLayers, engine]);
   * useEffect(() => { engine.cleanModalLayers(); }, [allModalLayers, engine]);
   * ```
   */
  cleanLayers() {
    this.layers.cleanPages();
  }
  /**
   * Remove element keyboards for layers that have been closed.
   * Only cleans keyboards whose layer owner is no longer present in the
   * synced `layers` state — pages and modal layers are left untouched.
   */
  cleanOverlayLayers() {
    this.layers.cleanLayers();
  }
  /**
   * Remove element keyboards for modal layers that have been closed.
   * Only cleans keyboards whose modal-layer owner is no longer present in
   * the synced `modalLayers` state.
   */
  cleanModalLayers() {
    this.layers.cleanModalLayers();
  }

  /**
   * Read a layer without creating it. Returns `undefined` when no layer
   * exists for the given owner.
   *
   * Unlike the other binding functions (which lazily create a layer when the
   * owner is missing), `readLayer` is strictly read-only.
   */
  readLayer(
    screenComponent: TComponent,
  ): ReturnType<LayerManager<TComponent>["readLayer"]>;
  readLayer(layerId: string): ReturnType<LayerManager<TComponent>["readLayer"]>;
  readLayer(
    layerId: string,
    elementId: string,
  ): ReturnType<LayerManager<TComponent>["readLayer"]>;
  readLayer(ownerOrLayer: TComponent | string, elementId?: string) {
    if (typeof ownerOrLayer !== "string") {
      return this.layers.readLayer(ownerOrLayer);
    }
    if (elementId) {
      return this.layers.readLayer(ownerOrLayer, elementId);
    }
    return this.layers.readLayer(ownerOrLayer);
  }

  /**
   * Push a new owner onto the owner stack so that keyboard bindings in
   * a layer or modal element are attributed to that layer rather than
   * the current top layer.
   *
   * The "current owner" is the top of the stack — every call to
   * {@link boundKeyboard}, {@link boundSequence}, {@link penetration},
   * {@link stop}, etc. registers on the layer belonging to the current owner.
   * Layer and modal-layer rendering code pushes the layer/modal-layer id
   * while rendering its children and pops it afterwards.
   *
   * @example
   * ```ts
   * // When rendering a layer:
   * engine.pushOwner(layerId);
   * // ... bindings inside the layer element register on the layer's keyboard
   * engine.popOwner(layerId);
   * ```
   */
  pushOwner(owner: TComponent | string) {
    this.layers.pushOwner(owner);
  }

  /**
   * Remove the most recent matching owner from the stack.
   * Uses `lastIndexOf` so nested owners of the same layer unwind correctly.
   */
  popOwner(owner: TComponent | string) {
    this.layers.popOwner(owner);
  }

  /**
   * Subscribe to focus changes. Returns an unsubscribe function.
   * Use this in UI frameworks to track when the active focus target moves
   * (e.g. Tab navigation, programmatic focusSet).
   */
  subscribeFocus(listener: () => void) {
    return this.layers.subscribeFocus(listener);
  }

  /**
   * Activate a named focus target on the current owner's layer.
   *
   * When `group` is omitted, the target is looked up in the layer's default
   * focus group ({@link defaultTargetsSymbol}). When `group` is provided, the
   * target is looked up in the named group — each group tracks its own active
   * focus independently, so multiple groups can hold focus simultaneously.
   *
   * @param focusId The focus target id to activate.
   * @param group   Optional focus group name. Defaults to the default group.
   * @throws If the current owner has no layer, the group is not registered,
   *         or the focus target is not found within the group.
   */
  focusSet(focusId: string, groupOrOptions?: string | FocusSetOptions) {
    if (typeof groupOrOptions === "string" || groupOrOptions === undefined) {
      this.layers.focusSet(focusId, groupOrOptions);
    } else {
      this.layers.focusSet(focusId, groupOrOptions);
    }
  }
  /**
   * Cycle to the next focus target within a group (Tab semantics).
   *
   * Wraps around. When `group` is omitted, cycles the default group's
   * {@link ScreenKeyboardLayer.defaultFocusOrder}; otherwise cycles the named
   * group's registration order. Only switches the active target — does not
   * activate a group that has no current focus.
   */
  focusNext(groupOrOptions?: string | FocusSetOptions) {
    if (typeof groupOrOptions === "string" || groupOrOptions === undefined) {
      this.layers.focusNext(groupOrOptions);
    } else {
      this.layers.focusNext(groupOrOptions);
    }
  }
  /**
   * Cycle to the previous focus target within a group (Shift+Tab semantics).
   *
   * Wraps around. See {@link focusNext} for the `group` parameter behavior.
   */
  focusPrev(groupOrOptions?: string | FocusSetOptions) {
    if (typeof groupOrOptions === "string" || groupOrOptions === undefined) {
      this.layers.focusPrev(groupOrOptions);
    } else {
      this.layers.focusPrev(groupOrOptions);
    }
  }
  /**
   * Query the currently active focus target for a group.
   *
   * Returns a discriminated union rather than a bare id so callers can
   * distinguish the "no owner / no layer / no focus / result" cases without
   * guessing. Check `.result?.id` for the active focus id, or one of
   * `.noOwner` / `.noLayer` / `.noFound` for the empty cases.
   *
   * @param group Optional focus group name. Defaults to the default group.
   */
  focusCurrent(groupOrOptions?: string | FocusSetOptions) {
    if (typeof groupOrOptions === "string" || groupOrOptions === undefined) {
      return this.layers.focusCurrent(groupOrOptions);
    }
    return this.layers.focusCurrent(groupOrOptions);
  }
  /**
   * Remove a focus target from the current owner's layer.
   *
   * If the removed target was the active one for its group, the first
   * remaining target (in registration order) is auto-activated. When no
   * targets remain in the group, that group's focus slot is cleared.
   *
   * Silently no-ops when the target or group is absent on the current
   * layer — during unmount, `sync()` has already advanced the path to the
   * new screen, so the focusId lives on the unmounting screen's layer
   * (which `cleanLayers()` removes shortly after).
   *
   * @param focusId The focus target id to remove.
   * @param group   Optional focus group name. Defaults to the default group.
   */
  focusUnregister(focusId: string, groupOrOptions?: string | FocusSetOptions) {
    if (typeof groupOrOptions === "string" || groupOrOptions === undefined) {
      this.layers.focusUnregister(focusId, groupOrOptions);
    } else {
      this.layers.focusUnregister(focusId, groupOrOptions);
    }
  }

  /**
   * Activate a focus target in a group that currently has no active focus.
   *
   * Unlike {@link focusSet} — which replaces a group's active target — this
   * method only succeeds when the group has no active entry yet. It is
   * designed for lazy activation: register focus targets early, then call
   * `activateFocusGroup` to give a group its initial focus on demand without
   * overwriting focus that was already established.
   *
   * Returns `false` (no-op) when the group already has an active target, or
   * when the owner, layer, group, or focus target is absent. Use
   * {@link focusSet} when you need to switch a group's active target
   * regardless of its current state.
   *
   * @param focusId The focus target id to activate.
   * @param group   Optional focus group name. Defaults to the default group.
   * @returns `true` if the target was activated, `false` if the group already
   *          had an active target or the target/group/layer could not be found.
   */
  activateFocusGroup(focusId: string, groupOrOptions?: string | FocusSetOptions) {
    if (typeof groupOrOptions === "string" || groupOrOptions === undefined) {
      return this.layers.activateFocusGroup(focusId, groupOrOptions);
    }
    return this.layers.activateFocusGroup(focusId, groupOrOptions);
  }

  /**
   * Remove a group's active focus entry from the current owner's layer.
   *
   * Kicks the entire group out of the active focus slots — the specific
   * `focusId` doesn't matter. After removal the group has no active focus
   * until `activateFocusGroup`, `focusSet`, or an auto-select re-establishes
   * one.
   *
   * Returns `false` when the owner has no layer, the group is not registered,
   * or the group is not currently active. Does not unregister the group's
   * focus targets — bindings remain intact.
   *
   * @param group Optional focus group name. Defaults to the default group.
   * @returns `true` if the group was removed from active focus,
   *          `false` if the group was not active or could not be found.
   */
  kickFocusGroup(groupOrOptions?: string | FocusSetOptions) {
    if (typeof groupOrOptions === "string" || groupOrOptions === undefined) {
      return this.layers.kickFocusGroup(groupOrOptions);
    }
    return this.layers.kickFocusGroup(groupOrOptions);
  }

  /**
   * Register a mode name. Modes must be registered before use in
   * `setMode`, `nextMode`, or `prevMode`.
   *
   * @returns `true` if added, `false` if already registered.
   */
  addMode(mode: string) {
    return this.registry.addMode(mode);
  }
  /** @returns `true` if the mode existed and was removed. */
  removeMode(mode: string) {
    return this.registry.removeMode(mode);
  }
  /**
   * Switch to a specific mode. Pass `null` to exit all modes.
   *
   * @returns `true` if the switch succeeded, `false` if the mode is not
   *          registered.
   */
  setMode(mode: string | null) {
    return this.registry.setMode(mode);
  }
  /** Cycle to the next mode in registration order. Wraps around. */
  nextMode() {
    this.registry.nextMode();
  }
  /** Cycle to the previous mode in registration order. Wraps around. */
  prevMode() {
    this.registry.prevMode();
  }
  /** @returns The active mode, or `null` in no-mode state. */
  getCurrentMode() {
    return this.registry.getCurrentMode();
  }

  /**
   * Register a named condition for `when: "conditionId"` references.
   *
   * @returns `true` if registered, `false` if the id already exists.
   */
  addCondition(id: string, defaultVal: boolean) {
    return this.registry.addCondition(id, defaultVal);
  }
  /** @returns `true` if the condition existed and was removed. */
  removeCondition(target: string) {
    return this.registry.removeCondition(target);
  }
  /**
   * Update a condition's value. Bindings referencing this condition via
   * `when: "id"` use the new value on the next key event.
   *
   * @returns `true` if updated, `false` if the condition is not registered.
   */
  setCondition(target: string, value: boolean) {
    return this.registry.setCondition(target, value);
  }

  /**
   * Enable wildcard-priority mode. In this mode, `"*"` (wildcard) bindings
   * take absolute priority over exact-key matches.
   *
   * By default exact-key bindings (`"return"`, `"ctrl+s"`) are checked before
   * wildcard bindings; with this mode the order is reversed so `"*"` bindings
   * fire first. Essential for screens that must intercept every key press
   * (e.g. a text input capturing all printable characters).
   *
   * Uses reference counting: multiple callers can enable independently.
   * Mode disables when all callers have called the returned disable function.
   *
   * @returns A disable function. When the reference count reaches 0,
   *          wildcard priority is turned off.
   *
   * @example
   * ```ts
   * const d1 = engine.enableWildcardPriority();
   * const d2 = engine.enableWildcardPriority();
   * // Wildcard priority is on
   * d1();
   * // Still on — d2 hasn't released yet
   * d2();
   * // Now off
   * ```
   */
  enableWildcardPriority() {
    return this.registry.enableWildcardPriority();
  }

  /**
   * Register global key bindings. Global keys fire independently of the
   * screen stack, subject to `category` whitelist and `affectLayer` placement.
   *
   * Evaluated at pipeline stages 3 and 7 — above the layer stage when
   * `affectLayer: true`, below it otherwise. Entries are matched in
   * registration order — the first match wins. Use this for application-wide
   * shortcuts (quit, toggle dev tools, switch language) that should work on
   * every screen. When `cover` is `false`, screens and layer elements cannot
   * override the key via {@link boundKeyboard}.
   *
   * When `operate` is a string, it is resolved to a registered shortcut action.
   * Press-count tracking (`times`/`pressCount`) is initialized for entries with `times`.
   *
   * @param options.mode — `'replace'` (default) replaces all global keys;
   *   `'add'` appends without removing existing entries.
   * @throws If `times < 1` or `observer` without `times`.
   *
   * @example
   * ```ts
   * engine.defineShortcutAction([{
   *   actionId: 'quit',
   *   action: () => process.exit(0),
   *   keys: ['ctrl+q'],
   * }]);
   *
   * // Replace all global keys
   * engine.globalKeys([
   *   { key: 'ctrl+q', operate: 'quit' },
   *   { key: 'f1', operate: () => toggleHelp(), category: '*' },
   *   { key: 'escape', operate: handleEscape, when: () => isModalOpen, mode: 'normal' },
   * ]);
   *
   * // Add without removing existing entries
   * engine.globalKeys([
   *   { key: 'ctrl+shift+p', operate: openCommandPalette },
   * ], { mode: 'add' });
   * ```
   */
  globalKeys(
    entries: GlobalKeyEntry[],
    options?: { mode?: "replace" | "add" },
  ) {
    this.registry.globalKeys(entries, options);
  }
  /**
   * @returns A shallow copy of all registered global key entries, with
   *          string `operate` values already resolved to functions.
   */
  getGlobalKeys(): ResolvedGlobalKeyEntry[] {
    return this.registry.getGlobalKeys();
  }
  /** @returns A shallow copy of all registered global sequence entries. */
  getGlobalSequences(): ResolvedGlobalSequenceEntry[] {
    return this.registry.getGlobalSequences();
  }
  /**
   * @returns The current `GlobalPendingSequence` if one is active — between
   *          the first key press and completion or timeout — or `null`.
   * @example
   * ```ts
   * const pending = engine.getGlobalPendingSequence();
   * if (pending) {
   *   console.log(`Waiting for key ${pending.nextIndex + 1}/${pending.sequences.length}`);
   * }
   * ```
   */
  getGlobalPendingSequence(): GlobalPendingSequence | null {
    return this.registry.getGlobalPendingSequence();
  }

  /**
   * Register global sequence key bindings. Global sequences fire independently
   * of the screen stack with higher priority than global keys.
   *
   * Evaluated at pipeline stages 2 and 6 — just above the global-key stages.
   * When the first key of any registered sequence matches, the engine creates
   * a pending global sequence and waits for subsequent keys within the
   * sequence timeout (default 500 ms). On a full match the handler fires and
   * the pending state clears; a mismatched key cancels the sequence (default)
   * or is silently consumed (`exclusive: true`). Use these for
   * application-wide key chords (like Vim-style `g g` to scroll to top).
   *
   * When `operate` is a string, it resolves to a registered sequence action.
   * In `'replace'` mode (default), any active pending global sequence is
   * cancelled before replacement.
   *
   * @throws If any sequence has fewer than 2 keys.
   *
   * @example
   * ```ts
   * engine.globalSequence([
   *   { keys: ['g', 'g'], operate: () => scrollToTop(), timeout: 600 },
   *   { keys: ['ctrl+w', 'q'], operate: 'quit-all', exclusive: true },
   *   { keys: ['ctrl+b', 'd'], operate: toggleDebug, mode: 'normal' },
   * ]);
   *
   * // Add without replacing
   * engine.globalSequence([
   *   { keys: ['ctrl+k', 'ctrl+k'], operate: openQuickMenu },
   * ], { mode: 'add' });
   * ```
   */
  globalSequence(
    entries: GlobalSequenceEntry[],
    options?: { mode?: "replace" | "add" },
  ) {
    this.registry.globalSequence(entries, options);
  }

  /**
   * Register named shortcut actions that can be referenced by key bindings
   * via string identifier instead of inline callbacks.
   *
   * @throws If any `actionId` is duplicated.
   */
  defineShortcutAction(entries: ShortcutOperationEntry[]) {
    this.registry.defineShortcutAction(entries);
  }
  /** Register named sequence actions. @throws If any id is duplicated. */
  defineSequenceAction(entries: SequenceOperationEntry[]) {
    this.registry.defineSequenceAction(entries);
  }

  /**
   * Modify the keys (and optionally timeout) of an existing sequence action.
   *
   * @throws If the action does not exist or has no preset keys/timeout.
   */
  modifySequenceAction(actionId: string, keys: string[], timeout?: number) {
    this.registry.modifySequenceAction(actionId, keys, timeout);
  }
  /**
   * Modify the default keys of an existing shortcut action.
   * @throws If the action does not exist or was not registered with a `keys` field.
   */
  modifyAction(actionId: string, keys: string[]) {
    this.registry.modifyAction(actionId, keys);
  }

  /** Add a single sequence action. @throws If the id already exists. */
  addSequenceAction(entry: SequenceOperationEntry) {
    this.registry.addSequenceAction(entry);
  }
  /** @returns `true` if the sequence action is registered. */
  hasSequenceAction(sequenceActionId: string): boolean {
    return this.registry.hasSequenceAction(sequenceActionId);
  }
  /** Remove a registered sequence action. @throws If not registered. */
  removeSequenceAction(sequenceActionId: string) {
    this.registry.removeSequenceAction(sequenceActionId);
  }
  /** Clear all registered sequence operations. */
  clearSequenceOperations() {
    this.registry.clearSequenceOperations();
  }

  /** Add a single shortcut action. @throws If the actionId already exists. */
  addAction(entry: ShortcutOperationEntry) {
    this.registry.addAction(entry);
  }
  /** @returns `true` if the shortcut action is registered. */
  hasAction(actionId: string): boolean {
    return this.registry.hasAction(actionId);
  }
  /** Remove a registered shortcut action. @throws If not registered. */
  removeAction(actionId: string) {
    this.registry.removeAction(actionId);
  }
  /** Clear all registered shortcut operations. */
  clearShortcutOperations() {
    this.registry.clearShortcutOperations();
  }

  /**
   * Check whether a global multi-key sequence is currently pending
   * (i.e. the first key was pressed and the engine is waiting for
   * subsequent keys or a timeout).
   *
   * This is a "pull" API — it reads the pending state on demand, equivalent
   * to {@link getGlobalPendingSequence}() !== null. Pass a `sync` callback to
   * make it "push": the engine invokes the callback after every
   * {@link processKey} invocation, letting the host framework re-render when
   * the pending state changes.
   *
   * @param sync - Optional callback invoked after each {@link processKey}
   *               so the host can re-render (e.g. a `useState` updater).
   * @returns `true` if a global sequence is pending, `false` otherwise.
   *
   * @example
   * ```ts
   * // Polling — check on each render
   * if (engine.thereGlobalQueueWaiting()) {
   *   // Show "g _" hint — first key of "g g" was pressed
   * }
   *
   * // Reactive — force a re-render when the pending state changes
   * function useGlobalPendingState() {
   *   const [, forceUpdate] = useState(0);
   *   return engine.thereGlobalQueueWaiting(() => forceUpdate(n => n + 1));
   * }
   * ```
   */
  thereGlobalQueueWaiting(sync?: () => void): boolean {
    return this.registry.thereGlobalQueueWaiting(sync);
  }

  /**
   * Check whether the current owner's layer has an active pending multi-key
   * sequence (registered via {@link boundSequence}).
   * Unlike {@link thereGlobalQueueWaiting}, this only checks the layer
   * belonging to the current owner — the page, layer, or modal layer that
   * owns the active keyboard data. Use this to show sequence-progress hints
   * (like Vim's pending key display).
   *
   * When a `sync` callback is provided it is added to the same pending-sync
   * set used by {@link thereGlobalQueueWaiting} and fires after each
   * {@link processKey} invocation.
   *
   * @param sync - Optional callback invoked after each {@link processKey}
   *               so the host can re-render.
   * @returns `true` if the current layer has a pending sequence,
   *          `false` otherwise.
   * @throws If there is no current owner (no active page, layer, or modal layer).
   *
   * @example
   * ```ts
   * // Show a hint while a local sequence is pending
   * if (engine.currentScreenHasSequenceWaiting()) {
   *   // Display partial sequence indicator
   * }
   * ```
   */
  currentScreenHasSequenceWaiting(sync?: () => void): boolean {
    return this.registry.currentScreenHasSequenceWaiting(sync);
  }

  /**
   * Insert a processor into this instance's pipeline at a specified position.
   *
   * Options (checked in order):
   * - `{ index: n }` — insert at 0-based index
   * - `{ before: "id" }` / `{ after: "id" }` — insert relative to a named processor
   * - omitted — append to the end
   *
   * @throws If the processor id duplicates an existing one or the target is not found.
   */
  addProcessor(
    processor: PipelineProcessor<TComponent>,
    options?: { before?: string } | { after?: string } | { index?: number },
  ): void {
    this.pipeline.addProcessor(processor, options);
  }
  /**
   * Remove a processor from this instance's pipeline by its id.
   * @returns `true` if found and removed, `false` if not found.
   */
  removeProcessor(processorId: string): boolean {
    return this.pipeline.removeProcessor(processorId);
  }
  /** @returns A read-only snapshot of the current processor pipeline. */
  getProcessors(): readonly PipelineProcessor<TComponent>[] {
    return this.pipeline.getProcessors();
  }
  /** Restore the processor pipeline to the default 9-stage chain. */
  resetProcessors(): void {
    this.pipeline.resetProcessors();
  }

  /**
   * Bind one or more keys to a handler on the current owner's layer.
   *
   * Supports three calling conventions:
   * 1. `boundKeyboard(keys, handler, options?)` — explicit keys and callback
   * 2. `boundKeyboard(keys, actionId, options?)` — explicit keys, shortcut action by id
   * 3. `boundKeyboard(actionId, options?)` — uses the shortcut action's preset keys
   *
   * Storage follows the options: with `elementId` the binding is stored on
   * that element's keyboard data; with `focusId` on the named
   * `FocusTarget.bindings` array; with neither, on the page layer's bindings
   * array (or the element keyboard's bindings inside a layer/modal layer).
   * Element bindings are evaluated in the layer broadcast stage and the
   * modal stage; page-level bindings in the screen-stack stage, after global
   * keys and layer broadcast. Within a keyboard layer, focus-target bindings
   * are checked before layer-level bindings.
   *
   * Options behavior:
   * - `once` — auto-remove after the first invocation; the unbind happens
   *   before the handler runs
   * - `times` / `observer` — the handler fires after `times` presses; the
   *   counter resets after the handler runs, and `observer` is called on
   *   each press while counting (requires `times`)
   * - `when` — a condition function or a registered condition id
   *   (see {@link addCondition}); the binding is skipped when it evaluates
   *   to `false`
   * - `mode` — restricts the binding to a specific mode; skipped when the
   *   active mode doesn't match
   * - `stopsWorkingAfterLayerAppearing` — page-level bindings only: when any
   *   layer is present the page binding stops responding; has no effect
   *   inside a layer
   *
   * @returns An unbind function. Removes the binding from the layer
   *          immediately; safe to call multiple times.
   * @throws If no current owner exists, times < 1, or observer without times.
   *
   * @example
   * ```ts
   * // Inline handler
   * const unbind = engine.boundKeyboard('return', (input, key) => {
   *   console.log('submit');
   * });
   *
   * // Via shortcut action
   * engine.boundKeyboard('ctrl+s', 'save');
   *
   * // Via action preset keys
   * engine.boundKeyboard('confirm');
   *
   * // With options — one-shot, focus-scoped, press-counted
   * engine.boundKeyboard('escape', handleCancel, {
   *   once: true,
   *   focusId: 'dialog',
   *   times: 2,
   *   when: () => isDirty,
   *   mode: 'normal',
   * });
   * ```
   */
  boundKeyboard(
    keysOrActionId: string | string[],
    handlerOrOptions: KeyHandler | string | BoundKeyboardOptions,
    maybeOptions?: BoundKeyboardOptions,
  ): () => void {
    return this.bindings.boundKeyboard(
      keysOrActionId,
      handlerOrOptions,
      maybeOptions,
    );
  }

  /**
   * Mark keys as transparent on the current layer. When a transparent key
   * reaches the layer (or the named focus target), the layer's own bindings
   * are skipped and the key continues to layers below.
   *
   * Penetration means **pass-through**, not blocking — the key is only
   * released, never consumed. Penetration rules are checked first during key
   * matching (layer broadcast and screen-stack stages), so a key that is both
   * stopped and penetrated on the same layer passes through. A wildcard `"*"`
   * entry marks all keys transparent, and a `when` condition (callback or
   * registered condition id) gates the rule — when it evaluates to `false`
   * the penetration rule is ignored.
   *
   * @returns A function that removes the transparency markers.
   * @throws If there is no current owner.
   *
   * @example
   * ```ts
   * // Make arrow keys transparent so the parent screen handles them
   * engine.penetration(['up', 'down', 'left', 'right']);
   *
   * // Focus-scoped with condition
   * engine.penetration(['tab'], {
   *   focusId: 'searchInput',
   *   when: () => !isEditing,
   * });
   *
   * // Wildcard — all keys pass through
   * engine.penetration(['*']);
   * ```
   */
  penetration(keys: string[], options?: PenetrationOptions): () => void {
    return this.bindings.penetration(keys, options);
  }

  /**
   * Prevent keys from propagating beyond the current layer. A "stop barrier"
   * means: once a key reaches this layer, even if no binding handles it, it
   * does not fall through to layers below. Stop rules are checked after
   * bindings and penetrations, and a `when` condition (callback or registered
   * condition id) gates the rule — when it evaluates to `false` the key
   * propagates normally. A wildcard `"*"` entry stops all keys.
   *
   * `stopAction: true` treats `keys` as shortcut action IDs: the stop rule is
   * stored against the action id and resolved to the action's current bound
   * keys at match time, so re-binding the action moves the barrier
   * automatically.
   *
   * @returns A function that removes the stop barrier.
   * @throws If there is no current owner, or `stopAction: true` with an
   *         action id that has no bound keys.
   *
   * @example
   * ```ts
   * // Stop arrow keys — parent screens never see them
   * engine.stop(['up', 'down', 'left', 'right']);
   *
   * // Stop via action ID resolution
   * engine.stop(['submit', 'cancel'], { stopAction: true });
   *
   * // Focus-scoped with condition
   * engine.stop(['escape'], {
   *   focusId: 'modal',
   *   when: () => hasUnsavedChanges,
   * });
   * ```
   */
  stop(keys: string[], options?: StopOptions): () => void {
    return this.bindings.stop(keys, options);
  }

  /**
   * Allow specific keys to pass through the modal barrier. By default the
   * active modal consumes every key event — even unbound keys. Adding a key
   * to the allow list releases it to lower pipeline stages.
   *
   * This is the only mechanism by which keys can escape the modal barrier.
   * In the modal pipeline stage (stage 0), `allowedKeys` is checked before
   * any other processing: a matching key (whose `when` evaluates to `true`)
   * makes the modal processor return `false`, so the event continues to the
   * global/layer/page stages below. Keys released this way count as
   * unhandled ("miss") for {@link useModalMissListener} when nothing else
   * consumes them.
   *
   * @returns A function that removes the allow entry, restoring the default
   *          behavior (the modal blocks the key again).
   * @throws If not called on a modal layer.
   *
   * @example
   * ```ts
   * // Allow arrow keys through the modal so the underlying screen can still navigate
   * engine.allowModal(['up', 'down', 'left', 'right']);
   *
   * // Allow escape only when a condition is met
   * engine.allowModal(['escape'], {
   *   when: () => !isCriticalOperation,
   * });
   *
   * // Focus-scoped allow
   * engine.allowModal(['enter'], { focusId: 'transferInput' });
   * ```
   */
  allowModal(keys: string[], options?: AllowModalOptions): () => void {
    return this.bindings.allowModal(keys, options);
  }

  /**
   * Register a multi-key sequence binding on the current owner's layer.
   *
   * When the first key of a registered sequence is pressed, the layer enters
   * a pending state. Subsequent key presses are matched against the remaining
   * keys; when all match within the timeout the handler fires. A mismatched
   * key cancels the sequence (default) or is silently consumed
   * (`exclusive: true`). The `when` condition (callback or registered
   * condition id) is checked at each key press — if it returns `false`, the
   * pending sequence is cancelled.
   *
   * Supports two calling conventions:
   * 1. `boundSequence(keys, handler, options?)` — explicit keys and callback
   * 2. `boundSequence(actionId, options?)` — uses a registered sequence action's preset
   *
   * The sequence timeout defaults to 500 ms — the timer starts on the first
   * key and resets on each match. Unbinding while a sequence is pending does
   * not cancel it.
   *
   * Throws if fewer than 2 keys are provided, if the first key conflicts
   * with a global sequence that has `cover: false`, or if `observer` is set
   * without `times`.
   *
   * @returns An unbind function.
   *
   * @example
   * ```ts
   * // Explicit keys with handler
   * engine.boundSequence(['g', 'g'], () => {
   *   scrollToTop();
   * });
   *
   * // With timeout and exclusive mode
   * engine.boundSequence(['ctrl+w', 'q'], handleQuit, {
   *   timeout: 1000,
   *   exclusive: true,
   *   mode: 'normal',
   * });
   *
   * // Via sequence action
   * engine.defineSequenceAction([{
   *   sequenceActionId: 'vim-goto-top',
   *   action: () => scrollToTop(),
   *   keys: ['g', 'g'],
   *   timeout: 600,
   * }]);
   * engine.boundSequence('vim-goto-top');
   * ```
   */
  boundSequence(
    keysOrActionId: string[] | string,
    handlerOrOptions?: KeyHandler | SequenceOptions,
    maybeOptions?: SequenceOptions,
  ): () => void {
    return this.bindings.boundSequence(
      keysOrActionId,
      handlerOrOptions,
      maybeOptions,
    );
  }

  /**
   * Subscribe to unhandled key presses inside a modal. The callback receives
   * `{ miss: false }` when the key was handled, or `{ miss: true, key, input, eventNames }`
   * when nothing consumed it.
   *
   * @returns An unsubscribe function.
   * @throws If not called on a modal layer.
   */
  useModalMissListener(
    cb: ModalMissCallback,
    options?: ModalMissOptions,
  ): () => void {
    return this.bindings.useModalMissListener(cb, options);
  }

  /**
   * Build a snapshot of all mutable state needed to process a single key
   * event through the pipeline.
   *
   * Called by {@link processKey} once per key event. All values are read
   * synchronously to produce a consistent frozen-in-time view.
   *
   * The returned object is cast to `PipelineContext` because the engine's
   * generic `TComponent` may not match the legacy `React.ComponentType` in
   * the typed interface — this is a bridge point that will be resolved when
   * the pipeline types are fully generic.
   */
  buildPipelineContext(
    input: string,
    key: unknown,
  ): PipelineContext<TComponent> {
    const eventNames = this.state._normalizeKeyNames(input, key);
    const topComponent =
      this.state.synchronizedData.pagePath.length > 0
        ? this.state.synchronizedData.pagePath[
            this.state.synchronizedData.pagePath.length - 1
          ]
        : null;
    const compositionEngineHandler = this.state.compositionEngineHandle;
    const noActiveProcessor = this.state.noActiveProcessor;
    const state = this.state;

    return {
      input,
      eventNames,
      pagePath: this.state.synchronizedData.pagePath,
      allLayers: this.state.synchronizedData.layers,
      allModalLayers: this.state.synchronizedData.modalLayers,
      layersRef: this.state.pageLayerEelementsKeyboards,
      layerKeyboardRefs: this.state.layersKeyboardMap,
      pendingSeqRef: {
        get current(): GlobalPendingSequence | null {
          return state.globalPendingSeqRef;
        },
        set current(value: GlobalPendingSequence | null) {
          state.globalPendingSeqRef = value;
        },
      },
      topComponent,
      globalKeys: this.state.globalKeysRef,
      globalSequences: this.state.globalSequencesRef,
      wildcardFirst: this.state.wildcardPriorityCountRef > 0,
      autoTabKey: this.state.tabKey,
      notifyFocusChange: () => this.layers.notifyFocusChange(),
      notifyPendingSyncs: () => this.notifyPendingSyncs(),
      currentMode: this.state.currentModeRef,
      conditions: this.state.conditions,
      key,
      isNormalChar: this.state._isNormalChar,
      compositionEngineHandler,
      compositionEngine: this.state.compositionEngine,
      autoTab: this.state.autoTab,
      noActiveProcessor,
    };
  }

  /**
   * Re-activate a previously kicked built-in processor by removing it from
   * the disabled list. The processor resumes normal operation on the next
   * {@link processKey} call.
   *
   * When a processor is actively processing events (i.e. not in the disabled
   * list), calling `activeProcessor` is a no-op that returns `false`.
   *
   * @param id - The built-in processor ID to re-enable.
   * @returns `true` if the processor was re-activated, `false` if it was
   *          already active or the id was not found in the disabled list.
   */
  activeProcessor(id: BuiltinProcessorId) {
    return this.pipeline.activeProcessor(id);
  }

  /**
   * De-activate a built-in processor by adding it to a disabled list.
   * The processor is skipped on the next {@link processKey} call —
   * its `process()` method returns `false` immediately without running
   * any logic. Later pipeline stages receive key events as if the
   * kicked stage did not exist.
   *
   * This does NOT remove the processor from the pipeline — it only
   * disables its runtime behavior. The processor still appears in
   * {@link getProcessors}. A kicked processor can be re-enabled at any
   * time via {@link activeProcessor}.
   *
   * Use this for temporarily suppressing a pipeline stage (e.g.
   * disable the modal barrier, mute global keys) without permanently
   * altering the pipeline structure.
   *
   * @param id - The built-in processor ID to de-activate.
   * @returns `true` if the processor was kicked, `false` if it was
   *          already in the disabled list.
   */
  kickProcessor(id: BuiltinProcessorId) {
    return this.pipeline.kickProcessor(id);
  }

  /**
   * Register a mouse region for hit-testing.
   *
   * The region's `layerId` must match a synced layer id so hit priority
   * follows the same modal > layer > root order as keyboard events. `regionId`
   * is a caller-chosen unique identifier for the region within that layer —
   * it is independent of keyboard element ids. `rect` must be in 1-based
   * terminal coordinates.
   *
   * Within a layer, later registrations win; a `priority` in the region entry
   * overrides registration order (used for child controls like buttons).
   *
   * @returns An unregister function.
   */
  registerMouseRegion(entry: MouseRegionEntry): () => void {
    return this.mouseRegions.register(entry);
  }

  /**
   * Remove a mouse region by layerId + regionId (idempotent).
   * Needed for unmount cleanup when a region may have been re-registered
   * multiple times via {@link registerMouseRegion}.
   */
  unregisterMouseRegion(layerId: string, regionId: string): void {
    this.mouseRegions.unregister(layerId, regionId);
  }

  /**
   * Process a mouse event through the mouse region hit-testing.
   *
   * `move` events drive hover transitions (`onEnter`/`onLeave`); `click`
   * events fire `onClick`; `wheel` events fire `onWheel`. `press`/`drag`/
   * `release` events drive the drag lifecycle: a press inside a region arms
   * a drag capture that the first `drag` event promotes (`onDragStart`/
   * `onDragMove`), and `release` fires `onDragEnd` — only when a real drag
   * happened; plain clicks stay silent.
   *
   * @param event - A mouse event from the host framework's mouse adapter.
   * @returns `true` if the event hit a registered region, `false` otherwise.
   */
  processMouseEvent(event: XtermMouseEvent): boolean {
    return this.mouseRegions.process(
      event,
      this.state.synchronizedData.layers,
      this.state.synchronizedData.modalLayers,
    );
  }

  /** @returns The currently hovered mouse region, or null. */
  getHoveredMouseRegion(): HoveredRegion | null {
    return this.mouseRegions.getHovered();
  }

  /**
   * Process a keyboard event through the full processor pipeline.
   *
   * Builds a snapshot context from the engine's current state, then runs
   * each processor in order. The first processor that returns `true`
   * (event consumed) stops the chain. The pipeline order is:
   *
   * `modal` → composition (`affectOverlay: true`) → global sequence
   * (`affectLayer: true`) → global keys (`affectLayer: true`) → layer
   * broadcast → composition (`affectOverlay: false`) → global sequence
   * (`affectLayer: false`) → global keys (`affectLayer: false`) → screen stack.
   *
   * `processKey` itself only orchestrates the chain — side effects are
   * produced by the individual processors, which may mutate layers
   * (e.g. unbind `once` bindings), pending sequence state, focus targets,
   * composition context, or press-count counters. After the chain finishes,
   * pending `sync` callbacks registered via {@link thereGlobalQueueWaiting}
   * and {@link currentScreenHasSequenceWaiting} are notified so the host
   * framework can re-render.
   *
   * @param input - Raw character string from the host framework's keyboard event.
   * @param key   - Full key descriptor from the host framework (shape defined by `normalizeKeyNames`).
   * @returns `true` if any processor consumed the event, `false` if it fell through.
   *
   * @example
   * ```ts
   * // Engine-level: call for every key event from the host framework
   * useInput((input, key) => {
   *   const handled = engine.processKey(input, key);
   *   if (!handled) {
   *     // Key fell through the entire pipeline — host may handle it or ignore
   *   }
   * });
   * ```
   */
  processKey(input: string, key: unknown): boolean {
    const ctx = this.buildPipelineContext(input, key);
    for (const processor of this.state._processors) {
      if (processor.process(ctx)) {
        this.notifyPendingSyncs();
        return true;
      }
    }
    this.notifyPendingSyncs();
    return false;
  }

  private notifyPendingSyncs(): void {
    for (const sync of this.state.pendingSyncs) {
      sync();
    }
    this.state.pendingSyncs.clear();
  }
}
