import type { PipelineContext, PipelineProcessor } from '../types.js';
import { handleLayer } from '../layerHandler.js';

/**
 * Create a processor for the overlay broadcast stage.
 *
 * Iterates all active overlays (sorted by zIndex ascending) and offers
 * the event to each one via {@link handleLayer}. Unlike other processors,
 * this stage does NOT stop on the first consumer — every active overlay
 * receives the event. The `anyOverlayConsumed` flag on the context is
 * set if at least one overlay handled the event, which later determines
 * whether the screen stack (stage ⑥) runs.
 *
 * @returns A PipelineProcessor for the overlay broadcast stage.
 */
export function createOverlayProcessor<TComponent>(): PipelineProcessor<TComponent> {
  return {
    process(ctx: PipelineContext<TComponent>): boolean {
      if (ctx.noActiveProcessor.includes(this.id)) {
        return false
      }

      for (const overlay of ctx.activeOverlays) {
        const layer = ctx.layersRef.current.get(overlay.id);
        if (layer && handleLayer(
          layer, ctx.eventNames, ctx.input, ctx.key,
          true, ctx.notifyFocusChange, ctx.activeCount,
          true, ctx.wildcardFirst,
          ctx.currentMode,
          ctx.conditions,
          ctx.isNormalChar,
          ctx.notifyPendingSyncs,
          ctx.autoTab
        )) {
          ctx.anyOverlayConsumed = true;
          // Do not break — continue to next overlay (broadcast semantics).
        }
      }
      // Always return false so the chain continues to subsequent stages.
      return false;
    },
    id: 'overlay',
  };
}
