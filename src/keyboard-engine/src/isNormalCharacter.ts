/**
 * Determine whether the key event represents a "normal" character.
 *
 * Only input with actual character content is eligible, and all special
 * keys (arrows, return, escape, tab, backspace, delete, pageup, pagedown,
 * home, end), modifier keys (ctrl, meta, super, hyper), and release events
 * are excluded.
 *
 * This function drives the wildcard `"*"` binding — only normal characters
 * are ever matched by the wildcard.
 *
 * @param input - Raw character from the framework's keyboard event.
 * @param key   - Key descriptor from the framework.
 * @returns true when the event should be treated as a normal character.
 */
export function isNormalCharacter(input: string, key: unknown): boolean {
  const k = key as any;
  if (!input) return false;

  if (k.upArrow) return false;
  if (k.downArrow) return false;
  if (k.leftArrow) return false;
  if (k.rightArrow) return false;

  if (k.pageDown) return false;
  if (k.pageUp) return false;

  if (k.home) return false;
  if (k.end) return false;

  if (k.return) return false;
  if (k.escape) return false;
  if (k.tab) return false;
  if (k.backspace) return false;
  if (k.delete) return false;

  if (k.ctrl) return false;
  if (k.meta) return false;
  if (k.super) return false;
  if (k.hyper) return false;

  if (k.eventType === 'release') return false;

  return true;
}
