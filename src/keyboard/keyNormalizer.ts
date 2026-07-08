/**
 * Convert a framework's `(input, key)` event into a list of possible key-name
 * strings for matching.
 *
 * For special keys (return, escape, arrows, etc.) it produces the base
 * name plus any modifier-prefixed variants.  For character keys it
 * produces the raw character and modifier combinations.
 *
 * Examples:
 *   press('s', { ctrl: true })              →  ["s", "ctrl+s"]
 *   press('',  { escape: true })            →  ["escape"]
 *   press('',  { return: true, shift: true }) → ["return", "shift+return"]
 *
 * @param input - Raw character string from Ink's useInput (empty for special keys).
 * @param key   - Full Key descriptor from Ink.
 * @returns An ordered array of key-name strings; first match wins in the pipeline.
 */
export function normalizeKeyNames(input: string, key: unknown): string[] {
  const k = key as any;
  const names: string[] = [];

  const specialMap: Array<[string, string]> = [
    ['return', 'return'],
    ['escape', 'escape'],
    ['backspace', 'backspace'],
    ['delete', 'delete'],
    ['upArrow', 'up'],
    ['downArrow', 'down'],
    ['leftArrow', 'left'],
    ['rightArrow', 'right'],
    ['tab', 'tab'],
    ['pageDown', 'pagedown'],
    ['pageUp', 'pageup'],
    ['home', 'home'],
    ['end', 'end'],
  ];

  for (const [kProp, kName] of specialMap) {
    if (k[kProp]) {
      names.push(kName);
      if (k.ctrl) names.push(`ctrl+${kName}`);
      if (k.shift) names.push(`shift+${kName}`);
      if (k.meta) names.push(`meta+${kName}`);
      if (k.ctrl && k.shift) names.push(`ctrl+shift+${kName}`);
      return names;
    }
  }

  if (input) {
    names.push(input);
    if (k.ctrl) names.push(`ctrl+${input}`);
    if (k.shift) names.push(`shift+${input}`);
    if (k.meta) names.push(`meta+${input}`);
    if (k.ctrl && k.shift) names.push(`ctrl+shift+${input}`);
  }

  return names;
}

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
 *
 * @2026-06-14 v3.4.0
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
