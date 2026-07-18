import type { PipelineContext, PipelineProcessor } from '../types.js';
import { handleLayer } from '../layerHandler.js';

/**
 * Create a processor for the screen stack stage.
 *
 * Only runs when no overlay consumed the event (`anyOverlayConsumed`
 * is false). Iterates the screen path from top to bottom, offering
 * the event to each layer via {@link handleLayer}. The first layer
 * that returns `true` stops the iteration.
 *
 * @returns A PipelineProcessor for the screen stack stage.
 */
export function createScreenStackProcessor(): PipelineProcessor {
  return {
    process(ctx: PipelineContext): boolean {
      if (ctx.noActiveProcessor.includes(this.id)) return false
      if (ctx.anyOverlayConsumed) return false;

      const path = ctx.screenPath;
      for (let i = path.length - 1; i >= 0; i--) {
        const comp = path[i];
        const layer = ctx.layersRef.current.get(comp);
        if (!layer) continue;
        const isTop = i === path.length - 1;
        if (handleLayer(
          layer, ctx.eventNames, ctx.input, ctx.key,
          isTop, ctx.notifyFocusChange, ctx.activeCount,
          false, ctx.wildcardFirst,
          ctx.currentMode,
          ctx.conditions,
          ctx.notifyPendingSyncs,
          ctx.autoTab
        )) break;
      }
      return false;
    },
    id: 'screen-stack',
  };
}
