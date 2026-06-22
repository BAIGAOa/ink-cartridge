import type { PipelineContext, PipelineProcessor } from '../types.js';
import { handleLayer } from '../layer-handler.js';

/**
 * Create a processor for the modal stage (stage 0 — highest priority).
 *
 * When a modal is active (activeModalId is set), the modal's keyboard layer
 * receives the event. The processor always returns `true`, consuming every
 * event — even keys not bound in the modal — so that no event reaches
 * lower-priority stages (global keys, overlays, or screens).
 *
 * This gives modals absolute keyboard priority: when a modal is open,
 * nothing else receives keyboard events.
 *
 * @returns A PipelineProcessor for the modal stage.
 */
export function createModalProcessor(): PipelineProcessor {
  return {
    process(ctx: PipelineContext): boolean {
      if (!ctx.activeModalId) return false;

      const layer = ctx.layersRef.current.get(ctx.activeModalId);
      if (layer) {
        handleLayer(
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

      // Always return true — modal blocks all events from reaching
      // lower-priority stages, even when the event is not handled
      // by any binding within the modal.
      return true;
    },
  };
}
