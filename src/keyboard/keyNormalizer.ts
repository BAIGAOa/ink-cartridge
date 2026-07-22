/**
 * Convert Ink's `(input, key)` event into a list of possible key-name
 * strings for matching.
 *
 * When a modifier (ctrl, shift, meta) is held, the bare key name is
 * excluded so that modified keys (e.g. "shift+tab") do not accidentally
 * trigger bindings registered for the bare key alone (e.g. "tab").
 *
 * Examples:
 *   press('s', { ctrl: true })               → ["ctrl+s"]
 *   press('',  { escape: true })             → ["escape"]
 *   press('',  { return: true, shift: true }) → ["shift+return"]
 *   press('',  { tab: true })                → ["tab"]
 *   press('',  { tab: true, shift: true })   → ["shift+tab"]
 *
 * @param input - Raw character string from Ink's useInput (empty for special keys).
 * @param key   - Full Key descriptor from Ink.
 * @returns An ordered array of key-name strings.
 */
export function normalizeKeyNames(input: string, key: unknown): string[] {
  const k = key as any;
  const names: string[] = [];

  const hasCtrl = k.ctrl as boolean;
  const hasShift = k.shift as boolean;
  const hasMeta = k.meta as boolean;
  const hasModifier = hasCtrl || hasShift || hasMeta;

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
    if (!k[kProp]) {
      continue;
    }

    if (!hasModifier) {
      names.push(kName);
    }

    if (hasCtrl) {
      names.push(`ctrl+${kName}`);
    }
    if (hasShift) {
      names.push(`shift+${kName}`);
    }
    if (hasMeta) {
      names.push(`meta+${kName}`);
    }
    if (hasCtrl && hasShift) {
      names.push(`ctrl+shift+${kName}`);
    }

    return names;
  }

  if (input) {
    if (!hasModifier) {
      names.push(input);
    }

    if (hasCtrl) {
      names.push(`ctrl+${input}`);
    }
    if (hasShift) {
      names.push(`shift+${input}`);
    }
    if (hasMeta) {
      names.push(`meta+${input}`);
    }
    if (hasCtrl && hasShift) {
      names.push(`ctrl+shift+${input}`);
    }
  }

  return names;
}
