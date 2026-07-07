import React, { useCallback, useRef } from 'react';
import { LayerOwner } from '../context.js';
import {
  KeyHandler,
  BoundKeyboardOptions,
  BoundKeyEntry,
  ScreenKeyboardLayer,
  PenetrationOptions,
  StopOptions,
  AllowModalOptions,
  SequenceOptions,
  SequenceBinding,
  ModalMissCallback,
  ModalMissOptions,
} from '../types.js';
import {
  pushKeyEntries,
  finalizeBoundKeyboard,
} from './helpers.js';
import type { KeyRuleContainer } from './helpers.js';

interface BindingDeps {
  getCurrentOwner: () => LayerOwner | null;
  getLayer: (owner: LayerOwner) => ScreenKeyboardLayer;
  getOrCreateFocusTarget: (layer: ScreenKeyboardLayer, focusId: string) => {
    bindings: BoundKeyEntry[];
    penetrationKeys: { key: string; when?: string | (() => boolean) }[];
    stoppedKeys: { key: string; when?: string | (() => boolean) }[];
    allowedKeys: { key: string; when?: string | (() => boolean) }[];
    actionKeysMap: Map<string, string[]>;
  };
  globalKeysRef: React.MutableRefObject<{
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
  }[]>;
  shortcutOperationsRef: React.MutableRefObject<Map<string, { action: () => void; keys?: string[] }>>;
  sequenceOperationsRef: React.MutableRefObject<Map<string, { action: () => void; keys?: string[]; timeout?: number }>>;
  globalSequencesRef: React.MutableRefObject<{
    keys: string[];
    operate: () => void;
    cover?: boolean;
    affectOverlay?: boolean;
    category?: React.ComponentType<any>[] | "*";
    executeWhenNoOverlay?: boolean;
  }[]>;
  getCurrentMode: () => string | null;
}

