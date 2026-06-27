import type { Key } from 'ink';
import type {
  ScreenKeyboardLayer,
  BoundKeyEntry,
  PendingSequence,
  KeyRule,
} from './types.js';
import { isNormalCharacter } from './keyNormalizer.js';

const DEFAULT_SEQUENCE_TIMEOUT = 500;

/**
 * Check whether a normalized key name is covered by a list of key rules.
 *
 * A key is covered when any rule's key matches, AND the rule either has no
 * `when` condition or the condition evaluates to `true`. When all matching
 * rules have `when` returning `false`, the key is NOT covered.
 */
export function keyMatchesRule(
  keyName: string,
  rules: KeyRule[],
): boolean {
  for (const rule of rules) {
    if (rule.key === keyName) {
      if (!rule.when || rule.when()) return true;
    }
  }
  return false;
}

/**
 * Iterate through a list of bindings and fire the first matching handler.
 *
 * Matches exact key names first, then falls back to the wildcard `"*"` binding
 * for normal character input (see {@link isNormalCharacter}).
 *
 * A binding fires only when ALL of the following are satisfied (AND relationship):
 *   1. `skipBinding` returns `false` / absent (covers `onlyThis`)
 *   2. `when` returns `true` / absent (covers conditional enablement)
 *   3. Key name matches one in `binding.keys`
 *
 * The short-circuit evaluation order is skipBinding → when → keyMatch.
 * This order does NOT create priority among the conditions — they are
 * logical AND peers. Whether skipBinding is checked before or after when,
 * all must pass for the binding to fire.
 *
 * @param bindings      Ordered list of key bindings to try.
 * @param unblockedKeys Normalized key names not blocked at this layer.
 * @param input         Raw character from Ink's useInput.
 * @param key           Full Key descriptor from Ink.
 * @param skipBinding   Optional predicate to skip individual bindings
 *                      (used for `onlyThis` enforcement).
 * @returns `true` if a binding matched and consumed the event.
 */
export function tryMatchBindings(
  bindings: BoundKeyEntry[],
  unblockedKeys: string[],
  input: string,
  key: Key,
  skipBinding?: (binding: BoundKeyEntry) => boolean,
): boolean {
  if (unblockedKeys.length === 0) return false;

  for (const binding of bindings) {
    if (skipBinding && skipBinding(binding)) continue;
    if (binding.when?.() === false) continue;
    if (binding.keys.some((k) => unblockedKeys.includes(k))) {
      binding.handler(input, key);
      return true;
    }
  }

  const wildcardBinding = bindings.find(b => b.keys.includes('*'));
  if (wildcardBinding && isNormalCharacter(input, key)) {
    if (!skipBinding || !skipBinding(wildcardBinding)) {
      if (wildcardBinding.when?.() === false) return false;
      wildcardBinding.handler(input, key);
      return true;
    }
  }

  return false;
}

/**
 * Built-in Tab / Shift+Tab focus rotation for a given layer.
 *
 * Cycles {@link ScreenKeyboardLayer.currentFocusId} through the layer's
 * {@link ScreenKeyboardLayer.focusOrder} list (Tab forward, Shift+Tab backward).
 * Wraps around at both ends.
 *
 * @returns `true` if a tab event was handled and focus was moved.
 */
export function handleTabNavigation(
  layer: ScreenKeyboardLayer,
  eventNames: string[],
  shift: boolean,
  notifyFocusChange: () => void,
): boolean {
  if (!eventNames.includes('tab') || layer.focusOrder.length === 0) return false;
  const current = layer.currentFocusId;
  let idx = current ? layer.focusOrder.indexOf(current) : -1;
  if (shift) {
    idx = idx <= 0 ? layer.focusOrder.length - 1 : idx - 1;
  } else {
    idx = (idx + 1) % layer.focusOrder.length;
  }
  layer.currentFocusId = layer.focusOrder[idx];
  notifyFocusChange();
  return true;
}

/**
 * Handle a keyboard event against a single layer.
 *
 * Evaluates tab navigation, blocked keys, wildcard priority, sequence
 * matching, focus-target bindings, layer-level bindings, and stopped
 * keys — in that order.
 *
 * @returns true if the event was consumed by this layer.
 *
 * @2026-06-14 v3.4.0
 */
