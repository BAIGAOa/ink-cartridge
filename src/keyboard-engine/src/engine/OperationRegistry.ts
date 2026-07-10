import {
    ShortcutOperationEntry,
    SequenceOperationEntry,
    GlobalKeyEntry,
    GlobalSequenceEntry,
    ResolvedGlobalKeyEntry,
    ResolvedGlobalSequenceEntry,
    GlobalPendingSequence,
} from "../types.js";
import { setIfAbsent, deleteIfPresent, modifyEntryKeys } from "../providers/helpers.js";
import EngineState from "./EngineState.js";
import type LayerManager from "./LayerManager.js";

export default class OperationRegistry<TComponent = unknown> {
    constructor(
        private state: EngineState<TComponent>,
        private layers: LayerManager<TComponent>,
    ) {}

    addMode(mode: string) {
        if (this.state.modesRef.has(mode)) {
            return false;
        }
        this.state.modesRef.add(mode);
        return true;
    }

    removeMode(mode: string) {
        return this.state.modesRef.delete(mode);
    }

    setMode(mode: string | null) {
        if (typeof mode === "string" && !this.state.modesRef.has(mode)) {
            return false;
        }
        this.state.currentModeRef = mode;
        return true;
    }

    nextMode() {
        const modes = Array.from(this.state.modesRef);
        if (modes.length === 0) return;
        const currentIndex = modes.indexOf(this.state.currentModeRef ?? '');
        const nextIndex = (currentIndex + 1) % modes.length;
        this.state.currentModeRef = modes[nextIndex];
    }

    prevMode() {
        const modes = Array.from(this.state.modesRef);
        if (modes.length === 0) return;
        const currentIndex = modes.indexOf(this.state.currentModeRef ?? '');
        const prevIndex = (currentIndex - 1 + modes.length) % modes.length;
        this.state.currentModeRef = modes[prevIndex];
    }

    getCurrentMode() {
        return this.state.currentModeRef;
    }

    addCondition(id: string, defaultVal: boolean) {
        if (this.state.conditions.has(id)) {
            return false;
        }
        this.state.conditions.set(id, defaultVal);
        return true;
    }

    removeCondition(target: string) {
        return this.state.conditions.delete(target);
    }

    setCondition(target: string, value: boolean) {
        if (!this.state.conditions.has(target)) {
            return false;
        }
        this.state.conditions.set(target, value);
        return true;
    }

    enableWildcardPriority() {
        this.state.wildcardPriorityCountRef += 1;
        let disabled = false;
        return () => {
            if (disabled) return;
            disabled = true;
            this.state.wildcardPriorityCountRef = Math.max(0, this.state.wildcardPriorityCountRef - 1);
        };
    }

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
                const entry = this.state.shortcutOperationsRef.get(each.operate);
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
            this.state.globalKeysRef = [...this.state.globalKeysRef, ...processed];
        } else {
            this.state.globalKeysRef = processed;
        }
    }

    getGlobalKeys(): ResolvedGlobalKeyEntry[] {
        return this.state.globalKeysRef;
    }

    getGlobalSequences(): ResolvedGlobalSequenceEntry[] {
        return [...this.state.globalSequencesRef];
    }

    getGlobalPendingSequence(): GlobalPendingSequence | null {
        return this.state.globalPendingSeqRef;
    }

    globalSequence(entries: GlobalSequenceEntry[], options?: { mode?: 'replace' | 'add' }) {
        const resolved: ResolvedGlobalSequenceEntry[] = entries.map((entry) => {
            if (typeof entry.operate === 'string') {
                const actionEntry = this.state.sequenceOperationsRef.get(entry.operate);
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
            this.state.globalSequencesRef = [...this.state.globalSequencesRef, ...resolved];
        } else {
            if (this.state.globalPendingSeqRef) {
                clearTimeout(this.state.globalPendingSeqRef.timer);
                this.state.globalPendingSeqRef = null;
            }
            this.state.globalSequencesRef = resolved;
        }
    }

    defineShortcutAction(entries: ShortcutOperationEntry[]) {
        for (const each of entries) {
            setIfAbsent(this.state.shortcutOperationsRef, each.actionId, {
                action: each.action,
                keys: each.keys,
            }, `[Ink-Cartridge] Duplicate shortcut cannot be defined with ID ${each.actionId}`);
        }
    }

    defineSequenceAction(entries: SequenceOperationEntry[]) {
        for (const each of entries) {
            setIfAbsent(this.state.sequenceOperationsRef, each.sequenceActionId, {
                action: each.action,
                keys: each.keys,
                timeout: each.timeout,
            }, `[Ink-Cartridge] Sequence Action ${each.sequenceActionId} may not be defined repeatedly`);
        }
    }

    modifySequenceAction(actionId: string, keys: string[], timeout?: number) {
        const entry = modifyEntryKeys(
            this.state.sequenceOperationsRef,
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

    modifyAction(actionId: string, keys: string[]) {
        modifyEntryKeys(
            this.state.shortcutOperationsRef,
            actionId,
            keys,
            `[Ink-Cartridge] Cannot modify action "${actionId}": action not registered.`,
            `[Ink-Cartridge] Cannot modify action "${actionId}": action was not registered with a 'keys' field.`,
        );
    }

    addSequenceAction(entry: SequenceOperationEntry) {
        setIfAbsent(this.state.sequenceOperationsRef, entry.sequenceActionId, {
            action: entry.action,
            keys: entry.keys,
            timeout: entry.timeout,
        }, `[Ink-Cartridge] Sequence Action ${entry.sequenceActionId} may not be defined repeatedly`);
    }

    hasSequenceAction(sequenceActionId: string): boolean {
        return this.state.sequenceOperationsRef.has(sequenceActionId);
    }

    removeSequenceAction(sequenceActionId: string) {
        deleteIfPresent(this.state.sequenceOperationsRef, sequenceActionId, `[Ink-Cartridge] Cannot remove sequence action "${sequenceActionId}": action not registered.`);
    }

    clearSequenceOperations() {
        this.state.sequenceOperationsRef.clear();
    }

    addAction(entry: ShortcutOperationEntry) {
        setIfAbsent(this.state.shortcutOperationsRef, entry.actionId, {
            action: entry.action,
            keys: entry.keys,
        }, `[Ink-Cartridge] Duplicate shortcut cannot be defined with ID ${entry.actionId}`);
    }

    hasAction(actionId: string): boolean {
        return this.state.shortcutOperationsRef.has(actionId);
    }

    removeAction(actionId: string) {
        deleteIfPresent(this.state.shortcutOperationsRef, actionId, `[Ink-Cartridge] Cannot remove action "${actionId}": action not registered.`);
    }

    clearShortcutOperations() {
        this.state.shortcutOperationsRef.clear();
    }

    thereGlobalQueueWaiting(sync?: () => void): boolean {
        if (sync) {
            this.state.pendingSyncs.add(sync);
        }
        return this.state.globalPendingSeqRef !== null;
    }

    currentScreenHasSequenceWaiting(sync?: () => void): boolean {
        if (sync) {
            this.state.pendingSyncs.add(sync);
        }

        const owner = this.layers.getCurrentOwner();

        if (!owner) {
            throw new Error(
                '[Ink-Cartridge] currentScreenHasSequenceWaiting() must be called inside a screen component or overlay. There is currently no active screen.',
            );
        }

        const layer = this.layers.readLayer(owner);
        return layer?.pendingSequence !== null && layer?.pendingSequence !== undefined;
    }
}
