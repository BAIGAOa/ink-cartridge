/**
 * A single global key definition.
 *
 * Global keys fire regardless of the screen stack (subject to
 * `category` whitelist and `affectLayer` placement).
 */
export interface GlobalKeyEntry {
  /**
   * Key name(s) to match.
   *
   * Supports single string or array. Uses the same normalized key-name
   * format as `boundKeyboard` (`"s"`, `"ctrl+q"`, `"return"`, etc.).
   */
  key: string | string[];

  /** Callback to invoke when the key is pressed.
   * It can also be a string, which is used to directly invoke an operation
   */
  operate: (() => void) | string;

  /**
   * Whether screen components are allowed to override this global key
   * via `boundKeyboard`. Defaults to `true`.
   *
   * When `false`, calling `boundKeyboard` with the same key while the
   * current screen is in the global key's `category` whitelist will
   * throw a runtime error.
   */
  cover?: boolean;

  /**
   * Whether this global key fires before the layer broadcast.
   *
   * - `false` (default): layer broadcast → global key → screen stack
   * - `true`:            global key → layer broadcast → screen stack
   */
  affectLayer?: boolean;

  /**
   * Number of times the global key must be pressed before the handler fires.
   * Defaults to `undefined` (fire immediately on every press).
   *
   * The counter is per-global-key-entry and never auto-resets. When the
   * counter reaches `times`, the handler fires and the counter resets to 0.
   *
   * Must be >= 1.
   *
   * Examples:
   * - `times: 2` → handler fires on the 2nd, 4th, 6th… press.
   */
  times?: number;

  /**
   * Whitelist of screen components that may use this global key.
   *
   * - `"*"` or omitted: all screens
   * - `[]`: no screens (effectively disabled)
   * - `[Menu, Game]`: only when the stack top is exactly Menu or Game
   */
  category?: unknown[] | "*";

  /**
   * Optional condition callback. When provided, the global key only fires
   * if this returns `true` at the moment of the key press. When `false`,
   * the entry is skipped entirely — `cover`, `category`, and other options
   * are not evaluated.
   */
  when?: (() => boolean) | string;
  executeWhenNoOverlay?: boolean;

  /**
   * Callback invoked on every key press while counting toward `times`.
   * Receives the number of remaining presses before the handler fires.
   * Requires `times` to be set; throws at registration otherwise.
   *
   * @param remaining - How many more presses are needed before the handler fires.
   */
  observer?: (remaining: number) => void;

  /**
   * Restrict this global key to a specific mode.
   *
   * When set, the processor skips this entry unless
   * {@link PipelineContext.currentMode} matches. Checked before `when`,
   * `affectLayer`, `category`, and `cover` evaluation. When omitted,
   * the global key fires in all modes (including no-mode).
   *
   * @example
   * ```ts
   * // Only active in normal mode
   * globalKeys([{ key: 'j', operate: moveDown, mode: 'normal' }]);
   * ```
   */
  mode?: string;
}

/**
 * A single global sequence key definition.
 *
 * Global sequence keys fire regardless of the screen stack, with higher
 * priority than {@link GlobalKeyEntry}. They match multi-key sequences
 * (e.g. `['g', 'g']`, `['ctrl+w', 'q']`) instead of single key presses.
 *
 * Unlike global keys, global sequences do NOT support `times`.
 */
export interface GlobalSequenceEntry {
  /**
   * Ordered key names that make up the sequence (e.g. `['g', 'g']`,
   * `['ctrl+w', 'q']`). Must have length ≥ 2.
   */
  keys: string[];

  /**
   * Callback to invoke when the full sequence is matched.
   *
   * Can also be a string referencing a registered {@link SequenceOperationEntry}
   * by its `sequenceActionId`. When a string is provided, the action's
   * `action` callback is used. The action must be registered via
   * {@link KeyboardEngine.defineSequenceAction} or
   * {@link KeyboardEngine.addSequenceAction} before calling
   * `globalSequence`.
   */
  operate: (() => void) | string;

