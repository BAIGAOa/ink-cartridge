import {
    EngineOverlayEntry,
    EngineModalEntry,
    ResolvedGlobalSequenceEntry,
    GlobalPendingSequence,
    ShortcutOperationEntry,
    SequenceOperationEntry,
    GlobalKeyEntry,
    GlobalSequenceEntry,
    ResolvedGlobalKeyEntry,
    PipelineProcessor,
    KeyboardProcessorProps,
    PipelineContext,
    KeyHandler,
    BoundKeyboardOptions,
    PenetrationOptions,
    StopOptions,
    AllowModalOptions,
    SequenceOptions,
    ModalMissCallback,
    ModalMissOptions,
} from "./types.js";
import EngineState from "./engine/EngineState.js";
import LayerManager from "./engine/LayerManager.js";
import PipelineManager from "./engine/PipelineManager.js";
import BindingService from "./engine/BindingService.js";
import OperationRegistry from "./engine/OperationRegistry.js";

/**
 * Configuration passed to {@link KeyboardEngine} at construction time.
 */
export interface EngineProps {
    /** Registered mode names (e.g. `["normal", "insert"]`). */
    modes?: string[]
    /** Default mode — must be null (no-mode) or a member of `modes`. */
    defaultMode?: string
    /** Per-instance custom processors injected into the pipeline at init time. */
    processors?: KeyboardProcessorProps[]
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
    normalizeKeyNames: (input: string, key: unknown) => string[]
}

/**
 * Framework-agnostic keyboard state machine.
 *
 * Owns all mutable keyboard state — bindings, layers, focus targets, global
 * keys, modes, conditions, and the processor pipeline — without depending on
 * any specific UI framework. A host framework (React, Vue, Blessed, etc.)
 * creates an instance, calls {@link sync} on each render to push screen-path
 * and overlay/modal state, and calls {@link processKey} for every keyboard
 * event.
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
 * engine.sync({ path, activeOverlayIds, displayedOverlays, activeModalId, displayedModals });
 * useInput((input, key) => engine.processKey(input, key));
 * ```
 */
export default class KeyboardEngine<TComponent = unknown> {
    private state: EngineState<TComponent>
    private layers: LayerManager<TComponent>
    private pipeline: PipelineManager
    private bindings: BindingService<TComponent>
    private registry: OperationRegistry<TComponent>

    /**
     * @param props - Engine configuration.
     *   `normalizeKeyNames` is required — the engine has no built-in default
     *   so each framework must provide its own adapter.
     */
    constructor(props: EngineProps) {
        this.state = new EngineState(props)
        this.layers = new LayerManager(this.state)
        this.pipeline = new PipelineManager(this.state, props.processors)
        this.bindings = new BindingService(this.state, this.layers)
        this.registry = new OperationRegistry(this.state, this.layers)
    }

    /**
     * Push screen-path and overlay/modal state into the engine.
     *
     * Call this synchronously on every render (before any keyboard events)
     * so that {@link processKey} reads a fresh snapshot. Cleanup methods
     * ({@link cleanLayers}, etc.) should be called in a post-render effect
     * so they compare the pre- and post-sync state.
     *
     * @param state - Current screen system state from the host framework.
     */
    sync(state: {
        path: TComponent[]
        activeOverlayIds: string[]
        displayedOverlays: EngineOverlayEntry[]
        activeModalId: string | null
        displayedModals: EngineModalEntry[]
    }) {
        this.state.path = state.path
        this.state.activeOverlayIds = new Set(state.activeOverlayIds)
        this.state.displayedOverlays = state.displayedOverlays
        this.state.activeModalIdRef = state.activeModalId
        this.state.displayedModalsRef = state.displayedModals
    }


    /**
     * Remove keyboard layers for screens that are no longer in the current path.
     * Also clears any pending sequence timers on removed layers to prevent
     * stale timeouts from firing after the layer is gone.
     */
    cleanLayers() { this.layers.cleanLayers(); }
    /** Remove keyboard layers for overlays that have been closed. */
    cleanOverlayLayers() { this.layers.cleanOverlayLayers(); }
    /** Remove keyboard layers for modals that have been closed. */
    cleanModalLayers() { this.layers.cleanModalLayers(); }

