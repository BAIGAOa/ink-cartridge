import type {
	PipelineContext,
	PipelineProcessor,
} from '../types/processor.js';

/**
 * Create a processor for composition key chains.
 *
 * Two instances are created by {@link PipelineManager} — one for the
 * layer phase ({@link affectOverlay} = `true`) and one for the page
 * phase ({@link affectOverlay} = `false`). Both read the shared
 * {@link CompositionEngine} instance from {@link PipelineContext.compositionEngine}.
 *
 * @param config.affectOverlay - Which pipeline phase this instance serves.
 * @returns A PipelineProcessor for the composition stage.
 */
export function createCompositionProcessor<TComponent>(config: {
  affectOverlay: boolean;
}): PipelineProcessor<TComponent> {
  const { affectOverlay } = config;
  return {
    process(ctx: PipelineContext<TComponent>): boolean {
      if (ctx.noActiveProcessor.includes(this.id)) return false
      // Guard: if a global sequence is pending and we are not already
      // handling a composition chain, let the key fall through.
      if (!ctx.compositionEngineHandler && ctx.pendingSeqRef.current !== null) {
        return false;
      }

      return ctx.compositionEngine.start(ctx, affectOverlay);
    },
    id: `composition-${affectOverlay ? 'overlay' : 'screen'}`,
  };
}
