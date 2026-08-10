/**
 * Determine whether the key event represents a "normal" character.
 *
 * Only input with actual character content is eligible. The caller provides
 * an `isSpecialKey` predicate that should return `true` for arrow keys,
 * navigation keys (return, escape, tab, backspace, delete, pageup, pagedown,
 * home, end), modifier keys (ctrl, meta, super, hyper), and release events.
 *
 * This function drives the wildcard `"*"` binding — only normal characters
 * are ever matched by the wildcard.
 *
 * @param input        - Raw character from the framework's keyboard event.
 * @param key          - Key descriptor from the framework.
 * @param isSpecialKey - Framework-provided predicate returning `true` when
 *                       the key is NOT a normal character.
 * @returns true when the event should be treated as a normal character.
 *
 * @example
 * ```ts
 * // Custom framework adapter: pass a predicate inspecting the native Key shape
 * function mySpecialKeyChecker(key: unknown): boolean {
 *   const k = key as Record<string, unknown>;
 *   return k.ctrl || k.meta || k.return || k.escape || k.tab
 *     || k.upArrow || k.downArrow || k.leftArrow || k.rightArrow;
 * }
 *
 * isNormalCharacter('a', myKey, mySpecialKeyChecker); // true
 * isNormalCharacter('', myKey, mySpecialKeyChecker);  // false (empty input)
 * ```
 *
 * Common uses: filtering printable vs special keys inside
 * `normalizeKeyNames` adapters, distinguishing text input from command
 * keys in custom input components, and deciding in pipeline processors
 * whether an event should be consumed or passed through.
 */
export function isNormalCharacter(
  input: string,
  key: unknown,
  isSpecialKey: (key: unknown) => boolean,
): boolean {
  if (!input) return false;
  return !isSpecialKey(key);
}