    /**
     * Push a new owner onto the owner stack so that keyboard bindings in
     * an overlay or modal are attributed to that overlay/modal rather than
     * the underlying screen.
     */
    pushOwner(owner: TComponent | string) { this.layers.pushOwner(owner); }
    /**
     * Remove the most recent matching owner from the stack.
     * Uses `lastIndexOf` to remove from the end so that nested owners of the
     * same type (e.g. two overlays with the same component) are unwound correctly.
     */
    popOwner(owner: TComponent | string) { this.layers.popOwner(owner); }

    /**
     * Read a layer without creating it. Returns `undefined` when no layer
     * exists for the given owner.
     */
    readLayer(owner: TComponent | string) { return this.layers.readLayer(owner); }

    /**
     * Subscribe to focus changes. Returns an unsubscribe function.
     * Use this in UI frameworks to track when the active focus target moves
     * (e.g. Tab navigation, programmatic focusSet).
     */
    subscribeFocus(listener: () => void) { return this.layers.subscribeFocus(listener); }

    /**
     * Activate a named focus target on the current owner's layer.
     *
     * @throws If the current owner has no layer or the focus target is not registered.
     */
    focusSet(focusId: string) { this.layers.focusSet(focusId); }
    /** Cycle to the next focus target (Tab). Wraps around. */
    focusNext() { this.layers.focusNext(); }
    /** Cycle to the previous focus target (Shift+Tab). Wraps around. */
    focusPrev() { this.layers.focusPrev(); }
    /**
     * Return the currently active focus target id, or null when no focus
     * targets exist on the current layer.
     */
    focusCurrent(): string | null { return this.layers.focusCurrent(); }
    /**
     * Remove a focus target from the current layer. If the removed target
     * was the active one, the first remaining target (in registration order)
     * is activated automatically.
     */
    focusUnregister(focusId: string) { this.layers.focusUnregister(focusId); }

    /**
     * Register a mode name. Modes must be registered before use in
     * `setMode`, `nextMode`, or `prevMode`.
     *
     * @returns `true` if added, `false` if already registered.
     */
    addMode(mode: string) { return this.registry.addMode(mode); }
    /** @returns `true` if the mode existed and was removed. */
    removeMode(mode: string) { return this.registry.removeMode(mode); }
    /**
     * Switch to a specific mode. Pass `null` to exit all modes.
     *
     * @returns `true` if the switch succeeded, `false` if the mode is not
     *          registered.
     */
    setMode(mode: string | null) { return this.registry.setMode(mode); }
    /** Cycle to the next mode in registration order. Wraps around. */
    nextMode() { this.registry.nextMode(); }
    /** Cycle to the previous mode in registration order. Wraps around. */
    prevMode() { this.registry.prevMode(); }
    /** @returns The active mode, or `null` in no-mode state. */
    getCurrentMode() { return this.registry.getCurrentMode(); }

    /**
     * Register a named condition for `when: "conditionId"` references.
     *
     * @returns `true` if registered, `false` if the id already exists.
     */
    addCondition(id: string, defaultVal: boolean) { return this.registry.addCondition(id, defaultVal); }
    /** @returns `true` if the condition existed and was removed. */
    removeCondition(target: string) { return this.registry.removeCondition(target); }
    /**
     * Update a condition's value. Bindings referencing this condition via
     * `when: "id"` use the new value on the next key event.
     *
     * @returns `true` if updated, `false` if the condition is not registered.
     */
    setCondition(target: string, value: boolean) { return this.registry.setCondition(target, value); }

    /**
     * Enable wildcard-priority mode. In this mode, `"*"` (wildcard) bindings
     * take absolute priority over exact-key matches.
     *
     * Uses reference counting: multiple callers can enable independently.
     * Mode disables when all callers have called the returned disable function.
     *
     * @returns A disable function. When the reference count reaches 0,
     *          wildcard priority is turned off.
     */
    enableWildcardPriority() { return this.registry.enableWildcardPriority(); }

    /**
     * Register global key bindings. Global keys fire independently of the
     * screen stack, subject to `category` whitelist and `affectOverlay` placement.
     *
     * When `operate` is a string, it is resolved to a registered shortcut action.
     * Press-count tracking (`times`/`pressCount`) is initialized for entries with `times`.
     *
     * @param options.mode — `'replace'` (default) replaces all global keys;
     *   `'add'` appends without removing existing entries.
     * @throws If `times < 1` or `observer` without `times`.
     */
    globalKeys(entries: GlobalKeyEntry[], options?: { mode?: 'replace' | 'add' }) {
        this.registry.globalKeys(entries, options);
    }
    /** @returns A shallow copy of all registered global key entries. */
    getGlobalKeys(): ResolvedGlobalKeyEntry[] { return this.registry.getGlobalKeys(); }
    /** @returns A shallow copy of all registered global sequence entries. */
    getGlobalSequences(): ResolvedGlobalSequenceEntry[] { return this.registry.getGlobalSequences(); }
    /** @returns The current global pending sequence state, or null. */
    getGlobalPendingSequence(): GlobalPendingSequence | null { return this.registry.getGlobalPendingSequence(); }

