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

  /**
   * Callback to invoke when the key is pressed.
   * Can also be a string naming a registered shortcut action
   * (see {@link KeyboardEngine.addAction}), whose callback is invoked instead.
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
  /**
   * When `true`, an overlay-phase entry (`affectLayer: true`) fires even
   * while no layer is open. With the default `false`, the entry is skipped
   * when no layers exist. Only relevant when `affectLayer` is `true`.
   */
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
   * `currentMode` matches. Checked before `when`,
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
  /**
   * When `true`, an overlay-phase entry (`affectLayer: true`) fires even
   * while no layer is open. With the default `false`, the entry is skipped
   * when no layers exist. Only relevant when `affectLayer` is `true`.
   */
  executeWhenNoOverlay?: boolean;

  /**
   * Restrict this global sequence to a specific mode.
   *
   * When set, the processor skips this entry unless
   * `currentMode` matches. Checked before `when`,
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
 * A registered shortcut operation, addressable by `actionId`.
 *
 * Used by {@link KeyboardEngine.defineShortcutAction} /
 * {@link KeyboardEngine.addAction} to register named callbacks that
 * `boundKeyboard` and `globalKeys` can invoke by id. Actions decouple
 * key bindings from callback logic — register once, reference by id
 * everywhere, and change keys without touching every binding site.
 *
 * @example
 * ```ts
 * engine.defineShortcutAction([
 *   { actionId: 'save', action: () => saveFile(), keys: ['ctrl+s'] },
 * ]);
 * engine.boundKeyboard('save');            // uses the preset keys
 * engine.boundKeyboard('f9', 'save');      // overrides keys locally
 * engine.globalKeys([{ key: 'ctrl+s', operate: 'save' }]);
 * ```
 */
export interface ShortcutOperationEntry {
  /**
   * Unique identifier of the shortcut, used to retrieve and invoke
   * the operation.
   */
  actionId: string;
  /** The callback invoked when the shortcut fires. */
  action: () => void;
  /** Preset keys that trigger this action. */
  keys?: string[];
}

/**
 * A registered sequence action, addressable by `sequenceActionId`.
 *
 * Used by {@link KeyboardEngine.defineSequenceAction} /
 * {@link KeyboardEngine.addSequenceAction} to register named callbacks
 * that `boundSequence` and `globalSequence` can invoke by id. The
 * sequence counterpart to {@link ShortcutOperationEntry}.
 *
 * @example
 * ```ts
 * engine.defineSequenceAction([
 *   { sequenceActionId: 'scroll-top', action: () => scrollToTop(), keys: ['g', 'g'], timeout: 600 },
 * ]);
 * engine.boundSequence('scroll-top');                   // uses preset keys
 * engine.globalSequence([{ keys: ['ctrl+home'], operate: 'scroll-top' }]);
 * ```
 */
export interface SequenceOperationEntry {
  /** Unique identifier of this sequence action. */
  sequenceActionId: string;
  /** The callback invoked when the full sequence is matched. */
  action: () => void;
  /** Preset keys that trigger this sequence. */
  keys?: string[];
  /** Preset timeout in milliseconds between key presses. */
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
  /** The resolved callback invoked when the full sequence is matched. */
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
  /** Key name(s) to match, in the same normalized format as `boundKeyboard`. */
  key: string | string[];
  /**
   * The callback to invoke when the key is pressed — string action
   * references have already been resolved to their callbacks.
   */
  operate: () => void;
  /**
   * Whether screen components are allowed to override this global key
   * via `boundKeyboard`. Defaults to `true`.
   */
  cover?: boolean;
  /**
   * Whether this global key fires before the layer broadcast (`true`)
   * or after it (`false`, the default).
   */
  affectLayer?: boolean;
  /**
   * Whitelist of screen components that may use this global key.
   * `"*"` or omitted matches all screens; `[]` disables the key.
   */
  category?: unknown[] | "*";
  /**
   * Number of presses required before the handler fires.
   * Semantics are identical to {@link GlobalKeyEntry.times}.
   */
  times?: number;
  /**
   * Callback invoked on every key press while counting toward `times`,
   * receiving the number of remaining presses before the handler fires.
   */
  observer?: (times: number) => void;
  /**
   * Current press count — initialized to `0` when `times` is set,
   * incremented on each matching press, and reset to `0` once the
   * counter reaches `times` and the handler fires.
   */
  pressCount?: number;
  /**
   * When `true`, an overlay-phase entry (`affectLayer: true`) fires even
   * while no layer is open. Only relevant when `affectLayer` is `true`.
   */
  executeWhenNoOverlay?: boolean;
  /**
   * Optional condition — when it evaluates to `false` the entry is
   * skipped entirely.
   */
  when?: (() => boolean) | string;
  /**
   * Restrict this global key to a specific mode; when omitted it fires
   * in all modes (including no-mode).
   */
  mode?: string;
}
