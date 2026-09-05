import type { PipelineContext, ProcessorInput } from "../types/processor.js";
import { handleLayer } from "../layerHandler.js";

/**
 * Create a processor for the screen stack stage.
 *
 * Only runs when no layer consumed the event. Iterates the page path from
 * top to bottom, offering the event to each page layer via
 * {@link handleLayer}. The first page that returns `true` stops the
 * iteration.
 *
 * @returns A {@link ProcessorInput} for the screen stack stage, to be
 *          registered with {@link KeyboardEngine.addProcessor}.
 */
export function createScreenStackProcessor<
  TComponent,
>(): ProcessorInput<TComponent> {
  return {
    active: true,
    process(ctx: PipelineContext<TComponent>): boolean {
      const path = ctx.pagePath;
      for (let i = path.length - 1; i >= 0; i--) {
        const comp = path[i];
        const layer = ctx.layersRef.get(comp);
        if (!layer) continue;
        if (handleLayer(ctx, layer, i === path.length - 1)) break;
      }
      return false;
    },
    id: "screen-stack",
  };
}
