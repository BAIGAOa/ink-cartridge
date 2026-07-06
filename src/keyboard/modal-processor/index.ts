import type { Key } from 'ink';
import type {
  PipelineContext,
  PipelineProcessor,
  ScreenKeyboardLayer,
  BoundKeyEntry,
  KeyRule,
} from '../types.js';
import { handleLayer } from '../layer-handler.js';


function passAllowedKeys(allowedKeys: KeyRule[], blockedKeys: string[], eventNames: string[]): boolean {
  return allowedKeys.some((k) => !blockedKeys.includes(k.key) && eventNames.includes(k.key));
}

/**
 * Check whether a key event matches any entry in the allow-list of
 * the active focus target or the layer itself.
 */
function isAllowed(layer: ScreenKeyboardLayer, eventNames: string[]): boolean {
  const blockedKeys = layer.allowedKeys
    .filter((r) => r.when?.() === false)
    .map((r) => r.key);

  if (layer.currentFocusId) {
    const ft = layer.focusTargets.get(layer.currentFocusId);
    if (ft && passAllowedKeys(ft.allowedKeys, blockedKeys, eventNames)) {
      return true;
    }
  }

  if (passAllowedKeys(layer.allowedKeys, blockedKeys, eventNames)) {
    return true;
  }
  return false;
}

/**
 * Check whether a list of bindings contains one whose `keys` match
 * the event but whose `when` returns `false`.
 */
function hasWhenFalseBinding(
  bindings: BoundKeyEntry[],
  eventNames: string[],
): boolean {
  return bindings.some(
    (b) =>
      b.when?.() === false &&
      b.keys.some((k) => eventNames.includes(k)),
  );
}

/**
 * Check whether any non-active focus target has a binding matching
 * the event.
 */
function matchesOtherFocusTarget(
  layer: ScreenKeyboardLayer,
  eventNames: string[],
): boolean {
  for (const [fid, ft] of layer.focusTargets) {
    if (fid === layer.currentFocusId) continue;
    if (ft.bindings.some((b) => b.keys.some((k) => eventNames.includes(k)))) {
      return true;
    }
  }
  return false;
}

/**
 * Determine whether a key event is a "miss" and invoke the callback.
 *
 * @returns true if the callback was invoked with miss=true.
 */
function invokeMissIfNeeded(
  layer: ScreenKeyboardLayer,
  handled: boolean, 
  key: Key,
  input: string,
  eventNames: string[],
): boolean {
  if (!layer.onMiss) return false;

  const opts = layer.onMissOptions ?? {};

  // fix: The stop API and penetration API cases are no longer handled.
  // Instead, it is left to handlerLayer to handle natural
  // So the expectation is that, So the Stop API returns miss: false, but the penetration API returns miss: true
  // TODO: You need to modify the corresponding test and do it later.
  // @2026-06-23 3.6.1

  if (handled) {
    layer.onMiss({ miss: false });
    return false;
  }

  // handled === false — key was not consumed by handleLayer.

  if (opts.monitorWhen && hasWhenFalseBinding(layer.bindings, eventNames)) {
    layer.onMiss({ miss: true, key, input, eventNames });
    return true;
  }

  if (
    opts.monitorWhen &&
    layer.currentFocusId
  ) {
    const ft = layer.focusTargets.get(layer.currentFocusId);
    if (ft && hasWhenFalseBinding(ft.bindings, eventNames)) {
      layer.onMiss({ miss: true, key, input, eventNames });
      return true;
    }
  }

  if (
    opts.monitorFocusMismatch &&
    matchesOtherFocusTarget(layer, eventNames)
  ) {
    layer.onMiss({ miss: true, key, input, eventNames });
    return true;
  }

  // Definitely a miss — no mechanism handled this key.
  layer.onMiss({ miss: true, key, input, eventNames });
  return true;
}

/**
 * Create a processor for the modal stage (stage 0 — highest priority).
 *
 * When a modal is active (activeModalId is set), the modal's keyboard layer
 * receives the event. The processor always returns `true`, consuming every
 * event — even keys not bound in the modal — so that no event reaches
 * lower-priority stages (global keys, overlays, or screens).
 *
 * Before blocking, if the layer has an {@link ScreenKeyboardLayer.onMiss}
 * callback registered (via {@link useModalMissListener}), the processor
 * determines whether the key was handled or missed and invokes the callback.
 *
 * @returns A PipelineProcessor for the modal stage.
 */
export function createModalProcessor(): PipelineProcessor {
  return {
    process(ctx: PipelineContext): boolean {
      if (!ctx.activeModalId) return false;

      const layer = ctx.layersRef.current.get(ctx.activeModalId);
      let handled = false;
      if (layer) {
        handled = handleLayer(
          layer,
          ctx.eventNames,
          ctx.input,
          ctx.key,
          true,  // isTop — modal is always the top layer
          ctx.notifyFocusChange,
          1,     // activeCount — modal is singleton
          true,  // isOverlay — modal is treated as a floating layer for onlyThis semantics
          ctx.wildcardFirst,
          ctx.currentMode
        );
      }

      // If the key was not handled by any modal binding but it is in
      // the allow-list (layer-level or active focus target), pass it
      // through to the next pipeline stage instead of blocking.
      if (!handled && layer && isAllowed(layer, ctx.eventNames)) {
        return false;
      }

      if (layer) {
        invokeMissIfNeeded(
          layer,
          handled,
          ctx.key,
          ctx.input,
          ctx.eventNames,
        );
      }

      return true;
    },
    id: 'modal',
  };
}