export function useKeyboardBindings(deps: BindingDeps) {
  const {
    getCurrentOwner,
    getLayer,
    getOrCreateFocusTarget,
    globalKeysRef,
    shortcutOperationsRef,
    sequenceOperationsRef,
    globalSequencesRef,
  } = deps;

  const useModalMissListener = useCallback(
    (cb: ModalMissCallback, options?: ModalMissOptions): (() => void) => {
      const owner = getCurrentOwner();
      if (!owner) return () => {};
      const layer = getLayer(owner);

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
    },
    [getCurrentOwner, getLayer],
  );

  const allowModal = useCallback(
    (keys: string[], options?: AllowModalOptions): (() => void) => {
      const owner = getCurrentOwner();
      if (!owner) {
        throw new Error('[Ink-Cartridge] allowModal() must be called inside a modal component.');
      }
      const layer = getLayer(owner);

      if (layer.kind !== 'modal') {
        throw new Error(
          '[Ink-Cartridge] allowModal() can only be used on a modal layer.',
        );
      }

      const container: KeyRuleContainer = options?.focusId
        ? getOrCreateFocusTarget(layer, options.focusId)
        : layer;
      return pushKeyEntries(container, 'allowedKeys', keys, (key) => ({ key, when: options?.when }));
    },
    [getCurrentOwner, getLayer, getOrCreateFocusTarget],
  );

  /**
   * Bind keys on the current layer (screen or overlay).
   */
  const boundKeyboardSelfRef = useRef<
    (keysOrActionId: string | string[], handlerOrOptions: KeyHandler | string | BoundKeyboardOptions, maybeOptions?: BoundKeyboardOptions) => () => void
  >(undefined);

  const boundKeyboard = useCallback(
    (
      keysOrActionId: string | string[],
      handlerOrOptions: KeyHandler | string | BoundKeyboardOptions | undefined,
      maybeOptions?: BoundKeyboardOptions,
    ): (() => void) => {

      function createBoundKeyEntry(
        keys: string[],
        handler: KeyHandler | string,
        onlyThis: boolean,
        owner: LayerOwner,
      ): BoundKeyEntry {
        if (typeof handler === 'string') {
          const entry = shortcutOperationsRef.current.get(handler);
          if (!entry) {
            throw new Error(
              `[Ink-Cartridge] The shortcut key you used does not exist with ID ${handler}`,
            );
          }
          return { keys, handler: entry.action, onlyThis, owner };
        }
        return { keys, handler, onlyThis, owner };
      }

      function applyGlobalKeyOverrides(
        keys: string[],
        owner: LayerOwner,
        layer: ScreenKeyboardLayer,
        bindingContext: string,
      ): void {
        for (const gk of globalKeysRef.current) {
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
              const ownerName = owner.displayName || owner.name || 'anonymous';
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
      }

      // ActionId overload
      if (typeof keysOrActionId === 'string' && typeof handlerOrOptions !== 'function' && typeof handlerOrOptions !== 'string') {
        const actionId = keysOrActionId;
        const options = handlerOrOptions as BoundKeyboardOptions;
        const entry = shortcutOperationsRef.current.get(actionId);
        if (!entry) {
          throw new Error(`[Ink-Cartridge] Action "${actionId}" is not registered.`);
        }
        if (!entry.keys || entry.keys.length === 0) {
          throw new Error(
            `[Ink-Cartridge] Action "${actionId}" does not have predefined keys. Please register with keys field or call boundKeyboard with explicit keys.`,
          );
        }
        return boundKeyboardSelfRef.current!(entry.keys, actionId, options);
      }

      const keys = Array.isArray(keysOrActionId) ? keysOrActionId : [keysOrActionId];
      const handler = handlerOrOptions as KeyHandler | string;
      const options = maybeOptions;

      const owner = getCurrentOwner();
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

      const layer = getLayer(owner);

      if (options?.focusId) {
        const fid = options.focusId;
        const target = getOrCreateFocusTarget(layer, fid);

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
    },
    [getCurrentOwner, getLayer, getOrCreateFocusTarget],
  );

  boundKeyboardSelfRef.current = boundKeyboard;

  /**
   * Mark keys as transparent on the current layer.
   */
  const penetration = useCallback(
    (keys: string[], options?: PenetrationOptions): (() => void) => {
      const owner = getCurrentOwner();
      if (!owner) {
        throw new Error('[Ink-Cartridge] penetration() must be called inside a screen component or overlay.');
      }
      const layer = getLayer(owner);
      const compiledWhen = options?.when;

      const container: KeyRuleContainer = options?.focusId
        ? getOrCreateFocusTarget(layer, options.focusId)
        : layer;
      return pushKeyEntries(container, 'penetrationKeys', keys, (key) => ({
        key,
        when: compiledWhen,
      }));
    },
    [getCurrentOwner, getLayer, getOrCreateFocusTarget],
  );

  /**
   * Prevent keys from propagating beyond the current layer.
   */
  const stop = useCallback(
    (keys: string[], options?: StopOptions): (() => void) => {
      const owner = getCurrentOwner();
      if (!owner) {
        throw new Error('[Ink-Cartridge] stop() must be called inside a screen component or overlay.');
      }
      const layer = getLayer(owner);

      let effectiveKeys: string[] = keys;
      if (options?.stopAction) {
        const map = options.focusId
          ? getOrCreateFocusTarget(layer, options.focusId).actionKeysMap
          : layer.actionKeysMap;
        const merged: string[] = [];
        const ownerName = typeof owner === 'string' ? owner : ((owner as any).displayName || owner.name || 'Unknown');
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
        ? getOrCreateFocusTarget(layer, options.focusId)
        : layer;
      return pushKeyEntries(container, 'stoppedKeys', effectiveKeys, (key) => ({
        key,
        when: compiledWhen,
      }));
    },
    [getCurrentOwner, getLayer, getOrCreateFocusTarget],
  );

  /**
   * Register a multi-key sequence binding.
   */
  const boundSequenceSelfRef = useRef<
    (keysOrActionId: string[] | string, handlerOrOptions?: KeyHandler | SequenceOptions, maybeOptions?: SequenceOptions) => () => void
  >(undefined);

  const boundSequence = useCallback(
    (
      keysOrActionId: string[] | string,
      handlerOrOptions?: KeyHandler | SequenceOptions,
      maybeOptions?: SequenceOptions,
    ): (() => void) => {
      // Overload: boundSequence(actionId: string, options?: SequenceOptions)
      if (typeof keysOrActionId === 'string' && (typeof handlerOrOptions === 'undefined' || typeof handlerOrOptions === 'object')) {
        const actionId = keysOrActionId;
        const options = handlerOrOptions as SequenceOptions | undefined;
        const entry = sequenceOperationsRef.current.get(actionId);
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
        return boundSequenceSelfRef.current!(entry.keys, entry.action, mergedOptions);
      }

      const keys = Array.isArray(keysOrActionId) ? keysOrActionId : [keysOrActionId];
      const handler = handlerOrOptions as KeyHandler;
      const options = maybeOptions;

      const owner = getCurrentOwner();
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
      for (const gs of globalSequencesRef.current) {
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
        const ownerName = isOverlayOwner ? owner : (owner.displayName || owner.name || 'anonymous');
        throw new Error(
          `[Ink-Cartridge] ${isOverlayOwner ? `Overlay "${ownerName}"` : `Component "${ownerName}"`} ` +
          `attempted to bind sequence [${keys.join(', ')}] via boundSequence, ` +
          `but the first key "${firstKey}" is already declared in globalSequence ` +
          `with cover: false, so overriding is not allowed.`,
        );
      }

      const layer = getLayer(owner);

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
    },
    [getCurrentOwner, getLayer],
  );

  boundSequenceSelfRef.current = boundSequence;

  return {
    boundKeyboard,
    penetration,
    stop,
    allowModal,
    boundSequence,
    useModalMissListener,
  };
}
