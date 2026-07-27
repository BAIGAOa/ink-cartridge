import {
  KeyRuleContainer,
  finalizeBoundKeyboard,
  pushKeyEntries,
} from "../providers/helpers.js";
import {
  BoundKeyEntry,
  KeyHandler,
  SequenceBinding,
} from "../types/binding.js";
import { ModalMissCallback } from "../types/modal.js";
import {
  AllowModalOptions,
  BoundKeyboardOptions,
  ModalMissOptions,
  PenetrationOptions,
  SequenceOptions,
  StopOptions,
} from "../types/options.js";
import { PageKeyboardLayer } from "../types/page-layer.js";
import EngineState from "./EngineState.js";
import LayerManager from "./LayerManager.js";

export default class BindingService<TComponent = unknown> {
  constructor(
    private state: EngineState<TComponent>,
    private layers: LayerManager<TComponent>,
  ) {}

  private getKeyboardInCurrentContext(
    owner: string | TComponent,
    elementId?: string,
  ) {
    let layer: PageKeyboardLayer;
    if (typeof owner === "string" && elementId) {
      layer = this.layers.getLayer(owner, elementId);
    } else if (typeof owner !== "string" && !elementId) {
      layer = this.layers.getLayer(owner);
    } else {
      const topComponent = this.layers.getTopPage();

      if (!topComponent) {
        throw new Error(
          `
          [keyboard-engine] getKeyboardInCurrentContext(): No Page currently exists, but a Layer does. You must provide an elementId, or register it
  		`,
        );
      }

      layer = this.layers.getLayer(topComponent);
    }
    return layer;
  }

