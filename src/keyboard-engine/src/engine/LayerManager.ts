import { ScreenKeyboardLayer } from "../types.js";
import EngineState from "./EngineState.js";

export default class LayerManager<TComponent = unknown> {
    constructor(private state: EngineState<TComponent>) {}

    prevPathRef: TComponent[] = []
    prevOverlayIdsRef: Set<string> = new Set()
    prevModalIdsRef: Set<string> = new Set()

    cleanLayers() {
        const prev = this.prevPathRef;
        for (const comp of prev) {
            if (!this.state.path.includes(comp)) {
                const layer = this.state.layersRef.get(comp);
                if (layer?.pendingSequence) {
                    clearTimeout(layer.pendingSequence.timer);
                    layer.pendingSequence = null;
                }
                this.state.layersRef.delete(comp);
            }
        }
        this.prevPathRef = this.state.path;
    }

    cleanOverlayLayers() {
        const currentIds = new Set(this.state.displayedOverlays.map(o => o.id));

        for (const prevId of this.prevOverlayIdsRef) {
            if (!currentIds.has(prevId)) {
                const layer = this.state.layersRef.get(prevId);
                if (layer?.pendingSequence) {
                    clearTimeout(layer.pendingSequence.timer);
                    layer.pendingSequence = null;
                }
                this.state.layersRef.delete(prevId);
            }
        }

        this.prevOverlayIdsRef = currentIds;
    }

    cleanModalLayers() {
        const currentIds = new Set(this.state.displayedModalsRef.map(m => m.id));

        for (const prevId of this.prevModalIdsRef) {
            if (!currentIds.has(prevId)) {
                const layer = this.state.layersRef.get(prevId);
                if (layer?.pendingSequence) {
                    clearTimeout(layer.pendingSequence.timer);
                    layer.pendingSequence = null;
                }
                this.state.layersRef.delete(prevId);
            }
        }

        this.prevModalIdsRef = currentIds;
    }

    pushOwner(owner: TComponent | string) {
        this.state.ownerStackRef = [...this.state.ownerStackRef, owner];
    }

    popOwner(owner: TComponent | string) {
        const stack = this.state.ownerStackRef;
        const idx = stack.lastIndexOf(owner);
        if (idx !== -1) {
            this.state.ownerStackRef = [
                ...stack.slice(0, idx),
                ...stack.slice(idx + 1),
            ];
        }
    }

    getLayer(owner: TComponent | string) {
        let layer = this.state.layersRef.get(owner);
        if (!layer) {
            let kind: 'screen' | 'overlay' | 'modal' = 'screen'
            if (typeof owner === 'string') {
                if (this.state.displayedModalsRef.some(m => m.id === owner)) {
                    kind = 'modal'
                } else if (this.state.displayedOverlays.some(m => m.id === owner)) {
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
            this.state.layersRef.set(owner, layer)
        }
        return layer
    }

    getCurrentOwner(): TComponent | string | null {
        const stack = this.state.ownerStackRef;
        if (stack.length > 0) return stack[stack.length - 1];
        if (this.state.path.length === 0) return null;
        return this.state.path[this.state.path.length - 1];
    }

    notifyFocusChange() {
        this.state.focusSubscribersRef.forEach(fn => fn());
    }

    clearPendingSequence(layer: ScreenKeyboardLayer) {
        if (layer.pendingSequence !== null) {
            clearTimeout(layer.pendingSequence.timer);
            layer.pendingSequence = null;
        }
    }

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

    readLayer(owner: TComponent | string) {
        return this.state.layersRef.get(owner);
    }

    subscribeFocus(listener: () => void) {
        this.state.focusSubscribersRef.add(listener);
        return () => { this.state.focusSubscribersRef.delete(listener); };
    }

    focusSet(focusId: string) {
        const owner = this.getCurrentOwner();
        if (!owner) return;
        const ownerName = typeof owner === 'string' ? owner : ((owner as any).displayName || (owner as any).name || 'Unknown');
        const layer = this.state.layersRef.get(owner);
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

    focusNext() {
        const owner = this.getCurrentOwner();
        if (!owner) return;
        const layer = this.state.layersRef.get(owner);
        if (!layer || layer.focusOrder.length === 0) return;

        this.clearPendingSequence(layer);

        const current = layer.currentFocusId;
        let idx = current ? layer.focusOrder.indexOf(current) : -1;
        idx = (idx + 1) % layer.focusOrder.length;
        layer.currentFocusId = layer.focusOrder[idx];
        this.notifyFocusChange();
    }

    focusPrev() {
        const owner = this.getCurrentOwner();
        if (!owner) return;
        const layer = this.state.layersRef.get(owner);
        if (!layer || layer.focusOrder.length === 0) return;

        this.clearPendingSequence(layer);

        const current = layer.currentFocusId;
        let idx = current ? layer.focusOrder.indexOf(current) : -1;
        idx = idx <= 0 ? layer.focusOrder.length - 1 : idx - 1;
        layer.currentFocusId = layer.focusOrder[idx];
        this.notifyFocusChange();
    }

    focusCurrent(): string | null {
        const owner = this.getCurrentOwner();
        if (!owner) return null;
        const layer = this.state.layersRef.get(owner);
        return layer?.currentFocusId ?? null;
    }

    focusUnregister(focusId: string) {
        const owner = this.getCurrentOwner();
        if (!owner) return;
        const layer = this.state.layersRef.get(owner);
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
}
