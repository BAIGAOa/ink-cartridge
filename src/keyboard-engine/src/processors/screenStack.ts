import type {
	PipelineContext,
	PipelineProcessor,
} from '../types/processor.js';
import { handleLayer } from '../layerHandler.js';

/**
 * Create a processor for the screen stack stage.
 *
 * Only runs when no layer consumed the event. Iterates the page path from
 * top to bottom, offering the event to each page layer via
 * {@link handleLayer}. The first page that returns `true` stops the
 * iteration.
 *
 * @returns A PipelineProcessor for the screen stack stage.
 */
export function createScreenStackProcessor<TComponent>(): PipelineProcessor<TComponent> {
  return {
    process(ctx: PipelineContext<TComponent>): boolean {
      if (ctx.noActiveProcessor.includes(this.id)) return false

      const path = ctx.pagePath;
      for (let i = path.length - 1; i >= 0; i--) {
        const comp = path[i];
        const layer = ctx.layersRef.get(comp);
        if (!layer) continue;
        if (handleLayer(ctx, layer, i === path.length - 1)) break;
      }
      return false;
    },
    id: 'screen-stack',
  };
}