  boundKeyboard(
    keysOrActionId: string | string[],
    handlerOrOptions: KeyHandler | string | BoundKeyboardOptions,
    maybeOptions?: BoundKeyboardOptions,
  ): () => void {
    const createBoundKeyEntry = (
      keys: string[],
      handler: KeyHandler | string,
    ): BoundKeyEntry => {
      if (typeof handler === "string") {
        const entry = this.state.shortcutOperationsRef.get(handler);
        if (!entry) {
          throw new Error(
            `[keyboard-engine] The shortcut key you used does not exist with ID ${handler}`,
          );
        }
        return { keys, handler: entry.action };
      }
      return { keys, handler };
    };

    const applyGlobalKeyOverrides = (
      keys: string[],
      owner: TComponent | string,
      layer: PageKeyboardLayer,
      bindingContext: string,
    ): void => {
      for (const gk of this.state.globalKeysRef) {
        const gkKeys = Array.isArray(gk.key) ? gk.key : [gk.key];
        const matchingKeys = gkKeys.filter((k) => keys.includes(k));
        if (matchingKeys.length === 0) continue;

        const isOverlayOwner = typeof owner === "string";
        const cat = gk.category;
        let inCategory = false;

        if (!isOverlayOwner) {
          if (cat === undefined || cat === "*") {
            inCategory = true;
          } else if (Array.isArray(cat)) {
            inCategory = cat.includes(owner);
          }
          if (!inCategory) continue;
        }

        const cover = gk.cover ?? true;
        const affectOverlay = gk.affectLayer ?? false;

        if (isOverlayOwner) {
          if (!affectOverlay) continue;
          if (!cover) {
            throw new Error(
              `[keyboard-engine] Overlay "${owner}" ` +
                `attempted to bind "${matchingKeys[0]}" via ${bindingContext}, ` +
                `but this key is already declared in globalKeys with cover: false, so overriding is not allowed.`,
            );
          }
        } else {
          if (affectOverlay) continue;
          if (!cover) {
            const ownerName =
              (owner as any).displayName || (owner as any).name || "anonymous";
            throw new Error(
              `[keyboard-engine] Component "${ownerName}" ` +
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

    if (
      typeof keysOrActionId === "string" &&
      typeof handlerOrOptions !== "function" &&
      typeof handlerOrOptions !== "string"
    ) {
      const actionId = keysOrActionId;
      const options = handlerOrOptions as BoundKeyboardOptions;
      const entry = this.state.shortcutOperationsRef.get(actionId);
      if (!entry) {
        throw new Error(
          `[keyboard-engine] Action "${actionId}" is not registered.`,
        );
      }
      if (!entry.keys || entry.keys.length === 0) {
        throw new Error(
          `[keyboard-engine] Action "${actionId}" does not have predefined keys. Please register with keys field or call boundKeyboard with explicit keys.`,
        );
      }
      return this.boundKeyboard(entry.keys, actionId, options);
    }

    const keys = Array.isArray(keysOrActionId)
      ? keysOrActionId
      : [keysOrActionId];
    const handler = handlerOrOptions as KeyHandler | string;
    const options = maybeOptions;

    const owner = this.layers.getCurrentOwner();
    if (!owner) {
      throw new Error(
        "[keyboard-engine] boundKeyboard() must be called inside a screen component or overlay. There is currently no active screen.",
      );
    }

    if (options?.times !== undefined && options.times < 1) {
      throw new Error(
        "[keyboard-engine] boundKeyboard() times option must be >= 1.",
      );
    }

    if (options?.times === undefined && options?.observer) {
      throw new Error(
        "[keyboard-engine] boundKeyboard() observer option requires times option to be set.",
      );
    }

    let layer = this.getKeyboardInCurrentContext(owner, options?.elementId);
    if (options?.focusId) {
      const fid = options.focusId;
      const target =
        typeof fid === "string"
          ? this.layers.getOrCreateFocusTarget(layer, fid)
          : this.layers.getOrCreateFocusTarget(layer, fid.focusId, fid.group);

      applyGlobalKeyOverrides(keys, owner, layer, `focusId="${fid}"`);

      const entry = createBoundKeyEntry(keys, handler);
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

    applyGlobalKeyOverrides(keys, owner, layer, "boundKeyboard");

    const entry = createBoundKeyEntry(keys, handler);
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

  penetration(keys: string[], options?: PenetrationOptions): () => void {
    const owner = this.layers.getCurrentOwner();
    if (!owner) {
      throw new Error(
        "[keyboard-engine] penetration() must be called inside a screen component or overlay.",
      );
    }
    const layer = this.getKeyboardInCurrentContext(owner, options?.elementId);
    const compiledWhen = options?.when;

    const container = options?.focusId
      ? typeof options.focusId === "string"
        ? this.layers.getOrCreateFocusTarget(layer, options.focusId)
        : this.layers.getOrCreateFocusTarget(
            layer,
            options.focusId.focusId,
            options.focusId.group,
          )
      : layer;

    return pushKeyEntries(container, "penetrationKeys", keys, (key) => ({
      key,
      when: compiledWhen,
    }));
  }

  stop(keys: string[], options?: StopOptions): () => void {
    const owner = this.layers.getCurrentOwner();
    if (!owner) {
      throw new Error(
        "[keyboard-engine] stop() must be called inside a screen component or overlay.",
      );
    }
    const layer = this.getKeyboardInCurrentContext(owner, options?.elementId);

    let effectiveKeys: string[] = keys;
    if (options?.stopAction) {
      const map = options.focusId
        ? (typeof options.focusId === "string"
            ? this.layers.getOrCreateFocusTarget(layer, options.focusId)
            : this.layers.getOrCreateFocusTarget(
                layer,
                options.focusId.focusId,
                options.focusId.group,
              )
          ).actionKeysMap
        : layer.actionKeysMap;
      const merged: string[] = [];
      const ownerName =
        typeof owner === "string"
          ? owner
          : (owner as any).displayName || (owner as any).name || "Unknown";
      for (const actionId of keys) {
        const boundKeys = map.get(actionId);
        if (!boundKeys) {
          throw new Error(
            `[keyboard-engine] stop(["${actionId}"], { stopAction: true }) on "${ownerName}": ` +
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
      ? typeof options.focusId === "string"
        ? this.layers.getOrCreateFocusTarget(layer, options.focusId)
        : this.layers.getOrCreateFocusTarget(
            layer,
            options.focusId.focusId,
            options.focusId.group,
          )
      : layer;

    return pushKeyEntries(container, "stoppedKeys", effectiveKeys, (key) => ({
      key,
      when: compiledWhen,
    }));
  }

  allowModal(keys: string[], options?: AllowModalOptions): () => void {
    const owner = this.layers.getCurrentOwner();
    if (!owner) {
      throw new Error(
        "[keyboard-engine] allowModal() must be called inside a modal component.",
      );
    }
    const layer = this.getKeyboardInCurrentContext(owner, options?.elementId);

    const container: KeyRuleContainer = options?.focusId
      ? typeof options.focusId === "string"
        ? this.layers.getOrCreateFocusTarget(layer, options.focusId)
        : this.layers.getOrCreateFocusTarget(
            layer,
            options.focusId.focusId,
            options.focusId.group,
          )
      : layer;
    return pushKeyEntries(container, "allowedKeys", keys, (key) => ({
      key,
      when: options?.when,
    }));
  }

  boundSequence(
    keysOrActionId: string[] | string,
    handlerOrOptions?: KeyHandler | SequenceOptions,
    maybeOptions?: SequenceOptions,
  ): () => void {
    if (
      typeof keysOrActionId === "string" &&
      (typeof handlerOrOptions === "undefined" ||
        typeof handlerOrOptions === "object")
    ) {
      const actionId = keysOrActionId;
      const options = handlerOrOptions as SequenceOptions | undefined;
      const entry = this.state.sequenceOperationsRef.get(actionId);
      if (!entry) {
        throw new Error(
          `[keyboard-engine] Sequence action "${actionId}" is not registered.`,
        );
      }
      if (!entry.keys || entry.keys.length === 0) {
        throw new Error(
          `[keyboard-engine] Sequence action "${actionId}" does not have predefined keys. Please register with a keys field or call boundSequence with explicit keys.`,
        );
      }
      const mergedOptions: SequenceOptions = {
        ...(entry.timeout !== undefined ? { timeout: entry.timeout } : {}),
        ...options,
      };
      return this.boundSequence(entry.keys, entry.action, mergedOptions);
    }

    const keys = Array.isArray(keysOrActionId)
      ? keysOrActionId
      : [keysOrActionId];
    const handler = handlerOrOptions as KeyHandler;
    const options = maybeOptions;

    const owner = this.layers.getCurrentOwner();
    if (!owner) {
      throw new Error(
        "[keyboard-engine] boundSequence() must be called inside a screen component or overlay.",
      );
    }
    if (keys.length < 2) {
      throw new Error(
        "[keyboard-engine] boundSequence() requires at least 2 keys in the sequence.",
      );
    }

    const isOverlayOwner = typeof owner === "string";
    const firstKey = keys[0];
    for (const gs of this.state.globalSequencesRef) {
      if (gs.cover !== false) continue;
      if (gs.keys[0] !== firstKey) continue;
      if (isOverlayOwner) {
        if (!(gs.affectLayer ?? false)) continue;
      } else {
        const cat = gs.category;
        if (cat !== undefined && cat !== "*") {
          if (Array.isArray(cat) && !cat.includes(owner)) continue;
        }
      }
      const ownerName = isOverlayOwner
        ? owner
        : (owner as any).displayName || (owner as any).name || "anonymous";
      throw new Error(
        `[keyboard-engine] ${isOverlayOwner ? `Overlay "${ownerName}"` : `Component "${ownerName}"`} ` +
          `attempted to bind sequence [${keys.join(", ")}] via boundSequence, ` +
          `but the first key "${firstKey}" is already declared in globalSequence ` +
          `with cover: false, so overriding is not allowed.`,
      );
    }

    const layer = this.getKeyboardInCurrentContext(owner, options?.elementId);

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

  useModalMissListener(
    cb: ModalMissCallback,
    options?: ModalMissOptions,
  ): () => void {
    const owner = this.layers.getCurrentOwner();
    if (!owner) return () => {};
    const layer = this.getKeyboardInCurrentContext(owner, options?.elementId);

    layer.onMiss = cb;
    layer.onMissOptions = options;
    return () => {
      if (layer.onMiss === cb) {
        layer.onMiss = undefined;
        layer.onMissOptions = undefined;
      }
    };
  }
}
