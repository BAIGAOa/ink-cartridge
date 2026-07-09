import {
    EngineOverlayEntry,
    EngineModalEntry,
    ResolvedGlobalSequenceEntry,
    GlobalPendingSequence,
    ShortcutOperationEntry,
    SequenceOperationEntry,
    ScreenKeyboardLayer,
    KeyHandler,
    BoundKeyboardOptions,
    BoundKeyEntry,
    PenetrationOptions,
    StopOptions,
    AllowModalOptions,
    SequenceOptions,
    SequenceBinding,
    ModalMissCallback,
    ModalMissOptions,
    GlobalKeyEntry,
    GlobalSequenceEntry,
    ResolvedGlobalKeyEntry,
    PipelineProcessor,
    KeyboardProcessorProps,
    PipelineContext,
    MutableRef,
} from "./types.js";
import {
    KeyRuleContainer,
    pushKeyEntries,
    finalizeBoundKeyboard,
    setIfAbsent,
    deleteIfPresent,
    modifyEntryKeys,
} from "./providers/helpers.js";
import { createModalProcessor } from "./processors/modal.js";
import { createGlobalSequenceProcessor } from "./processors/globalSequence.js";
import { createGlobalKeyProcessor } from "./processors/globalKey.js";
import { createOverlayProcessor } from "./processors/overlay.js";
import { createScreenStackProcessor } from "./processors/screenStack.js";
import { _insertRelative } from "./pipeline/chain.js";

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

    /**
     * Current navigation path from root to active screen.
     * Updated by {@link sync}.
     */
    path: TComponent[] = []
    /** Set of overlay IDs currently receiving keyboard events. */
    activeOverlayIds: Set<string> = new Set()
    /** All open overlays, sorted by zIndex ascending. */
    displayedOverlays: EngineOverlayEntry[] = []
    /** ID of the currently active modal (highest zIndex), or null. */
    activeModalIdRef: string | null = null
    /** All open modals, sorted by zIndex ascending. */
    displayedModalsRef: EngineModalEntry[] = []

    /** Set of registered mode names. */
    modesRef: Set<string>
    /** Currently active mode, or null (no-mode). */
    currentModeRef: string | null

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
    shortcutOperationsRef: Map<string, { action: () => void; keys?: string[] }> = new Map();

    /**
     * Maps sequenceActionId → { action, keys, timeout }.
     * Same key-not-in-value pattern as shortcutOperationsRef.
     */
    sequenceOperationsRef: Map<string, { action: () => void; keys?: string[]; timeout?: number }> = new Map();

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
    _processors: PipelineProcessor[] = []

    /** The host-provided key-name normalizer, wired at construction. */
    _normalizeKeyNames: (input: string, key: unknown) => string[]

    /**
     * Persistent wrapper for `layersRef` so pipeline processors see the same
     * Map across invocations. Processors mutate the Map in place (get/set/delete),
     * so reassignment is never needed — a plain `{ current }` object is sufficient.
     */
    _layersWrapper: MutableRef<Map<unknown | string, ScreenKeyboardLayer>>
    /**
     * Persistent wrapper for `globalPendingSeqRef` that propagates writes back
     * to the engine property. Uses a getter/setter because the global-sequence
     * processor reassigns `pendingSeqRef.current` (it does NOT mutate in place),
     * and without write-back the next `processKey` call would see a stale value.
     */
    _pendingSeqWrapper: MutableRef<GlobalPendingSequence | null>

    /**
     * @param props - Engine configuration.
     *   `normalizeKeyNames` is required — the engine has no built-in default
     *   so each framework must provide its own adapter.
     */
    constructor(props: EngineProps) {
        this.modesRef = new Set(props.modes ?? [])
        this.currentModeRef = props.defaultMode ?? null
        this._processors = this._buildDefaultProcessors(props.processors)
        this._normalizeKeyNames = props.normalizeKeyNames
        this._layersWrapper = { current: this.layersRef }
        const self = this
        this._pendingSeqWrapper = {
            get current() { return self.globalPendingSeqRef },
            set current(v) { self.globalPendingSeqRef = v },
        }
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
        this.path = state.path
        this.activeOverlayIds = new Set(state.activeOverlayIds)
        this.displayedOverlays = state.displayedOverlays
        this.activeModalIdRef = state.activeModalId
        this.displayedModalsRef = state.displayedModals
    }

    /**
     * Snapshot of the previous sync's path, used by {@link cleanLayers} to
     * detect removed screens.
     */
    prevPathRef: TComponent[] = []
    /** Snapshot of previous overlay IDs for removal detection. */
    prevOverlayIdsRef: Set<string> = new Set()
    /** Snapshot of previous modal IDs for removal detection. */
    prevModalIdsRef: Set<string> = new Set()

    /**
     * Remove keyboard layers for screens that are no longer in the current path.
     * Also clears any pending sequence timers on removed layers to prevent
     * stale timeouts from firing after the layer is gone.
     */
    cleanLayers() {
        const prev = this.prevPathRef;
        for (const comp of prev) {
            if (!this.path.includes(comp)) {
                const layer = this.layersRef.get(comp);
                if (layer?.pendingSequence) {
                    clearTimeout(layer.pendingSequence.timer);
                    layer.pendingSequence = null;
                }
                this.layersRef.delete(comp);
            }
        }
        this.prevPathRef = this.path;
    }

    /** Remove keyboard layers for overlays that have been closed. */
    cleanOverlayLayers() {
        const currentIds = new Set(this.displayedOverlays.map(o => o.id));

        for (const prevId of this.prevOverlayIdsRef) {
            if (!currentIds.has(prevId)) {
                const layer = this.layersRef.get(prevId);
                if (layer?.pendingSequence) {
                    clearTimeout(layer.pendingSequence.timer);
                    layer.pendingSequence = null;
                }
                this.layersRef.delete(prevId);
            }
        }

        this.prevOverlayIdsRef = currentIds;
    }

    /** Remove keyboard layers for modals that have been closed. */
    cleanModalLayers() {
        const currentIds = new Set(this.displayedModalsRef.map(m => m.id));

        for (const prevId of this.prevModalIdsRef) {
            if (!currentIds.has(prevId)) {
                const layer = this.layersRef.get(prevId);
                if (layer?.pendingSequence) {
                    clearTimeout(layer.pendingSequence.timer);
                    layer.pendingSequence = null;
                }
                this.layersRef.delete(prevId);
            }
        }

        this.prevModalIdsRef = currentIds;
    }

    /**
     * Push a new owner onto the owner stack so that keyboard bindings in
     * an overlay or modal are attributed to that overlay/modal rather than
     * the underlying screen.
     */
    pushOwner(owner: TComponent | string) {
        this.ownerStackRef = [...this.ownerStackRef, owner];
    }

    /**
     * Remove the most recent matching owner from the stack.
     * Uses `lastIndexOf` to remove from the end so that nested owners of the
     * same type (e.g. two overlays with the same component) are unwound correctly.
     */
    popOwner(owner: TComponent | string) {
        const stack = this.ownerStackRef;
        const idx = stack.lastIndexOf(owner);
        if (idx !== -1) {
            this.ownerStackRef = [
                ...stack.slice(0, idx),
                ...stack.slice(idx + 1),
            ];
        }
    }

    /**
     * Get or create the keyboard layer for an owner (screen component or
     * overlay/modal ID). When the owner is a string, the engine checks
     * {@link displayedModalsRef} and {@link displayedOverlays} to determine
     * the correct layer kind — this is necessary because string owners carry
     * no inherent layer-kind information.
     */
    getLayer(owner: TComponent | string) {
        let layer = this.layersRef.get(owner);
        if (!layer) {
            let kind: 'screen' | 'overlay' | 'modal' = 'screen'
            if (typeof owner === 'string') {
                if (this.displayedModalsRef.some(m => m.id === owner)) {
                    kind = 'modal'
                } else if(this.displayedOverlays.some(m => m.id === owner)) {
                    kind = 'overlay'
                }
            }

            layer = {
                kind,
                bindings: [],
                penetrationKeys: [],
                stoppedKeys: [],
                allowedKeys: [],
                globalKeyOverrides: new Set(),
                focusTargets: new Map(),
                focusOrder: [],
                currentFocusId: null,
                actionKeysMap: new Map(),
                sequences: new Map(),
                pendingSequence: null,
            }
            this.layersRef.set(owner, layer)
        }
        return layer
    }

    /**
     * Return the current binding owner — the top of the owner stack if
     * non-empty, otherwise the top of the screen path.
     */
    getCurrentOwner(): TComponent | string | null {
        const stack = this.ownerStackRef;
        if (stack.length > 0) return stack[stack.length - 1];
        if (this.path.length === 0) return null;
        return this.path[this.path.length - 1];
    }

    /** Notify all registered focus-change listeners. */
    notifyFocusChange() {
        this.focusSubscribersRef.forEach(fn => fn());
    }

    /**
     * Clear a pending sequence on a layer and cancel its timeout.
     * Safe to call when no sequence is pending (no-op).
     */
    clearPendingSequence(layer: ScreenKeyboardLayer) {
        if (layer.pendingSequence !== null) {
            clearTimeout(layer.pendingSequence.timer);
            layer.pendingSequence = null;
        }
    }

    /**
     * Get or create a named focus target on a layer.
     * If this is the first focus target on the layer, it is auto-activated.
     */
    getOrCreateFocusTarget(layer: ScreenKeyboardLayer, focusId: string) {
        let target = layer.focusTargets.get(focusId);
        if (!target) {
            target = {
                bindings: [],
                penetrationKeys: [],
                stoppedKeys: [],
                allowedKeys: [],
                actionKeysMap: new Map(),
            };
            layer.focusTargets.set(focusId, target);
            layer.focusOrder.push(focusId);
            if (layer.currentFocusId === null) {
                layer.currentFocusId = focusId;
                this.notifyFocusChange();
            }
        }
        return target;
    }

    /**
     * Read a layer without creating it. Returns `undefined` when no layer
     * exists for the given owner.
     */
    readLayer(owner: TComponent | string) {
        return this.layersRef.get(owner);
    }

    /**
     * Subscribe to focus changes. Returns an unsubscribe function.
     * Use this in UI frameworks to track when the active focus target moves
     * (e.g. Tab navigation, programmatic focusSet).
     */
    subscribeFocus(listener: () => void) {
        this.focusSubscribersRef.add(listener);
        return () => { this.focusSubscribersRef.delete(listener); };
    }

    /**
     * Activate a named focus target on the current owner's layer.
     *
     * @throws If the current owner has no layer or the focus target is not registered.
     */
    focusSet(focusId: string) {
        const owner = this.getCurrentOwner();
        if (!owner) return;
        const ownerName = typeof owner === 'string' ? owner : ((owner as any).displayName || (owner as any).name || 'Unknown');
        const layer = this.layersRef.get(owner);
        if (!layer) {
            throw new Error(
                `focusSet("${focusId}"): no keyboard layer found for "${ownerName}". ` +
                `Did you forget to wrap the screen in a keyboard provider?`,
            );
        }
        this.clearPendingSequence(layer);
        if (!layer.focusTargets.has(focusId)) {
            const available = layer.focusOrder.length > 0
                ? layer.focusOrder.map(id => `"${id}"`).join(', ')
                : '(none)';
            throw new Error(
                `focusSet("${focusId}"): focus target not found on "${ownerName}". ` +
                `Available targets: ${available}`,
            );
        }
        if (layer.currentFocusId !== focusId) {
            layer.currentFocusId = focusId;
            this.notifyFocusChange();
        }
    }

    /** Cycle to the next focus target (Tab). Wraps around. */
    focusNext() {
        const owner = this.getCurrentOwner();
        if (!owner) return;
        const layer = this.layersRef.get(owner);
        if (!layer || layer.focusOrder.length === 0) return;

        this.clearPendingSequence(layer);

        const current = layer.currentFocusId;
        let idx = current ? layer.focusOrder.indexOf(current) : -1;
        idx = (idx + 1) % layer.focusOrder.length;
        layer.currentFocusId = layer.focusOrder[idx];
        this.notifyFocusChange();
    }

    /** Cycle to the previous focus target (Shift+Tab). Wraps around. */
    focusPrev() {
        const owner = this.getCurrentOwner();
        if (!owner) return;
        const layer = this.layersRef.get(owner);
        if (!layer || layer.focusOrder.length === 0) return;

        this.clearPendingSequence(layer);

        const current = layer.currentFocusId;
        let idx = current ? layer.focusOrder.indexOf(current) : -1;
        idx = idx <= 0 ? layer.focusOrder.length - 1 : idx - 1;
        layer.currentFocusId = layer.focusOrder[idx];
        this.notifyFocusChange();
    }

    /**
     * Return the currently active focus target id, or null when no focus
     * targets exist on the current layer.
     */
    focusCurrent(): string | null {
        const owner = this.getCurrentOwner();
        if (!owner) return null;
        const layer = this.layersRef.get(owner);
        return layer?.currentFocusId ?? null;
    }

    /**
     * Remove a focus target from the current layer. If the removed target
     * was the active one, the first remaining target (in registration order)
     * is activated automatically.
     */
    focusUnregister(focusId: string) {
        const owner = this.getCurrentOwner();
        if (!owner) return;
        const layer = this.layersRef.get(owner);
        if (!layer) return;

        const wasFocused = layer.currentFocusId === focusId;
        layer.focusTargets.delete(focusId);
        layer.focusOrder = layer.focusOrder.filter(id => id !== focusId);

        if (wasFocused) {
            layer.currentFocusId =
                layer.focusOrder.length > 0 ? layer.focusOrder[0] : null;
            this.notifyFocusChange();
        }
    }

    /**
     * Register a mode name. Modes must be registered before use in
     * `setMode`, `nextMode`, or `prevMode`.
     *
     * @returns `true` if added, `false` if already registered.
     */
    addMode(mode: string) {
        if (this.modesRef.has(mode)) {
            return false;
        }
        this.modesRef.add(mode);
        return true;
    }

    /** @returns `true` if the mode existed and was removed. */
    removeMode(mode: string) {
        return this.modesRef.delete(mode);
    }

    /**
     * Switch to a specific mode. Pass `null` to exit all modes.
     *
     * @returns `true` if the switch succeeded, `false` if the mode is not
     *          registered.
     */
    setMode(mode: string | null) {
        if (typeof mode === "string" && !this.modesRef.has(mode)) {
            return false;
        }
        this.currentModeRef = mode;
        return true;
    }

    /** Cycle to the next mode in registration order. Wraps around. */
    nextMode() {
        const modes = Array.from(this.modesRef);
        if (modes.length === 0) return;
        const currentIndex = modes.indexOf(this.currentModeRef ?? '');
        const nextIndex = (currentIndex + 1) % modes.length;
        this.currentModeRef = modes[nextIndex];
    }

    /** Cycle to the previous mode in registration order. Wraps around. */
    prevMode() {
        const modes = Array.from(this.modesRef);
        if (modes.length === 0) return;
        const currentIndex = modes.indexOf(this.currentModeRef ?? '');
        const prevIndex = (currentIndex - 1 + modes.length) % modes.length;
        this.currentModeRef = modes[prevIndex];
    }

    /** @returns The active mode, or `null` in no-mode state. */
    getCurrentMode() {
        return this.currentModeRef;
    }

    /**
     * Register a named condition for `when: "conditionId"` references.
     *
     * @returns `true` if registered, `false` if the id already exists.
     */
    addCondition(id: string, defaultVal: boolean) {
        if (this.conditions.has(id)) {
            return false;
        }
        this.conditions.set(id, defaultVal);
        return true;
    }

    /** @returns `true` if the condition existed and was removed. */
    removeCondition(target: string) {
        return this.conditions.delete(target);
    }

    /**
     * Update a condition's value. Bindings referencing this condition via
     * `when: "id"` use the new value on the next key event.
     *
     * @returns `true` if updated, `false` if the condition is not registered.
     */
    setCondition(target: string, value: boolean) {
        if (!this.conditions.has(target)) {
            return false;
        }
        this.conditions.set(target, value);
        return true;
    }

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
    enableWildcardPriority() {
        this.wildcardPriorityCountRef += 1;
        let disabled = false;
        return () => {
            if (disabled) return;
            disabled = true;
            this.wildcardPriorityCountRef = Math.max(0, this.wildcardPriorityCountRef - 1);
        };
    }

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
        const createBoundKeyEntry = (
            keys: string[],
            handler: KeyHandler | string,
            onlyThis: boolean,
            owner: TComponent | string,
        ): BoundKeyEntry => {
            if (typeof handler === 'string') {
                const entry = this.shortcutOperationsRef.get(handler);
                if (!entry) {
                    throw new Error(
                        `[Ink-Cartridge] The shortcut key you used does not exist with ID ${handler}`,
                    );
                }
                return { keys, handler: entry.action, onlyThis, owner };
            }
            return { keys, handler, onlyThis, owner };
        };

        const applyGlobalKeyOverrides = (
            keys: string[],
            owner: TComponent | string,
            layer: ScreenKeyboardLayer,
            bindingContext: string,
        ): void => {
            for (const gk of this.globalKeysRef) {
                const gkKeys = Array.isArray(gk.key) ? gk.key : [gk.key];
                const matchingKeys = gkKeys.filter((k) => keys.includes(k));
                if (matchingKeys.length === 0) continue;

                const isOverlayOwner = typeof owner === 'string';
                const cat = gk.category;
                let inCategory = false;

                if (!isOverlayOwner) {
                    if (cat === undefined || cat === '*') {
                        inCategory = true;
                    } else if (Array.isArray(cat)) {
                        inCategory = cat.includes(owner);
                    }
                    if (!inCategory) continue;
                }

                const cover = gk.cover ?? true;
                const affectOverlay = gk.affectOverlay ?? false;

                if (isOverlayOwner) {
                    if (!affectOverlay) continue;
                    if (!cover) {
                        throw new Error(
                            `[Ink-Cartridge] Overlay "${owner}" ` +
                            `attempted to bind "${matchingKeys[0]}" via ${bindingContext}, ` +
                            `but this key is already declared in globalKeys with cover: false, so overriding is not allowed.`,
                        );
                    }
                } else {
                    if (affectOverlay) continue;
                    if (!cover) {
                        const ownerName = (owner as any).displayName || (owner as any).name || 'anonymous';
                        throw new Error(
                            `[Ink-Cartridge] Component "${ownerName}" ` +
                            `attempted to bind "${matchingKeys[0]}" via ${bindingContext}, ` +
                            `but this key is already declared in globalKeys with cover: false, so overriding is not allowed.`,
                        );
                    }
                }

                for (const k of matchingKeys) {
                    layer.globalKeyOverrides.add(k);
                }
            }
        };

        if (typeof keysOrActionId === 'string' && typeof handlerOrOptions !== 'function' && typeof handlerOrOptions !== 'string') {
            const actionId = keysOrActionId;
            const options = handlerOrOptions as BoundKeyboardOptions;
            const entry = this.shortcutOperationsRef.get(actionId);
            if (!entry) {
                throw new Error(`[Ink-Cartridge] Action "${actionId}" is not registered.`);
            }
            if (!entry.keys || entry.keys.length === 0) {
                throw new Error(
                    `[Ink-Cartridge] Action "${actionId}" does not have predefined keys. Please register with keys field or call boundKeyboard with explicit keys.`,
                );
            }
            return this.boundKeyboard(entry.keys, actionId, options);
        }

        const keys = Array.isArray(keysOrActionId) ? keysOrActionId : [keysOrActionId];
        const handler = handlerOrOptions as KeyHandler | string;
        const options = maybeOptions;

        const owner = this.getCurrentOwner();
        if (!owner) {
            throw new Error(
                '[Ink-Cartridge] boundKeyboard() must be called inside a screen component or overlay. There is currently no active screen.',
            );
        }

        if (options?.times !== undefined && options.times < 1) {
            throw new Error(
                '[Ink-Cartridge] boundKeyboard() times option must be >= 1.',
            );
        }

        if (options?.times === undefined && options?.observer) {
            throw new Error(
                '[Ink-Cartridge] boundKeyboard() observer option requires times option to be set.',
            );
        }

        const layer = this.getLayer(owner);

        if (options?.focusId) {
            const fid = options.focusId;
            const target = this.getOrCreateFocusTarget(layer, fid);

            applyGlobalKeyOverrides(keys, owner, layer, `focusId="${fid}"`);

            const entry = createBoundKeyEntry(keys, handler, options?.onlyThis ?? false, owner);
            entry.when = options?.when;
            entry.mode = options?.mode;

            target.bindings.push(entry);

            return finalizeBoundKeyboard(
                target.bindings,
                target.actionKeysMap,
                layer,
                entry,
                handler,
                keys,
                options,
            );
        }

        applyGlobalKeyOverrides(keys, owner, layer, 'boundKeyboard');

        const entry = createBoundKeyEntry(keys, handler, options?.onlyThis ?? false, owner);
        entry.when = options?.when;
        entry.mode = options?.mode;

        layer.bindings.push(entry);

        return finalizeBoundKeyboard(
            layer.bindings,
            layer.actionKeysMap,
            layer,
            entry,
            handler,
            keys,
            options,
        );
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
        const owner = this.getCurrentOwner();
        if (!owner) {
            throw new Error('[Ink-Cartridge] penetration() must be called inside a screen component or overlay.');
        }
        const layer = this.getLayer(owner);
        const compiledWhen = options?.when;

        const container: KeyRuleContainer = options?.focusId
            ? this.getOrCreateFocusTarget(layer, options.focusId)
            : layer;
        return pushKeyEntries(container, 'penetrationKeys', keys, (key) => ({
            key,
            when: compiledWhen,
        }));
    }

    /**
     * Prevent keys from propagating beyond the current layer. Supports
     * `stopAction: true` to resolve action IDs to their bound keys.
     *
     * @returns A function that removes the stop barrier.
     * @throws If there is no current owner.
     */
    stop(keys: string[], options?: StopOptions): () => void {
        const owner = this.getCurrentOwner();
        if (!owner) {
            throw new Error('[Ink-Cartridge] stop() must be called inside a screen component or overlay.');
        }
        const layer = this.getLayer(owner);

        let effectiveKeys: string[] = keys;
        if (options?.stopAction) {
            const map = options.focusId
                ? this.getOrCreateFocusTarget(layer, options.focusId).actionKeysMap
                : layer.actionKeysMap;
            const merged: string[] = [];
            const ownerName = typeof owner === 'string' ? owner : ((owner as any).displayName || (owner as any).name || 'Unknown');
            for (const actionId of keys) {
                const boundKeys = map.get(actionId);
                if (!boundKeys) {
                    throw new Error(
                        `[Ink-Cartridge] stop(["${actionId}"], { stopAction: true }) on "${ownerName}": ` +
                        `action "${actionId}" is not registered or has no keys bound. ` +
                        `Register it with defineShortcutAction() and bind it with boundKeyboard() first.`,
                    );
                }
                for (const k of boundKeys) {
                    if (!merged.includes(k)) merged.push(k);
                }
            }
            effectiveKeys = merged;
        }

        const compiledWhen = options?.when;

        const container: KeyRuleContainer = options?.focusId
            ? this.getOrCreateFocusTarget(layer, options.focusId)
            : layer;
        return pushKeyEntries(container, 'stoppedKeys', effectiveKeys, (key) => ({
            key,
            when: compiledWhen,
        }));
    }

    /**
     * Allow specific keys to pass through the modal barrier. By default the
     * active modal consumes every key event — even unbound keys. Adding a key
     * to the allow list releases it to lower pipeline stages.
     *
     * @throws If not called on a modal layer.
     */
    allowModal(keys: string[], options?: AllowModalOptions): () => void {
        const owner = this.getCurrentOwner();
        if (!owner) {
            throw new Error('[Ink-Cartridge] allowModal() must be called inside a modal component.');
        }
        const layer = this.getLayer(owner);

        if (layer.kind !== 'modal') {
            throw new Error(
                '[Ink-Cartridge] allowModal() can only be used on a modal layer.',
            );
        }

        const container: KeyRuleContainer = options?.focusId
            ? this.getOrCreateFocusTarget(layer, options.focusId)
            : layer;
        return pushKeyEntries(container, 'allowedKeys', keys, (key) => ({ key, when: options?.when }));
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
        if (typeof keysOrActionId === 'string' && (typeof handlerOrOptions === 'undefined' || typeof handlerOrOptions === 'object')) {
            const actionId = keysOrActionId;
            const options = handlerOrOptions as SequenceOptions | undefined;
            const entry = this.sequenceOperationsRef.get(actionId);
            if (!entry) {
                throw new Error(
                    `[Ink-Cartridge] Sequence action "${actionId}" is not registered.`,
                );
            }
            if (!entry.keys || entry.keys.length === 0) {
                throw new Error(
                    `[Ink-Cartridge] Sequence action "${actionId}" does not have predefined keys. Please register with a keys field or call boundSequence with explicit keys.`,
                );
            }
            const mergedOptions: SequenceOptions = {
                ...(entry.timeout !== undefined ? { timeout: entry.timeout } : {}),
                ...options,
            };
            return this.boundSequence(entry.keys, entry.action, mergedOptions);
        }

        const keys = Array.isArray(keysOrActionId) ? keysOrActionId : [keysOrActionId];
        const handler = handlerOrOptions as KeyHandler;
        const options = maybeOptions;

        const owner = this.getCurrentOwner();
        if (!owner) {
            throw new Error(
                '[Ink-Cartridge] boundSequence() must be called inside a screen component or overlay.',
            );
        }
        if (keys.length < 2) {
            throw new Error(
                '[Ink-Cartridge] boundSequence() requires at least 2 keys in the sequence.'
            );
        }

        const isOverlayOwner = typeof owner === 'string';
        const firstKey = keys[0];
        for (const gs of this.globalSequencesRef) {
            if (gs.cover !== false) continue;
            if (gs.keys[0] !== firstKey) continue;
            if (isOverlayOwner) {
                if (!(gs.affectOverlay ?? false)) continue;
            } else {
                const cat = gs.category;
                if (cat !== undefined && cat !== '*') {
                    if (Array.isArray(cat) && !cat.includes(owner)) continue;
                }
            }
            const ownerName = isOverlayOwner ? owner : ((owner as any).displayName || (owner as any).name || 'anonymous');
            throw new Error(
                `[Ink-Cartridge] ${isOverlayOwner ? `Overlay "${ownerName}"` : `Component "${ownerName}"`} ` +
                `attempted to bind sequence [${keys.join(', ')}] via boundSequence, ` +
                `but the first key "${firstKey}" is already declared in globalSequence ` +
                `with cover: false, so overriding is not allowed.`,
            );
        }

        const layer = this.getLayer(owner);

        const binding: SequenceBinding = {
            keys,
            handler,
            timeout: options?.timeout,
            options,
            when: options?.when,
        };

        const existing = layer.sequences.get(firstKey) || [];
        existing.push(binding);
        layer.sequences.set(firstKey, existing);

        return () => {
            const arr = layer.sequences.get(firstKey);
            if (arr) {
                const idx = arr.indexOf(binding);
                if (idx !== -1) arr.splice(idx, 1);
                if (arr.length === 0) layer.sequences.delete(firstKey);
            }
        };
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
        const owner = this.getCurrentOwner();
        if (!owner) return () => {};
        const layer = this.getLayer(owner);

        if (layer.kind !== 'modal') {
            throw new Error(
                '[Ink-Cartridge] useModalMissListener() can only be used on a modal layer.',
            );
        }
        layer.onMiss = cb;
        layer.onMissOptions = options;
        return () => {
            if (layer.onMiss === cb) {
                layer.onMiss = undefined;
                layer.onMissOptions = undefined;
            }
        };
    }

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
        const processed = entries.map((each) => {
            if (each.times !== undefined && each.times < 1) {
                throw new Error(
                    '[Ink-Cartridge] globalKeys() times option must be >= 1.',
                );
            }

            if (each.times === undefined && each.observer) {
                throw new Error(
                    '[Ink-Cartridge] globalKeys() observer option requires times option to be set.',
                );
            }

            if (typeof each.operate === 'string') {
                const entry = this.shortcutOperationsRef.get(each.operate);
                if (!entry) {
                    throw new Error(`[Ink-Cartridge]You want to call the shortcut ${each.operate} in the global key, but it is not registered`);
                }

                return {
                    key: each.key,
                    operate: entry.action,
                    cover: each.cover,
                    category: each.category,
                    affectOverlay: each.affectOverlay,
                    times: each.times,
                    pressCount: each.times !== undefined ? 0 : undefined,
                    observer: each.observer,
                    executeWhenNoOverlay: each.executeWhenNoOverlay,
                    when: each.when,
                    mode: each.mode,
                };
            }
            return {
                key: each.key,
                operate: each.operate,
                cover: each.cover,
                category: each.category,
                affectOverlay: each.affectOverlay,
                times: each.times,
                pressCount: each.times !== undefined ? 0 : undefined,
                observer: each.observer,
                executeWhenNoOverlay: each.executeWhenNoOverlay,
                when: each.when,
                mode: each.mode,
            };
        });

        if (options?.mode === 'add') {
            this.globalKeysRef = [...this.globalKeysRef, ...processed];
        } else {
            this.globalKeysRef = processed;
        }
    }

    /** @returns A shallow copy of all registered global key entries. */
    getGlobalKeys(): ResolvedGlobalKeyEntry[] {
        return this.globalKeysRef;
    }

    /** @returns A shallow copy of all registered global sequence entries. */
    getGlobalSequences(): ResolvedGlobalSequenceEntry[] {
        return [...this.globalSequencesRef];
    }

    /** @returns The current global pending sequence state, or null. */
    getGlobalPendingSequence(): GlobalPendingSequence | null {
        return this.globalPendingSeqRef;
    }

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
        const resolved: ResolvedGlobalSequenceEntry[] = entries.map((entry) => {
            if (typeof entry.operate === 'string') {
                const actionEntry = this.sequenceOperationsRef.get(entry.operate);
                if (!actionEntry) {
                    throw new Error(
                        `[Ink-Cartridge] You want to call the sequence action "${entry.operate}" in globalSequence, but it is not registered.`,
                    );
                }
                return { ...entry, operate: actionEntry.action };
            }
            return { ...entry, operate: entry.operate };
        });

        for (const entry of resolved) {
            if (entry.keys.length < 2) {
                throw new Error(
                    '[Ink-Cartridge] globalSequence() requires at least 2 keys per sequence.',
                );
            }
        }

        if (options?.mode === 'add') {
            this.globalSequencesRef = [...this.globalSequencesRef, ...resolved];
        } else {
            if (this.globalPendingSeqRef) {
                clearTimeout(this.globalPendingSeqRef.timer);
                this.globalPendingSeqRef = null;
            }
            this.globalSequencesRef = resolved;
        }
    }

    /**
     * Register named shortcut actions that can be referenced by key bindings
     * via string identifier instead of inline callbacks.
     *
     * @throws If any `actionId` is duplicated.
     */
    defineShortcutAction(entries: ShortcutOperationEntry[]) {
        for (const each of entries) {
            setIfAbsent(this.shortcutOperationsRef, each.actionId, {
                action: each.action,
                keys: each.keys,
            }, `[Ink-Cartridge] Duplicate shortcut cannot be defined with ID ${each.actionId}`);
        }
    }

    /** Register named sequence actions. @throws If any id is duplicated. */
    defineSequenceAction(entries: SequenceOperationEntry[]) {
        for (const each of entries) {
            setIfAbsent(this.sequenceOperationsRef, each.sequenceActionId, {
                action: each.action,
                keys: each.keys,
                timeout: each.timeout,
            }, `[Ink-Cartridge] Sequence Action ${each.sequenceActionId} may not be defined repeatedly`);
        }
    }

    /**
     * Modify the keys (and optionally timeout) of an existing sequence action.
     *
     * @throws If the action does not exist or has no preset keys/timeout.
     */
    modifySequenceAction(actionId: string, keys: string[], timeout?: number) {
        const entry = modifyEntryKeys(
            this.sequenceOperationsRef,
            actionId,
            keys,
            `[Ink-Cartridge] Key not registered to Sequence Action cannot be modified, target ID is ${actionId}`,
            `[Ink-Cartridge] The target Sequence Action has no preset Keys. You cannot modify it. The ID is ${actionId}.`,
        );
        if (timeout) {
            if (entry.timeout === undefined) {
                throw new Error(
                    `[Ink-Cartridge] Target Sequence Action has no default Timeout, you cannot modify, ID is ${actionId}`,
                );
            }
            entry.timeout = timeout;
        }
    }

    /**
     * Modify the default keys of an existing shortcut action.
     * @throws If the action does not exist or was not registered with a `keys` field.
     */
    modifyAction(actionId: string, keys: string[]) {
        modifyEntryKeys(
            this.shortcutOperationsRef,
            actionId,
            keys,
            `[Ink-Cartridge] Cannot modify action "${actionId}": action not registered.`,
            `[Ink-Cartridge] Cannot modify action "${actionId}": action was not registered with a 'keys' field.`,
        );
    }

    /** Add a single sequence action. @throws If the id already exists. */
    addSequenceAction(entry: SequenceOperationEntry) {
        setIfAbsent(this.sequenceOperationsRef, entry.sequenceActionId, {
            action: entry.action,
            keys: entry.keys,
            timeout: entry.timeout,
        }, `[Ink-Cartridge] Sequence Action ${entry.sequenceActionId} may not be defined repeatedly`);
    }

    /** @returns `true` if the sequence action is registered. */
    hasSequenceAction(sequenceActionId: string): boolean {
        return this.sequenceOperationsRef.has(sequenceActionId);
    }

    /** Remove a registered sequence action. @throws If not registered. */
    removeSequenceAction(sequenceActionId: string) {
        deleteIfPresent(this.sequenceOperationsRef, sequenceActionId, `[Ink-Cartridge] Cannot remove sequence action "${sequenceActionId}": action not registered.`);
    }

    /** Clear all registered sequence operations. */
    clearSequenceOperations() {
        this.sequenceOperationsRef.clear();
    }

    /** Add a single shortcut action. @throws If the actionId already exists. */
    addAction(entry: ShortcutOperationEntry) {
        setIfAbsent(this.shortcutOperationsRef, entry.actionId, {
            action: entry.action,
            keys: entry.keys,
        }, `[Ink-Cartridge] Duplicate shortcut cannot be defined with ID ${entry.actionId}`);
    }

    /** @returns `true` if the shortcut action is registered. */
    hasAction(actionId: string): boolean {
        return this.shortcutOperationsRef.has(actionId);
    }

    /** Remove a registered shortcut action. @throws If not registered. */
    removeAction(actionId: string) {
        deleteIfPresent(this.shortcutOperationsRef, actionId, `[Ink-Cartridge] Cannot remove action "${actionId}": action not registered.`);
    }

    /** Clear all registered shortcut operations. */
    clearShortcutOperations() {
        this.shortcutOperationsRef.clear();
    }

    /**
     * Build the canonical 7-stage processor pipeline and inject any custom
     * processors passed at construction.
     *
     * Priority order (highest first):
     *   0. Modal
     *   1. GlobalSequence (affectOverlay: true)
     *   2. GlobalKey      (affectOverlay: true)
     *   3. Overlay broadcast
     *   4. GlobalSequence (affectOverlay: false)
     *   5. GlobalKey      (affectOverlay: false)
     *   6. Screen stack
     *
     * Custom processors are inserted via index, before/after target, or appended.
     */
    _buildDefaultProcessors(custom?: KeyboardProcessorProps[]): PipelineProcessor[] {
        const defaults: PipelineProcessor[] = [
            createModalProcessor(),
            createGlobalSequenceProcessor({ affectOverlay: true }),
            createGlobalKeyProcessor({ affectOverlay: true }),
            createOverlayProcessor(),
            createGlobalSequenceProcessor({ affectOverlay: false }),
            createGlobalKeyProcessor({ affectOverlay: false }),
            createScreenStackProcessor(),
        ];

        if (!custom || custom.length === 0) return defaults;

        return _insertRelative(defaults, custom);
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
        processor: PipelineProcessor,
        options?:
            | { before?: string }
            | { after?: string }
            | { index?: number },
    ): void {
        if (this._processors.some((p) => p.id === processor.id)) {
            throw new Error(
                `[ink-cartridge] Cannot add processor "${processor.id}": duplicate id`,
            );
        }

        const opts = options ?? {};

        if ("index" in opts && typeof opts.index === "number") {
            this._processors.splice(opts.index, 0, processor);
            return;
        }

        const target =
            "before" in opts ? opts.before : "after" in opts ? opts.after : undefined;

        if (target) {
            const kind = "before" in opts ? "before" : "after";
            const idx = this._processors.findIndex((p) => p.id === target);
            if (idx === -1) {
                throw new Error(
                    `[ink-cartridge] Cannot insert ${kind} "${target}": processor not found`,
                );
            }
            this._processors.splice(kind === "before" ? idx : idx + 1, 0, processor);
            return;
        }

        this._processors.push(processor);
    }

    /**
     * Remove a processor from this instance's pipeline by its id.
     * @returns `true` if found and removed, `false` if not found.
     */
    removeProcessor(processorId: string): boolean {
        const idx = this._processors.findIndex((each) => each.id === processorId);

        if (idx === -1) {
            return false;
        }

        this._processors.splice(idx, 1);
        return true;
    }

    /** @returns A read-only snapshot of the current processor pipeline. */
    getProcessors(): readonly PipelineProcessor[] {
        return this._processors;
    }

    /** Restore the processor pipeline to the default 7-stage chain. */
    resetProcessors(): void {
        this._processors = this._buildDefaultProcessors();
    }

    /**
     * Check whether a global multi-key sequence is currently pending
     * (i.e. the first key was pressed and the engine is waiting for
     * subsequent keys or a timeout).
     */
    thereGlobalQueueWaiting(sync?: () => void): boolean {
        if (sync) {
            this.pendingSyncs.add(sync);
        }
        return this.globalPendingSeqRef !== null;
    }

    /**
     * Check whether the current screen/overlay layer has an active
     * pending multi-key sequence (registered via {@link boundSequence}).
     * Unlike {@link thereGlobalQueueWaiting}, this only checks the layer
     * belonging to the current owner.
     *
     * @throws If there is no current owner (no active screen or overlay).
     */
    currentScreenHasSequenceWaiting(sync?: () => void): boolean {
        if (sync) {
            this.pendingSyncs.add(sync);
        }

        const owner = this.getCurrentOwner();

        if (!owner) {
            throw new Error(
                '[Ink-Cartridge] currentScreenHasSequenceWaiting() must be called inside a screen component or overlay. There is currently no active screen.',
            );
        }

        const layer = this.readLayer(owner);
        return layer?.pendingSequence !== null && layer?.pendingSequence !== undefined;
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
        const eventNames = this._normalizeKeyNames(input, key);
        const topComponent = this.path.length > 0 ? this.path[this.path.length - 1] : null;
        const activeOverlays = this.displayedOverlays.filter(o => this.activeOverlayIds.has(o.id));

        return {
            input,
            eventNames,
            topComponent,
            globalKeys: this.globalKeysRef,
            globalSequences: this.globalSequencesRef,
            activeOverlays,
            activeCount: this.activeOverlayIds.size,
            wildcardFirst: this.wildcardPriorityCountRef > 0,
            screenPath: [...this.path],
            activeModalId: this.activeModalIdRef,
            layersRef: this._layersWrapper,
            pendingSeqRef: this._pendingSeqWrapper,
            notifyFocusChange: () => this.notifyFocusChange(),
            notifyPendingSyncs: () => this.notifyPendingSyncs(),
            anyOverlayConsumed: false,
            currentMode: this.currentModeRef,
            conditions: this.conditions,
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
        for (const processor of this._processors) {
            if (processor.process(ctx)) {
                this.notifyPendingSyncs();
                return true;
            }
        }
        this.notifyPendingSyncs();
        return false;
    }

    private notifyPendingSyncs(): void {
        for (const sync of this.pendingSyncs) {
            sync();
        }
        this.pendingSyncs.clear();
    }

}
