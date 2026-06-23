import type { Key } from 'ink';
import type {
  PipelineContext,
  PipelineProcessor,
  ScreenKeyboardLayer,
  BoundKeyEntry,
} from '../types.js';
import { handleLayer } from '../layer-handler.js';

/**
 * Check whether any key rule (blocked/stopped) covers a key name.
 * Simple key-name match without when evaluation — used for miss detection.
 */
function keyNameMatchesAnyRule(
  keyName: string,
  rules: Array<{ key: string; when?: () => boolean }>,
): boolean {
  return rules.some((r) => r.key === keyName);
}

/**
 * Check whether the event was consumed by a stop declaration
 * rather than a real binding handler.
 */
function consumedByStop(
  layer: ScreenKeyboardLayer,
  eventNames: string[],
): boolean {
  return eventNames.some((n) => keyNameMatchesAnyRule(n, layer.stoppedKeys));
}

/**
 * Check whether the event matches a blockedKey declaration.
 */
function matchesBlockedKey(
  layer: ScreenKeyboardLayer,
  eventNames: string[],
): boolean {
  return eventNames.some((n) => keyNameMatchesAnyRule(n, layer.blockedKeys));
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

  if (handled) {
    // When includeStop is false and the key matched a stop declaration,
    // treat it as a miss (stop doesn't fire a user-visible handler).
    if (!opts.includeStop && consumedByStop(layer, eventNames)) {
      layer.onMiss({ miss: true, key, input, eventNames });
      return true;
    }
    layer.onMiss({ miss: false });
    return false;
  }

  // handled === false — key was not consumed by handleLayer.

  if (opts.includeBlockedKey && matchesBlockedKey(layer, eventNames)) {
    layer.onMiss({ miss: false });
    return false;
  }

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
        );
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
  };
}