    /**
     * Register global sequence key bindings. Global sequences fire independently
     * of the screen stack with higher priority than global keys.
     *
     * When the first key matches, the engine enters a pending state and waits
     * for subsequent keys within a configurable timeout.
     *
     * When `operate` is a string, it resolves to a registered sequence action.
     * In `'replace'` mode (default), any active pending global sequence is
     * cancelled before replacement.
     *
     * @throws If any sequence has fewer than 2 keys.
     */
    globalSequence(entries: GlobalSequenceEntry[], options?: { mode?: 'replace' | 'add' }) {
        this.registry.globalSequence(entries, options);
    }

    /**
     * Register named shortcut actions that can be referenced by key bindings
     * via string identifier instead of inline callbacks.
     *
     * @throws If any `actionId` is duplicated.
     */
    defineShortcutAction(entries: ShortcutOperationEntry[]) { this.registry.defineShortcutAction(entries); }
    /** Register named sequence actions. @throws If any id is duplicated. */
    defineSequenceAction(entries: SequenceOperationEntry[]) { this.registry.defineSequenceAction(entries); }

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
    modifyAction(actionId: string, keys: string[]) { this.registry.modifyAction(actionId, keys); }

    /** Add a single sequence action. @throws If the id already exists. */
    addSequenceAction(entry: SequenceOperationEntry) { this.registry.addSequenceAction(entry); }
    /** @returns `true` if the sequence action is registered. */
    hasSequenceAction(sequenceActionId: string): boolean { return this.registry.hasSequenceAction(sequenceActionId); }
    /** Remove a registered sequence action. @throws If not registered. */
    removeSequenceAction(sequenceActionId: string) { this.registry.removeSequenceAction(sequenceActionId); }
    /** Clear all registered sequence operations. */
    clearSequenceOperations() { this.registry.clearSequenceOperations(); }

    /** Add a single shortcut action. @throws If the actionId already exists. */
    addAction(entry: ShortcutOperationEntry) { this.registry.addAction(entry); }
    /** @returns `true` if the shortcut action is registered. */
    hasAction(actionId: string): boolean { return this.registry.hasAction(actionId); }
    /** Remove a registered shortcut action. @throws If not registered. */
    removeAction(actionId: string) { this.registry.removeAction(actionId); }
    /** Clear all registered shortcut operations. */
    clearShortcutOperations() { this.registry.clearShortcutOperations(); }

    /**
     * Check whether a global multi-key sequence is currently pending
     * (i.e. the first key was pressed and the engine is waiting for
     * subsequent keys or a timeout).
     */
    thereGlobalQueueWaiting(sync?: () => void): boolean { return this.registry.thereGlobalQueueWaiting(sync); }
    
    /**
     * Check whether the current screen/overlay layer has an active
     * pending multi-key sequence (registered via {@link boundSequence}).
     * Unlike {@link thereGlobalQueueWaiting}, this only checks the layer
     * belonging to the current owner.
     *
     * @throws If there is no current owner (no active screen or overlay).
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
    addProcessor(processor: PipelineProcessor, options?: { before?: string } | { after?: string } | { index?: number }): void {
        this.pipeline.addProcessor(processor, options);
    }
    /**
     * Remove a processor from this instance's pipeline by its id.
     * @returns `true` if found and removed, `false` if not found.
     */
    removeProcessor(processorId: string): boolean { return this.pipeline.removeProcessor(processorId); }
    /** @returns A read-only snapshot of the current processor pipeline. */
    getProcessors(): readonly PipelineProcessor[] { return this.pipeline.getProcessors(); }
    /** Restore the processor pipeline to the default 7-stage chain. */
    resetProcessors(): void { this.pipeline.resetProcessors(); }


