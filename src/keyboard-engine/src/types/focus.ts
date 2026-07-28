import { BoundKeyEntry } from "./binding.js";
import { KeyRule } from "./key-rule.js";

/**
 * Keyboard state for a single named focus target on a screen layer.
 *
 * Focus targets allow multiple form controls on the same screen to have
 * independent key bindings. Only the currently active target receives
 * events; inactive targets are skipped.
 */
export interface FocusTarget {
  /** Registered key bindings (evaluation order). */
  bindings: BoundKeyEntry[];
  /** Key rules marked as transparent on this target (pass-through). */
  penetrationKeys: KeyRule[];
  /** Key rules stopped on this target (propagation barrier). */
  stoppedKeys: KeyRule[];
  /** Maps action IDs to the normalized keys that trigger them (for stopAction). */
  actionKeysMap: Map<string, string[]>;
  
  allowedKeys: string[]
}

export interface FocusSetOptions {
  /**
   * The focus group identifier. When set, focuses a target within a
   * specific named group rather than the default group.
   */
  group?: string;
  /**
   * The element ID within the current layer. Required when the current
   * owner is a string (layerId) to locate the specific element's keyboard
   * layer within the layer's element map.
   */
  element?: string;
}
