import React, {
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { LayerOwner } from '../context.js';
import { ScreenKeyboardLayer } from '../types.js';
import type { OverlayEntry, ModalEntry } from '../../screen/types.js';

export interface ScreenState {
  currentPath: React.ComponentType<any>[];
  activeOverlayIds: string[];
  displayedOverlays: OverlayEntry[];
  activeModalId: string | null;
  displayedModals: ModalEntry[];
}

export function useKeyboardState(
  screenState: ScreenState,
  modes?: string[],
  defaultMode?: string | null,
) {
  const {
    currentPath,
    activeOverlayIds,
    displayedOverlays,
    activeModalId,
    displayedModals,
  } = screenState;

  const pathRef = useRef<React.ComponentType<any>[]>(currentPath);
  const activeOverlayIdsRef = useRef<Set<string>>(new Set());
  const displayedOverlaysRef = useRef(displayedOverlays);
  const activeModalIdRef = useRef<string | null>(null);
  const displayedModalsRef = useRef(displayedModals);

  const modesRef = useRef<Set<string>>(new Set(modes ?? []));
  const currentModeRef = useRef<string | null>(defaultMode ?? null);

  const conditions = useRef<Map<string, boolean>>(new Map());

  const globalKeysRef = useRef<{
    key: string | string[];
    operate: () => void;
    cover?: boolean;
    affectOverlay?: boolean;
    category?: React.ComponentType<any>[] | "*";
    times?: number;
    observer?: (times: number) => void;
    pressCount?: number;
    executeWhenNoOverlay?: boolean;
    when?: string | (() => boolean);
    mode?: string;
  }[]>([]);
  const focusSubscribersRef = useRef(new Set<() => void>());
  const wildcardPriorityCountRef = useRef<number>(0);

  // Global sequence state: registered entries and current pending state.
  const globalSequencesRef = useRef<{
    keys: string[];
    operate: () => void;
    cover?: boolean;
    affectOverlay?: boolean;
    category?: React.ComponentType<any>[] | "*";
    executeWhenNoOverlay?: boolean;
  }[]>([]);
  const globalPendingSeqRef = useRef<{
    sequences: string[];
    nextIndex: number;
    handler: () => void;
    timer: NodeJS.Timeout;
    timeout: number;
    exclusive: boolean;
    affectOverlay: boolean;
    cover: boolean;
    category?: React.ComponentType<any>[] | "*";
    executeWhenNoOverlay?: boolean;
  } | null>(null);

  const shortcutOperationsRef = useRef(
    new Map<string, { action: () => void; keys?: string[] }>()
  );
  const sequenceOperationsRef = useRef(
    new Map<string, { action: () => void; keys?: string[]; timeout?: number }>()
  );

  // Owner stack: top of stack is the current "owner" for keyboard bindings.
  const ownerStackRef = useRef<LayerOwner[]>([]);

  // Sync latest values on every render
  pathRef.current = currentPath;
  activeOverlayIdsRef.current = new Set(activeOverlayIds);
  displayedOverlaysRef.current = displayedOverlays;
  activeModalIdRef.current = activeModalId;
  displayedModalsRef.current = displayedModals;

  const layersRef = useRef<Map<LayerOwner, ScreenKeyboardLayer>>(new Map());

  const prevPathRef = useRef<React.ComponentType<any>[]>([]);

  // Clean up layers for removed screens
  useEffect(() => {
    const prev = prevPathRef.current;
    for (const comp of prev) {
      if (!currentPath.includes(comp)) {
        const layer = layersRef.current.get(comp);
        if (layer?.pendingSequence) {
          clearTimeout(layer.pendingSequence.timer);
          layer.pendingSequence = null;
        }
        layersRef.current.delete(comp);
      }
    }
    prevPathRef.current = currentPath;
  }, [currentPath]);

  // Clean up layers for removed overlays
  const prevOverlayIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const currentIds = new Set(displayedOverlays.map(o => o.id));

    for (const prevId of prevOverlayIdsRef.current) {
      if (!currentIds.has(prevId)) {
        const layer = layersRef.current.get(prevId);
        if (layer?.pendingSequence) {
          clearTimeout(layer.pendingSequence.timer);
          layer.pendingSequence = null;
        }
        layersRef.current.delete(prevId);
      }
    }

    prevOverlayIdsRef.current = currentIds;
  }, [displayedOverlays]);

  // Clean up layers for removed modals
  const prevModalIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const currentIds = new Set(displayedModals.map(m => m.id));

    for (const prevId of prevModalIdsRef.current) {
      if (!currentIds.has(prevId)) {
        const layer = layersRef.current.get(prevId);
        if (layer?.pendingSequence) {
          clearTimeout(layer.pendingSequence.timer);
          layer.pendingSequence = null;
        }
        layersRef.current.delete(prevId);
      }
    }

    prevModalIdsRef.current = currentIds;
  }, [displayedModals]);

  // ---- Owner stack management ----

  const pushOwner = useCallback((owner: LayerOwner) => {
    ownerStackRef.current = [...ownerStackRef.current, owner];
  }, []);

  const popOwner = useCallback((owner: LayerOwner) => {
    const stack = ownerStackRef.current;
    const idx = stack.lastIndexOf(owner);
    if (idx !== -1) {
      ownerStackRef.current = [
        ...stack.slice(0, idx),
        ...stack.slice(idx + 1),
      ];
    }
  }, []);

  const enableWildcardPriority = useCallback(() => {
    wildcardPriorityCountRef.current += 1;
    let disabled = false;
    return () => {
      if (disabled) return;
      disabled = true;
      wildcardPriorityCountRef.current = Math.max(0, wildcardPriorityCountRef.current - 1);
    };
  }, []);

  // ---- Core keyboard functions ----

  const getLayer = useCallback(
    (owner: LayerOwner) => {
      let layer = layersRef.current.get(owner);
      if (!layer) {
        let kind: 'screen' | 'overlay' | 'modal' = 'screen';
        if (typeof owner === 'string') {
          if (displayedModalsRef.current.some(m => m.id === owner)) {
            kind = 'modal';
          } else if (displayedOverlaysRef.current.some(o => o.id === owner)) {
            kind = 'overlay';
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
        };
        layersRef.current.set(owner, layer);
      }
      return layer;
    },
    [],
  );

  const getCurrentOwner = useCallback((): LayerOwner | null => {
    const stack = ownerStackRef.current;
    if (stack.length > 0) return stack[stack.length - 1];
    const path = pathRef.current;
    if (path.length === 0) return null;
    return path[path.length - 1];
  }, []);

  const notifyFocusChange = useCallback(() => {
    focusSubscribersRef.current.forEach(fn => fn());
  }, []);

  const clearPendingSequence = useCallback((layer: ScreenKeyboardLayer) => {
    if (layer.pendingSequence !== null) {
      clearTimeout(layer.pendingSequence.timer);
      layer.pendingSequence = null;
    }
  }, []);

  const getOrCreateFocusTarget = useCallback(
    (layer: ScreenKeyboardLayer, focusId: string) => {
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
          notifyFocusChange();
        }
      }
      return target;
    },
    [notifyFocusChange],
  );

  const readLayer = useCallback(
    (owner: LayerOwner) => layersRef.current.get(owner),
    [],
  );

  const subscribeFocus = useCallback((listener: () => void) => {
    focusSubscribersRef.current.add(listener);
    return () => { focusSubscribersRef.current.delete(listener); };
  }, []);

  const focusSet = useCallback(
    (focusId: string) => {
      const owner = getCurrentOwner();
      if (!owner) return;
      const ownerName = typeof owner === 'string' ? owner : ((owner as any).displayName || owner.name || 'Unknown');
      const layer = layersRef.current.get(owner);
      if (!layer) {
        throw new Error(
          `focusSet("${focusId}"): no keyboard layer found for "${ownerName}". ` +
          `Did you forget to wrap the screen in <KeyboardProvider>?`,
        );
      }
      clearPendingSequence(layer);
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
        notifyFocusChange();
      }
    },
    [getCurrentOwner, notifyFocusChange, clearPendingSequence],
  );

  const focusNext = useCallback(() => {
    const owner = getCurrentOwner();
    if (!owner) return;
    const layer = layersRef.current.get(owner);
    if (!layer || layer.focusOrder.length === 0) return;

    clearPendingSequence(layer);

    const current = layer.currentFocusId;
    let idx = current ? layer.focusOrder.indexOf(current) : -1;
    idx = (idx + 1) % layer.focusOrder.length;
    layer.currentFocusId = layer.focusOrder[idx];
    notifyFocusChange();
  }, [getCurrentOwner, notifyFocusChange, clearPendingSequence]);

  const focusPrev = useCallback(() => {
    const owner = getCurrentOwner();
    if (!owner) return;
    const layer = layersRef.current.get(owner);
    if (!layer || layer.focusOrder.length === 0) return;

    clearPendingSequence(layer);

    const current = layer.currentFocusId;
    let idx = current ? layer.focusOrder.indexOf(current) : -1;
    idx = idx <= 0 ? layer.focusOrder.length - 1 : idx - 1;
    layer.currentFocusId = layer.focusOrder[idx];
    notifyFocusChange();
  }, [getCurrentOwner, notifyFocusChange, clearPendingSequence]);

  const focusCurrent = useCallback((): string | null => {
    const owner = getCurrentOwner();
    if (!owner) return null;
    const layer = layersRef.current.get(owner);
    return layer?.currentFocusId ?? null;
  }, [getCurrentOwner]);

  const focusUnregister = useCallback((focusId: string) => {
    const owner = getCurrentOwner();
    if (!owner) return;
    const layer = layersRef.current.get(owner);
    if (!layer) return;

    const wasFocused = layer.currentFocusId === focusId;
    layer.focusTargets.delete(focusId);
    layer.focusOrder = layer.focusOrder.filter(id => id !== focusId);

    if (wasFocused) {
      layer.currentFocusId =
        layer.focusOrder.length > 0 ? layer.focusOrder[0] : null;
      notifyFocusChange();
    }
  }, [getCurrentOwner, notifyFocusChange]);

  const addMode = useCallback((mode: string) => {
    if (modesRef.current.has(mode)) {
      return false;
    }
    modesRef.current.add(mode);
    return true;
  }, []);

  const removeMode = useCallback((mode: string) => {
    return modesRef.current.delete(mode);
  }, []);

  const setMode = useCallback((mode: string | null) => {
    if (typeof mode === "string" && !modesRef.current.has(mode)) {
      return false;
    }
    currentModeRef.current = mode;
    return true;
  }, []);

  const nextMode = useCallback(() => {
    const modes = Array.from(modesRef.current);
    if (modes.length === 0) return;
    const currentIndex = modes.indexOf(currentModeRef.current ?? '');
    const nextIndex = (currentIndex + 1) % modes.length;
    currentModeRef.current = modes[nextIndex];
  }, []);

  const prevMode = useCallback(() => {
    const modes = Array.from(modesRef.current);
    if (modes.length === 0) return;
    const currentIndex = modes.indexOf(currentModeRef.current ?? '');
    const prevIndex = (currentIndex - 1 + modes.length) % modes.length;
    currentModeRef.current = modes[prevIndex];
  }, []);

  const getCurrentMode = useCallback(() => currentModeRef.current, []);

  const addCondition = useCallback((id: string, defaultVal: boolean) => {
    if (conditions.current.has(id)) {
      return false;
    }
    conditions.current.set(id, defaultVal);
    return true;
  }, []);

  const removeCondition = useCallback((target: string) => {
    return conditions.current.delete(target);
  }, []);

  const setCondition = useCallback((target: string, value: boolean) => {
    if (!conditions.current.has(target)) {
      return false;
    }
    conditions.current.set(target, value);
    return true;
  }, []);

  const refs = {
    pathRef,
    activeOverlayIdsRef,
    displayedOverlaysRef,
    activeModalIdRef,
    displayedModalsRef,
    modesRef,
    currentModeRef,
    conditions,
    globalKeysRef,
    focusSubscribersRef,
    wildcardPriorityCountRef,
    globalSequencesRef,
    globalPendingSeqRef,
    shortcutOperationsRef,
    sequenceOperationsRef,
    ownerStackRef,
    layersRef,
  };

  return {
    refs,
    // Layer operations
    getLayer,
    readLayer,
    getCurrentOwner,
    // Owner stack
    pushOwner,
    popOwner,
    enableWildcardPriority,
    // Focus target
    getOrCreateFocusTarget,
    clearPendingSequence,
    notifyFocusChange,
    // Focus management
    subscribeFocus,
    focusSet,
    focusNext,
    focusPrev,
    focusCurrent,
    focusUnregister,
    // Mode management
    addMode,
    removeMode,
    setMode,
    nextMode,
    prevMode,
    getCurrentMode,
    // Condition management
    addCondition,
    removeCondition,
    setCondition,
  };
}