    /**
    * Bind one or more keys to a handler on the current owner's layer.
    *
    * Supports three calling conventions:
    * 1. `boundKeyboard(keys, handler, options?)` — explicit keys and callback
    * 2. `boundKeyboard(keys, actionId, options?)` — explicit keys, shortcut action by id
    * 3. `boundKeyboard(actionId, options?)` — uses the shortcut action's preset keys
    *
    * If a `focusId` is provided in options, the binding is stored on that
    * focus target instead of the layer-level bucket.
    *
    * @returns An unbind function.
    * @throws If no current owner exists, times < 1, or observer without times.
    */
    boundKeyboard(
        keysOrActionId: string | string[],
        handlerOrOptions: KeyHandler | string | BoundKeyboardOptions,
        maybeOptions?: BoundKeyboardOptions,
    ): () => void {
        return this.bindings.boundKeyboard(keysOrActionId, handlerOrOptions, maybeOptions);
    }


    /**
    * Mark keys as transparent on the current layer. When a transparent key
    * reaches the layer (or the named focus target), the layer's own bindings
    * are skipped and the key continues to layers below.
    *
    * @returns A function that removes the transparency markers.
    * @throws If there is no current owner.
    */
    penetration(keys: string[], options?: PenetrationOptions): () => void {
        return this.bindings.penetration(keys, options);
    }

    /**
    * Prevent keys from propagating beyond the current layer. Supports
    * `stopAction: true` to resolve action IDs to their bound keys.
    *
    * @returns A function that removes the stop barrier.
    * @throws If there is no current owner.
    */
    stop(keys: string[], options?: StopOptions): () => void {
        return this.bindings.stop(keys, options);
    }


    /**
    * Allow specific keys to pass through the modal barrier. By default the
    * active modal consumes every key event — even unbound keys. Adding a key
    * to the allow list releases it to lower pipeline stages.
    *
    * @throws If not called on a modal layer.
    */
    allowModal(keys: string[], options?: AllowModalOptions): () => void {
        return this.bindings.allowModal(keys, options);
    }


    /**
    * Register a multi-key sequence binding on the current owner's layer.
    *
    * Supports two calling conventions:
    * 1. `boundSequence(keys, handler, options?)` — explicit keys and callback
    * 2. `boundSequence(actionId, options?)` — uses a registered sequence action's preset
    *
    * Throws if fewer than 2 keys are provided, or if the first key conflicts
    * with a global sequence that has `cover: false`.
    *
    * @returns An unbind function.
    */
    boundSequence(
        keysOrActionId: string[] | string,
        handlerOrOptions?: KeyHandler | SequenceOptions,
        maybeOptions?: SequenceOptions,
    ): () => void {
        return this.bindings.boundSequence(keysOrActionId, handlerOrOptions, maybeOptions);
    }

    /**
    * Subscribe to unhandled key presses inside a modal. The callback receives
    * `{ miss: false }` when the key was handled, or `{ miss: true, key, input, eventNames }`
    * when nothing consumed it.
    *
    * @returns An unsubscribe function.
    * @throws If not called on a modal layer.
    */
    useModalMissListener(cb: ModalMissCallback, options?: ModalMissOptions): () => void {
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
    buildPipelineContext(input: string, key: unknown): PipelineContext {
        const eventNames = this.state._normalizeKeyNames(input, key);
        const topComponent = this.state.path.length > 0 ? this.state.path[this.state.path.length - 1] : null;
        const activeOverlays = this.state.displayedOverlays.filter(o => this.state.activeOverlayIds.has(o.id));

        return {
            input,
            eventNames,
            topComponent,
            globalKeys: this.state.globalKeysRef,
            globalSequences: this.state.globalSequencesRef,
            activeOverlays,
            activeCount: this.state.activeOverlayIds.size,
            wildcardFirst: this.state.wildcardPriorityCountRef > 0,
            screenPath: [...this.state.path],
            activeModalId: this.state.activeModalIdRef,
            layersRef: this.state._layersWrapper,
            pendingSeqRef: this.state._pendingSeqWrapper,
            notifyFocusChange: () => this.layers.notifyFocusChange(),
            notifyPendingSyncs: () => this.notifyPendingSyncs(),
            anyOverlayConsumed: false,
            currentMode: this.state.currentModeRef,
            conditions: this.state.conditions,
            key,
        } as PipelineContext;
    }

    /**
     * Process a keyboard event through the full processor pipeline.
     *
     * Builds a snapshot context from the engine's current state, then runs
     * each processor in order. The first processor that returns `true`
     * (event consumed) stops the chain.
     *
     * @param input - Raw character string from the host framework's keyboard event.
     * @param key   - Full key descriptor from the host framework (shape defined by `normalizeKeyNames`).
     * @returns `true` if any processor consumed the event, `false` if it fell through.
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
