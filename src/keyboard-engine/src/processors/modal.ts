import { handleLayer } from "../layerHandler.js";
import { checkWhen } from "../checkWhen.js";
import { KeyRule } from "../types/key-rule.js";
import { ElementKeyboard, LayerKeyboardLayer } from "../types/page-layer.js";
import { defaultTargetsSymbol } from "../types/default-targets-symbol.js";
import { FocusTarget } from "../types/focus.js";
import { BaseBoundKeyEntry } from "../types/binding.js";
import { PipelineContext, PipelineProcessor } from "../types/processor.js";

function passAllowedKeys(
  allowedKeys: KeyRule[],
  blockedKeys: string[],
  eventNames: string[],
): boolean {
  return allowedKeys.some(
    (k) => !blockedKeys.includes(k.key) && eventNames.includes(k.key),
  );
}

/**
 * Resolve a {@link ScreenKeyboardLayer.currentFocusIds} entry to its
 * {@link FocusTarget}, searching both {@link ScreenKeyboardLayer.defaultTargets}
 * and group-scoped {@link ScreenKeyboardLayer.focusTargets}.
 */
function getFocusTarget(
  layer: ElementKeyboard,
  entry: { id: string; fromGroup: string | typeof defaultTargetsSymbol },
): FocusTarget | undefined {
  if (entry.fromGroup === defaultTargetsSymbol) {
    return layer.defaultTargets.get(entry.id);
  }
  return layer.focusTargets.get(entry.fromGroup)?.map.get(entry.id);
}

/**
 * Check whether a key event matches any entry in the allow-list of
 * the active focus target or the layer itself.
 */
function isAllowed(
  layer: ElementKeyboard,
  eventNames: string[],
  conditions: Map<string, boolean>,
): boolean {
  const blockedKeys = layer.allowedKeys
    .filter((r) => !checkWhen(r.when, conditions))
    .map((r) => r.key);

  if (layer.currentFocusIds.length > 0) {
    const allFt: FocusTarget[] = [];

    for (const each of layer.currentFocusIds) {
      const target = getFocusTarget(layer, each);
      if (target) {
        allFt.push(target);
      }
    }

    const allAllowedKeys = [
      ...new Set(allFt.flatMap((each) => each.allowedKeys)),
    ];

    if (
      allFt.length > 0 &&
      passAllowedKeys(allAllowedKeys, blockedKeys, eventNames)
    ) {
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
  bindings: BaseBoundKeyEntry[],
  eventNames: string[],
  conditions: Map<string, boolean>,
): boolean {
  return bindings.some(
    (b) =>
      !checkWhen(b.when, conditions) &&
      b.keys.some((k) => eventNames.includes(k)),
  );
}

/**
 * Check whether any non-active focus target has a binding matching
 * the event.
 */
function matchesOtherFocusTarget(
  layer: ElementKeyboard,
  eventNames: string[],
): boolean {
  const activeIds = new Set(
    layer.currentFocusIds.map((e) => {
      const groupKey =
        e.fromGroup === defaultTargetsSymbol
          ? String(defaultTargetsSymbol)
          : e.fromGroup;
      return `${groupKey}::${e.id}`;
    }),
  );

  // Check defaultTargets
  for (const [id, ft] of layer.defaultTargets) {
    const key = `${String(defaultTargetsSymbol)}::${id}`;
    if (activeIds.has(key)) continue;
    if (ft.bindings.some((b) => b.keys.some((k) => eventNames.includes(k)))) {
      return true;
    }
  }

  // Check group-scoped focusTargets
  for (const [groupName, group] of layer.focusTargets) {
    for (const [id, ft] of group.map) {
      const key = `${groupName}::${id}`;
      if (activeIds.has(key)) continue;
      if (ft.bindings.some((b) => b.keys.some((k) => eventNames.includes(k)))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Determine whether a key event is a "miss" and invoke the callback.
 *
 * @returns true if the callback was invoked with miss=true.
 */
function invokeMissIfNeeded<TC>(
  layer: LayerKeyboardLayer,
  handled: boolean,
  key: unknown,
  input: string,
  eventNames: string[],
  conditions: Map<string, boolean>,
  ctx: PipelineContext<TC>,
): boolean {
  for (const [elementId, elementKeyboard] of layer.elementKeyboards) {
    const syncLayerData = ctx.allModalLayers;
  }

  if (!layer.missListener.onMiss || !layer.missListener.onMissOptions)
    return false;

  const opts = layer.missListener.onMissOptions;

  if (handled) {
    layer.missListener.onMiss({ miss: false });
    return false;
  }

  // handled === false — key was not consumed by handleLayer.
  let allBinding: BaseBoundKeyEntry[] = Array.from(layer.elementKeyboards).flatMap(
    (each) => each[1].bindings,
  );

  if (
    opts.monitorWhen &&
    hasWhenFalseBinding(allBinding, eventNames, conditions)
  ) {
    layer.missListener.onMiss({ miss: true, key, input, eventNames });
    return true;
  }

  if (opts.monitorWhen && layer.currentFocusIds.length > 0) {
    for (const each of layer.currentFocusIds) {
      const ft = getFocusTarget(layer, each);
      if (ft && hasWhenFalseBinding(ft.bindings, eventNames, conditions)) {
        layer.onMiss({ miss: true, key, input, eventNames });
        return true;
      }
    }
  }

  if (opts.monitorFocusMismatch && matchesOtherFocusTarget(layer, eventNames)) {
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
export function createModalProcessor<
  TComponent,
>(): PipelineProcessor<TComponent> {
  return {
    process(ctx): boolean {
      if (ctx.noActiveProcessor.includes(this.id)) {
        return false;
      }

      if (!ctx.activeModalId) return false;

      const layer = ctx.layersRef.current.get(ctx.activeModalId);
      let handled = false;
      if (layer) {
        handled = handleLayer(
          layer,
          ctx.eventNames,
          ctx.input,
          ctx.key,
          true, // isTop — modal is always the top layer
          ctx.notifyFocusChange,
          1, // activeCount — modal is singleton
          true, // isOverlay — modal is treated as a floating layer for onlyThis semantics
          ctx.wildcardFirst,
          ctx.currentMode,
          ctx.conditions,
          ctx.isNormalChar,
          ctx.notifyPendingSyncs,
          ctx.autoTab,
        );
      }

      // If the key was not handled by any modal binding but it is in
      // the allow-list (layer-level or active focus target), pass it
      // through to the next pipeline stage instead of blocking.
      if (
        !handled &&
        layer &&
        isAllowed(layer, ctx.eventNames, ctx.conditions)
      ) {
        return false;
      }

      if (layer) {
        invokeMissIfNeeded(
          layer,
          handled,
          ctx.key,
          ctx.input,
          ctx.eventNames,
          ctx.conditions,
        );
      }

      return true;
    },
    id: "modal",
  };
}
