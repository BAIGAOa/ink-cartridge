import type { PipelineContext, ProcessorInput } from "../types/processor.js";
import { checkGlobalKey } from "../checkGlobalKey.js";
import { checkWhen } from "../checkWhen.js";

function anyLayerHasOverride<TComponent>(
  ctx: PipelineContext<TComponent>,
  keyNames: string[],
): boolean {
  for (const layerState of ctx.allLayers) {
    const keyboardLayer = ctx.layerKeyboardRefs.get(layerState.layerId);
    if (!keyboardLayer) continue;
    for (const elementId of layerState.activeElements) {
      const element = keyboardLayer.elementKeyboards.get(elementId);
      if (element && keyNames.some((k) => element.globalKeyOverrides.has(k))) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Create a processor for global single-key bindings.
 *
 * Iterates registered global keys, filters by the given affectOverlay flag,
 * applies executeWhenNoOverlay / override (cover) / category / times /
 * when constraints, and fires the first matching entry. Entries are
 * matched against the phase via their `affectLayer` field: `true` entries
 * run in the overlay phase (before the layer broadcast), `false` entries
 * in the screen phase (after it).
 */
export function createGlobalKeyProcessor<TComponent>(config: {
  affectOverlay: boolean;
}): ProcessorInput<TComponent> {
  const { affectOverlay } = config;
  return {
    active: true,
    process(ctx: PipelineContext<TComponent>): boolean {
      for (const entry of ctx.globalKeys) {
        if ((entry.affectLayer ?? false) !== affectOverlay) continue;

        if (entry.mode && entry.mode !== ctx.currentMode) continue;
        if (!checkWhen(entry.when, ctx.conditions)) continue;

        if (
          affectOverlay &&
          ctx.allLayers.length === 0 &&
          !entry.executeWhenNoOverlay
        ) {
          continue;
        }

        if (entry.cover !== false) {
          const keyNames = Array.isArray(entry.key) ? entry.key : [entry.key];
          const hasOverride = affectOverlay
            ? anyLayerHasOverride(ctx, keyNames)
            : ctx.topComponent
              ? keyNames.some((k) =>
                  ctx.layersRef
                    .get(ctx.topComponent)
                    ?.globalKeyOverrides.has(k),
                )
              : false;
          if (hasOverride) continue;
        }

        if (
          checkGlobalKey(entry, ctx.eventNames, ctx.topComponent, ctx.layersRef)
        ) {
          if (entry.times !== undefined && entry.times >= 1) {
            entry.pressCount! += 1;
            entry.observer?.(entry.times - entry.pressCount!);
            if (entry.pressCount! < entry.times!) {
              return true;
            }
            entry.pressCount = 0;
          }
          entry.operate();
          return true;
        }
      }
      return false;
    },
    id: `global-key-${affectOverlay ? "overlay" : "screen"}`,
  };
}