export function handleLayer(
  layer: ScreenKeyboardLayer,
  eventNames: string[],
  input: string,
  key: Key,
  isTop: boolean,
  notifyFocusChange: () => void,
  activeOverlayCount: number,
  isOverlay: boolean,
  wildcardFirst: boolean,
): boolean {
  // The reason it has the highest priority is to ensure that tab/shift+tab have the highest priority, avoiding conflicts with business-bound actions.
  // However, when there is no Focus Target in the Current Screen, handleTabNavigation will return false, which allows users to retain flexibility. When tab/shift+tab do not need to be enforced,
  // they can also be bound to business-specific keys.
  if (isTop && handleTabNavigation(layer, eventNames, key.shift, notifyFocusChange)) return true;

  const blocked = layer.blockedKeys;
  const unblocked = eventNames.filter((n) => !keyMatchesRule(n, blocked));

  // onlyThis semantics differ between screens and overlays:
  // - Screen: skip when any overlay is active (activeOverlayCount > 0)
  // - Overlay: skip only when multiple overlays compete (activeOverlayCount > 1)
  const shouldSkipOnlyThis = (b: BoundKeyEntry): boolean => {
    if (!b.onlyThis) return false;
    if (isOverlay) return activeOverlayCount > 1;
    return activeOverlayCount > 0;
  };

  // Wildcard priority pre-check: when enabled, wildcard `*` bindings
  // are evaluated before sequences, exact matches, and everything else.
  // Only normal characters are affected — special keys fall through.
  if (isTop && wildcardFirst && unblocked.length > 0) {
    // Check focus-target wildcard first
    if (layer.currentFocusId) {
      const ft = layer.focusTargets.get(layer.currentFocusId);
      if (ft) {
        const fBlocked = ft.blockedKeys;
        const fUnblocked = unblocked.filter(n => !keyMatchesRule(n, fBlocked));
        if (fUnblocked.length > 0) {
          const wb = ft.bindings.find(b => b.keys.includes('*'));
          if (wb && isNormalCharacter(input, key)) {
            if (wb.when?.() === false) { /* skip */ }
            else if (!shouldSkipOnlyThis(wb)) {
              wb.handler(input, key);
              return true;
            }
          }
        }
      }
    }
    // Check screen-level wildcard
    const wb = layer.bindings.find(b => b.keys.includes('*'));
    if (wb && isNormalCharacter(input, key)) {
      if (wb.when?.() === false) { /* skip */ }
      else if (!shouldSkipOnlyThis(wb)) {
        wb.handler(input, key);
        return true;
      }
    }
  }

  // Sequence matching: only for the top layer (isTop).
  // Sequences have priority over ordinary boundKeyboard bindings.
  if (isTop && unblocked.length > 0) {
    const pending = layer.pendingSequence;

    // We already have a pending sequence in progress.
    if (pending !== null) {
      // If the when condition changed to false mid-sequence, cancel
      // the pending sequence and let the key fall through to normal processing.
      if (pending.when?.() === false) {
        clearTimeout(pending.timer);
        layer.pendingSequence = null;
        // Fall through to normal bindings — do NOT return true.
      } else {
        const expectedKey = pending.sequences[pending.nextIndex];
        if (unblocked.includes(expectedKey)) {
          // Matched the next key in the sequence.
          clearTimeout(pending.timer);
          pending.nextIndex++;
          // Narrow candidates to only those whose next key also matches.
          if (pending.candidates && pending.candidates.length > 1) {
            const nextIdx = pending.nextIndex - 1;
            const narrowed = pending.candidates.filter(
              c => c.keys.length > nextIdx && unblocked.includes(c.keys[nextIdx]),
            );
            pending.candidates = narrowed.length <= 1 ? undefined : narrowed;
          }
          if (pending.nextIndex === pending.sequences.length) {
            // Full sequence matched — fire handler.
            pending.handler(input, key);
            layer.pendingSequence = null;
          } else {
            // Still waiting for more keys — restart the timeout.
            pending.timer = setTimeout(() => {
              if (layer.pendingSequence === pending) layer.pendingSequence = null;
            }, pending.timeout);
          }
          return true;
        } else {
          // Mismatch.
          if (pending.options?.exclusive === true) {
            // Exclusive mode: ignore the key, keep waiting.
            return true;
          }
          if (pending.candidates && pending.candidates.length > 1) {
            // Non-exclusive with multiple candidates: try the current key
            // against every candidate's next expected key to disambiguate.
            const nextIdx = pending.nextIndex;
            const stillPossible = pending.candidates.filter(
              c => c.keys.length > nextIdx && unblocked.includes(c.keys[nextIdx]),
            );
            if (stillPossible.length === 0) {
              // No candidate matches — cancel all and fall through.
              clearTimeout(pending.timer);
              layer.pendingSequence = null;
            } else {
              // One or more candidates match — lock in the first match
              // and restart the sequence from it.
              const chosen = stillPossible[0];
              clearTimeout(pending.timer);
              const timeout = chosen.timeout ?? DEFAULT_SEQUENCE_TIMEOUT;
              const newSeq: PendingSequence = {
                sequences: chosen.keys,
                nextIndex: nextIdx + 1,
                handler: chosen.handler,
                timer: undefined as unknown as NodeJS.Timeout,
                timeout,
                options: chosen.options,
                when: chosen.when,
                candidates: stillPossible.length === 1 ? undefined : stillPossible,
              };
              if (newSeq.nextIndex === newSeq.sequences.length) {
                chosen.handler(input, key);
              } else {
                newSeq.timer = setTimeout(() => {
                  if (layer.pendingSequence === newSeq) layer.pendingSequence = null;
                }, timeout);
              }
              layer.pendingSequence = newSeq;
            }
          } else {
            // No candidates (single binding): cancel and fall through.
            clearTimeout(pending.timer);
            layer.pendingSequence = null;
          }
        }
      }
    }

    // No pending sequence — try to start a new one from the first unblocked key.
    if (layer.pendingSequence === null) {
      // Check each unblocked key name (not just the first) to handle
      // modifier combinations like 'ctrl+w' which appear after 'w'.
      for (const keyName of unblocked) {
        // When ctrl/meta modifier is held (but not shift), a bare key name
        // (without '+') does not represent the keystroke the user intended.
        // normalizeKeyNames expands ctrl+d into ['d', 'ctrl+d']; matching 'd'
        // here would incorrectly start a ['d', 'v'] sequence instead of
        // letting boundKeyboard(['ctrl+d'], ...) consume the event.
        // Shift is exempt because it changes the character (d → D), so the
        // bare key name 'D' faithfully represents shift+d.
        // @2026-06-23 v3.6.1
        if ((key.ctrl || key.meta) && !keyName.includes('+')) {
          continue;
        }
        const candidates = layer.sequences.get(keyName);
        if (!candidates || candidates.length === 0) continue;
        // Filter by onlyThis, focusId, and when constraints.
        const matching = candidates.filter(binding => {
          if (binding.options?.onlyThis) {
            if (isOverlay) return activeOverlayCount <= 1;
            else return activeOverlayCount === 0;
          }
          if (binding.options?.focusId) {
            return layer.currentFocusId === binding.options.focusId;
          }
          if (binding.when?.() === false) return false;
          return true;
        });
        if (matching.length === 0) continue;
        // Pick the first match as the initial sequence state.
        const selected = matching[0];
        const timeout = selected.timeout ?? DEFAULT_SEQUENCE_TIMEOUT;
        const newSeq: PendingSequence = {
          sequences: selected.keys,
          nextIndex: 1,
          handler: selected.handler,
          timer: undefined as unknown as NodeJS.Timeout,
          timeout,
          options: selected.options,
          when: selected.when,
          // Store all matching candidates so subsequent keys can
          // disambiguate between sequences sharing the same first key.
          // In exclusive mode or when there is only one candidate, the
          // field is omitted so the mismatch path behaves as before.
          candidates: selected.options?.exclusive === true
            ? undefined
            : (() => {
                const nonExclusive = matching.filter(c => c.options?.exclusive !== true);
                return nonExclusive.length <= 1 ? undefined : nonExclusive;
              })(),
        };
          const timer = setTimeout(() => {
            if (layer.pendingSequence === newSeq) layer.pendingSequence = null;
          }, timeout);
          newSeq.timer = timer;
          layer.pendingSequence = newSeq;
          return true;
      }
    }
  }

  if (isTop && layer.currentFocusId) {
    const ft = layer.focusTargets.get(layer.currentFocusId);
    if (ft) {
      const fBlocked = ft.blockedKeys;
      const fUnblocked = unblocked.filter((n) => !keyMatchesRule(n, fBlocked));

      if (tryMatchBindings(ft.bindings, fUnblocked, input, key, shouldSkipOnlyThis)) return true;

      if (eventNames.some((n) => keyMatchesRule(n, ft.stoppedKeys))) {
        return true;
      }
    }
  }

  if (tryMatchBindings(layer.bindings, unblocked, input, key, shouldSkipOnlyThis)) return true;

  if (isTop && eventNames.some((n) => keyMatchesRule(n, layer.stoppedKeys))) {
    return true;
  }

  return false;
}
