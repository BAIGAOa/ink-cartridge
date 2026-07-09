import type {
  PipelineContext,
  PipelineProcessor,
  ResolvedGlobalSequenceEntry,
  GlobalPendingSequence,
} from '../types.js';
import { checkWhen } from '../checkWhen.js';

const DEFAULT_SEQUENCE_TIMEOUT = 500;

/**
 * Try to start a global pending sequence from a specific affectOverlay group.
 *
 * Iterates the candidate entries, filters by affectOverlay, category,
 * and cover/override constraints, and creates a pending sequence when
 * the first key matches.
 *
 * @param entries        Candidate global sequence entries.
 * @param affectOverlay  Which group to filter (true = overlay-phase, false = screen-phase).
 * @param ctx            Full pipeline context.
 * @returns true when a new pending sequence was started (event consumed).
 */
function tryStartGlobalSequence(
  entries: ResolvedGlobalSequenceEntry[],
  affectOverlay: boolean,
  ctx: PipelineContext,
): boolean {
  // Collect all entries that pass every filter AND whose first key
  // matches the current event. When multiple entries share the same
  // first key, they are stored as candidates on the pending sequence
  // so that subsequent keys can disambiguate.
  const matching: ResolvedGlobalSequenceEntry[] = [];

  for (const entry of entries) {
    if ((entry.affectOverlay ?? false) !== affectOverlay) continue;
    if (entry.mode && entry.mode !== ctx.currentMode) continue;

    if (!checkWhen(entry.when, ctx.conditions)) continue

    if (affectOverlay && ctx.activeCount === 0 && !entry.executeWhenNoOverlay) continue;
    if (!ctx.topComponent) continue;

    const cat = entry.category;
    if (cat !== undefined && cat !== '*') {
      if (Array.isArray(cat) && cat.length === 0) continue;
      if (Array.isArray(cat) && !cat.includes(ctx.topComponent)) continue;
    }

    // Cover check: only boundSequence can override a global sequence.
    if (entry.cover !== false) {
      const firstKey = entry.keys[0];
      if (affectOverlay) {
        let anyOverlayHasOverride = false;
        for (const overlay of ctx.activeOverlays) {
          const overlayLayer = ctx.layersRef.current.get(overlay.id);
          if (overlayLayer?.sequences.has(firstKey)) {
            anyOverlayHasOverride = true;
            break;
          }
        }
        if (anyOverlayHasOverride) continue;
      } else {
        if (ctx.topComponent) {
          const topLayer = ctx.layersRef.current.get(ctx.topComponent);
          if (topLayer?.sequences.has(firstKey)) continue;
        }
      }
    }

    if (ctx.eventNames.includes(entry.keys[0])) {
      matching.push(entry);
    }
  }

  if (matching.length === 0) return false;

  // Use the first matching entry as the initial pending state.
  // Candidates are stored for disambiguation when multiple non-exclusive
  // entries share the same first key — same logic as layer-level
  // boundSequence in layer-handler.ts.
  const selected = matching[0];
  const timeout = selected.timeout ?? DEFAULT_SEQUENCE_TIMEOUT;
  const candidates = selected.exclusive === true
    ? undefined
    : (() => {
        const nonExclusive = matching.filter(c => c.exclusive !== true);
        return nonExclusive.length <= 1 ? undefined : nonExclusive;
      })();

  const pending: GlobalPendingSequence = {
    sequences: selected.keys,
    nextIndex: 1,
    handler: selected.operate,
    timer: undefined as unknown as ReturnType<typeof setTimeout>,
    timeout,
    exclusive: selected.exclusive ?? false,
    affectOverlay,
    cover: selected.cover ?? true,
    category: selected.category,
    executeWhenNoOverlay: selected.executeWhenNoOverlay,
    when: selected.when,
    candidates,
  };
  const timer = setTimeout(() => {
    if (ctx.pendingSeqRef.current === pending) {
      ctx.pendingSeqRef.current = null;
    }
  }, timeout);
  pending.timer = timer;
  ctx.pendingSeqRef.current = pending;
  return true;
}

/**
 * Process the currently active global pending sequence.
 *
 * Matches the next expected key, handles exclusive vs non-exclusive
 * mismatch behaviour, and fires the handler when the full sequence
 * is completed.
 *
 * @param ctx  Full pipeline context.
 * @returns true when the event was consumed by the pending sequence.
 */
