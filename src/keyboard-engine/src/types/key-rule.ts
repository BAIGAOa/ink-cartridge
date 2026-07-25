/**
 * A single key rule with an optional when condition.
 *
 * Used internally for penetrationKeys and stoppedKeys to support
 * conditional transparency and conditional propagation barriers.
 */
export interface KeyRule {
  /** Normalized key name. */
  key: string;
  /**
   * If provided, the rule only applies when this callback returns `true`.
   * When `false` or omitted, the rule always applies.
   */
  when?: (() => boolean) | string;
}