  /**
   * Whether screen components are allowed to override this global sequence
   * via `boundSequence`. Only sequence bindings can override — ordinary
   * `boundKeyboard` bindings are never checked against global sequences.
   *
   * @default true
   */
  cover?: boolean;

  /**
   * Whether this global sequence fires before the layer broadcast.
   *
   * - `false` (default): layer broadcast → global sequence → … → screen stack
   * - `true`:            global sequence → layer broadcast → … → screen stack
   */
  affectLayer?: boolean;

  /**
   * Whitelist of screen components that may use this global sequence.
   *
   * - `"*"` or omitted: all screens
   * - `[]`: no screens (effectively disabled)
   * - `[Menu, Game]`: only when the stack top is exactly Menu or Game
   */
  category?: unknown[] | "*";

  /**
   * Maximum time in milliseconds between key presses within the sequence.
   * The timer starts when the first key is pressed and resets on each
   * matching key. If it expires before the full sequence is entered, the
   * pending state is cancelled.
   *
   * @default 500
   */
  timeout?: number;

  /**
   * Controls behaviour when a key is pressed that does NOT match the
   * next key expected by the pending sequence.
   *
   * - `false` (default): the mismatched key **cancels** the pending
   *   sequence and falls through to lower-priority handlers.
   * - `true`: the mismatched key is **silently consumed** — the sequence
   *   keeps waiting until the timeout expires or the correct key arrives.
   */
  exclusive?: boolean;

  /**
   * Optional condition callback. When provided, the global sequence only
   * starts and continues when this returns `true`.
   */
  when?: (() => boolean) | string;
  executeWhenNoOverlay?: boolean;

  /**
   * Restrict this global sequence to a specific mode.
   *
   * When set, the processor skips this entry unless
   * {@link PipelineContext.currentMode} matches. Checked before `when`,
   * `affectLayer`, `category`, and `cover` evaluation. When omitted,
   * the sequence is active in all modes (including no-mode).
   *
   * @example
   * ```ts
   * // Only active in normal mode
   * globalSequence([{ keys: ['g', 'g'], operate: scrollToTop, mode: 'normal' }]);
   * ```
   */
  mode?: string;
}

/**
 * Type definition for shortcut
 */
export interface ShortcutOperationEntry {
  /**
   * Unique identification of the shortcut
   * Used to get an operation and so on.
   */
  actionId: string;
  /**
   * What does calling a shortcut trigger
   */
  action: () => void;
  /**
   * You can directly specify the predetermined Keys of this Action
   */
  keys?: string[];
}

export interface SequenceOperationEntry {
  /**
   * Unique identification of this Action
   */
  sequenceActionId: string;
  action: () => void;
  /**
   * Preset Key
   */
  keys?: string[];
  /**
   * Preset delay
   */
  timeout?: number;
}

/**
 * Internal type: {@link GlobalSequenceEntry} after string `operate`
 * references have been resolved to callable functions.
 *
 * Used by the keyboard provider's refs after `globalSequence()` resolves
 * action IDs. Public API continues to accept `GlobalSequenceEntry` with
 * `operate: string | (() => void)`.
 */
export interface ResolvedGlobalSequenceEntry extends Omit<
  GlobalSequenceEntry,
  "operate"
> {
  operate: () => void;
}

/**
 * Internal type: {@link GlobalKeyEntry} after string `operate`
 * references have been resolved to callable functions and `pressCount`
 * has been initialized for entries with a `times` option.
 *
 * Used by the keyboard provider's refs after `globalKeys()` resolves
 * action IDs. Public API continues to accept `GlobalKeyEntry` with
 * `operate: string | (() => void)`.
 */
export interface ResolvedGlobalKeyEntry {
  key: string | string[];
  operate: () => void;
  cover?: boolean;
  affectLayer?: boolean;
  category?: unknown[] | "*";
  times?: number;
  observer?: (times: number) => void;
  pressCount?: number;
  executeWhenNoOverlay?: boolean;
  when?: (() => boolean) | string;
  mode?: string;
}