function processGlobalPending(ctx: PipelineContext, affectOverlay: boolean): boolean {
  const pending = ctx.pendingSeqRef.current;
  if (pending === null) return false;

  // Only process the pending sequence in the stage that matches its
  // affectOverlay group — otherwise a pending sequence started in
  // stage ④ (affectOverlay: false) would have its continuation
  // consumed by stage ① (affectOverlay: true), bypassing the
  // overlay layer.
  if (pending.affectOverlay !== affectOverlay) return false;

  if (pending.affectOverlay && ctx.activeCount === 0 && !pending.executeWhenNoOverlay) {
    clearTimeout(pending.timer);
    ctx.pendingSeqRef.current = null;
    return false;
  }

  if (!checkWhen(pending.when, ctx.conditions)) {
    clearTimeout(pending.timer);
    ctx.pendingSeqRef.current = null;
    return false;
  }

  const expectedKey = pending.sequences[pending.nextIndex];
  if (ctx.eventNames.includes(expectedKey)) {
    clearTimeout(pending.timer);
    pending.nextIndex++;

    // Narrow candidates to only those whose next key also matches.
    // Same pattern as layer-handler.ts.
    if (pending.candidates && pending.candidates.length > 1) {
      const nextIdx = pending.nextIndex - 1;
      const narrowed = pending.candidates.filter(
        c => c.keys.length > nextIdx && ctx.eventNames.includes(c.keys[nextIdx]),
      );
      pending.candidates = narrowed.length <= 1 ? undefined : narrowed;
    }

    if (pending.nextIndex === pending.sequences.length) {
      pending.handler();
      ctx.pendingSeqRef.current = null;
    } else {
      pending.timer = setTimeout(() => {
        if (ctx.pendingSeqRef.current === pending) {
          ctx.pendingSeqRef.current = null;
        }
      }, pending.timeout);
    }
    return true;
  }

  if (pending.exclusive) {
    // Exclusive mode: silently consume the mismatched key, keep waiting.
    return true;
  }

  if (pending.candidates && pending.candidates.length > 1) {
    // Non-exclusive with multiple candidates: try the current key
    // against every candidate's next expected key to disambiguate.
    // Same pattern as layer-handler.ts.
    const nextIdx = pending.nextIndex;
    const stillPossible = pending.candidates.filter(
      c => c.keys.length > nextIdx && ctx.eventNames.includes(c.keys[nextIdx]),
    );
    if (stillPossible.length === 0) {
      // No candidate matches — cancel all and let the key fall through.
      clearTimeout(pending.timer);
      ctx.pendingSeqRef.current = null;
      return false;
    }
    // One or more candidates match — lock in the first match and
    // restart the sequence from it. The current key is consumed as
    // the next key of the chosen candidate.
    const chosen = stillPossible[0];
    clearTimeout(pending.timer);
    const timeout = chosen.timeout ?? DEFAULT_SEQUENCE_TIMEOUT;
    const newPending: GlobalPendingSequence = {
      sequences: chosen.keys,
      nextIndex: nextIdx + 1,
      handler: chosen.operate,
      timer: undefined as unknown as ReturnType<typeof setTimeout>,
      timeout,
      exclusive: chosen.exclusive ?? false,
      affectOverlay: pending.affectOverlay,
      cover: chosen.cover ?? true,
      category: chosen.category,
      executeWhenNoOverlay: chosen.executeWhenNoOverlay,
      when: chosen.when,
      candidates: stillPossible.length === 1 ? undefined : stillPossible,
    };
    if (newPending.nextIndex === newPending.sequences.length) {
      // Full sequence matched — fire handler.
      chosen.operate();
      ctx.pendingSeqRef.current = null;
    } else {
      // Still waiting for more keys — restart the timeout.
      newPending.timer = setTimeout(() => {
        if (ctx.pendingSeqRef.current === newPending) {
          ctx.pendingSeqRef.current = null;
        }
      }, timeout);
      ctx.pendingSeqRef.current = newPending;
    }
    return true;
  }

  // No candidates (single binding): cancel and let the key fall through.
  clearTimeout(pending.timer);
  ctx.pendingSeqRef.current = null;
  return false;
}

/**
 * Create a processor for global multi-key sequences.
 *
 * Handles two sub-steps in order:
 * 1. Drain any active global pending sequence.
 * 2. Try to start a new sequence from registered entries.
 *
 * @param config.affectOverlay - Which priority group this processor serves.
 * @returns A PipelineProcessor for the global sequence stage.
 */
export function createGlobalSequenceProcessor(config: {
  affectOverlay: boolean;
}): PipelineProcessor {
  const { affectOverlay } = config;
  return {
    process(ctx: PipelineContext): boolean {
      if (processGlobalPending(ctx, affectOverlay)) return true;
      if (tryStartGlobalSequence(ctx.globalSequences, affectOverlay, ctx)) return true;
      return false;
    },
    id: `global-sequence-${affectOverlay ? 'overlay' : 'screen'}`,
  };
}
