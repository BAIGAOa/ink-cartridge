/**
 * Evaluate a `when` condition — either a function `() => boolean`, a
 * string referencing a named condition, or `undefined` (always passes).
 *
 * When `when` is a string and the named condition has not been
 * registered, this throws a descriptive error so the missing
 * `addCondition(id, ...)` call is caught immediately at key-press time.
 *
 * @param when       - The condition to evaluate.
 * @param conditions - The conditions map from the pipeline context.
 * @returns The resolved boolean value of the condition.
 * @throws If `when` is a string referencing an unregistered condition.
 */
export function checkWhen(
  when: (() => boolean) | string | undefined,
  conditions: Map<string, boolean>,
): boolean {
  if (when === undefined) return true;
  if (typeof when === 'string') {
    const value = conditions.get(when);
    if (value === undefined) {
      throw new Error(
        `[ink-cartridge] Condition "${when}" is not registered. ` +
        `Call addCondition("${when}", <defaultValue>) before using ` +
        `when: "${when}" in a keyboard binding.`,
      );
    }
    return value;
  }
  return when();
}
