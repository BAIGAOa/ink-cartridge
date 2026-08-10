/**
 * Unique symbol identifying the internal default focus layer.
 *
 * Distinct from any string, so user-defined groups and layer IDs can
 * never collide with the default group.
 */
export const defaultTargetsSymbol: unique symbol = Symbol("default");