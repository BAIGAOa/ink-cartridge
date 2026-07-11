import EngineState from "./engine/EngineState.js";
import type { PipelineContext } from "./types.js";

/**
 * Select the best-matching {@link CompositioKey} by looking up every name
 * in `eventNames` against the given mapping table.
 *
 * Resolution priority (highest first):
 * 1. **needs match** — entries whose `needs` include `lastFlag` are
 *    preferred. When `lastFlag` is null (head of chain), entries that are
 *    `optional` or have no `needs` are preferred.
 * 2. **modifier specificity** — entries with more `+` segments in their
 *    key name (e.g. `"ctrl+s"` over `"s"`) rank higher.
 * 3. **needs length** — among entries with the same modifier count, a
 *    longer `needs` list (stricter contract) wins.
 *
 * @returns The resolved entry, or `null` if no entry matches any name in `eventNames`.
 */
export function resolveCompositionKey<TComponet = unknown>(
  candidates: CompositioKey<TComponet>[],
  lastFlag: string | null,
): CompositioKey<TComponet> | null {
  if (candidates.length === 0) return null;

  // Round 1 — filter by needs / lastFlag compatibility
  const needsMatch = candidates.filter((entry) => {
    if (lastFlag === null) {
      return entry.optional === true || entry.needs.length === 0;
    }
    return entry.needs.includes(lastFlag);
  });

  if (needsMatch.length === 0) return null;

  const pool = needsMatch;
  if (pool.length === 1) return pool[0];

  // Round 2 — prefer entries with more modifier segments (e.g. "ctrl+s" > "s")
  const modifierCount = (k: string): number => (k.match(/\+/g) || []).length;

  pool.sort((a, b) => modifierCount(b.key) - modifierCount(a.key));

  const topModifiers = modifierCount(pool[0].key);
  const sameSpecificity = pool.filter(
    (c) => modifierCount(c.key) === topModifiers,
  );

  // Round 3 — prefer stricter contracts (longer needs list)
  if (sameSpecificity.length > 1) {
    sameSpecificity.sort((a, b) => b.needs.length - a.needs.length);
  }

  return sameSpecificity[0];
}

export interface CompositionPneding {
  timeout: number;
  timer: ReturnType<typeof setTimeout>;
  /** When true, mismatched keys in mid-sequence are silently consumed. */
  exclusive: boolean;
  /** Which pipeline phase this pending chain belongs to. */
  affectOverlay: boolean;
}


export interface CompositionContext<T = unknown> {
  /**
   * The value currently passed through the context
   */
  value: T;

  /**
   * The flag of the previous key. If it is, it represents the head key.
   */
  lastFlag: string | null;

  /**
   * Keys that have been executed in the current sequence
   */
  steps: string[];
}

export interface CompositioKey<TComponet = unknown, TValue = unknown> {
  /**
   * Trigger key names, such as a, B, C, or even the number 3
   */
  key: string;

  /**
   * Declare what this key is.
   * This will help the following key to recognize the preceding key, which is used to determine what
   * If the flag is not already registered, it will be automatically registered.
   */
  flag: string;

  /**
   * What type of key is expected to precede
   * If the preceding type does not match, the key is discarded
   */
  needs: string[];

  /**
   * Declare whether the dependent preceding flag is optional, and if so, the key is automatically executed if it is a head key
   * It should be noted that if it is not the head key, the front type will also be checked.
   */
  optional?: boolean;

  /**
   * This key is restricted to only certain screens, and if it is a wildcard, it means that it will work on all screens.
   */
  category?: TComponet[] | "*";

  /**
   * Does it affect the floating layer
   */
  affectOverlay?: boolean;

  /**
   * What is the timeout for pressing a key
   */
  timeout?: number;

  /**
   * When `true` and a needs mismatch occurs mid-sequence, the key is
   * silently consumed (the timeout keeps running). When `false` or
   * omitted, a mismatched key clears the pending chain and falls through.
   */
  exclusive?: boolean;

  /**
   * When `true`, keys with `affectOverlay: true` still fire even when
   * no overlay is active. Defaults to `false`.
   */
  executeWhenNoOverlay?: boolean;

  execute?: (ctx: CompositionContext<TValue>) => CompositionContext<TValue> | null;
}

export default class CompositionEngine<TComponet = unknown> {
  private currentKey: string[] = [];
  private keyMappingTable: Map<string, Set<CompositioKey<TComponet>>> = new Map();

  private pendingEntry: CompositionPneding | null = null
  private defaultTimeout: number

  private context: CompositionContext = { value: undefined, lastFlag: null, steps: [] };

  constructor(private state: EngineState, defaultTimeout?: number) {
    this.defaultTimeout = defaultTimeout ?? 400
  }

  synchronizingKey(eventName: string[]) {
    this.currentKey = eventName;
  }

  registryCompositionKey(entry: CompositioKey<TComponet>) {
    const key = entry.key
    const result = this.keyMappingTable.get(key)

    if (!result) {
      this.keyMappingTable.set(key, new Set([entry]))
      return
    }

    result.add(entry)
  }

  /**
   * Remove all entries registered under `key`.
   * @returns `true` if an entry was removed, `false` if none existed.
   */
  removeCompositionKey(key: string): boolean {
    return this.keyMappingTable.delete(key);
  }

  /** Remove every registered composition key. */
  clearAllCompositionKeys(): void {
    this.keyMappingTable.clear();
  }

  /** Whether the engine currently has an active pending chain. */
  hasPending(): boolean {
    return this.pendingEntry !== null;
  }

  /** Return a shallow copy of the current composition context. */
  getContext(): CompositionContext {
    return { ...this.context, steps: [...this.context.steps] };
  }

  /** Cancel the current pending chain immediately (no timeout). */
  abort(): void {
    this.clearPending();
  }

  /**
   * Update a registered entry identified by `key` + `flag`.
   * The old entry is removed and the merged entry is re-registered.
   * @returns `true` if the entry was found and updated, `false` otherwise.
   */
  updateCompositionKey(
    key: string,
    flag: string,
    updates: Partial<Omit<CompositioKey<TComponet>, 'key' | 'flag'>>,
  ): boolean {
    const set = this.keyMappingTable.get(key);
    if (!set) return false;

    for (const entry of set) {
      if (entry.flag === flag) {
        set.delete(entry);
        const merged: CompositioKey<TComponet> = { ...entry, ...updates, key, flag };
        set.add(merged);
        return true;
      }
    }

    return false;
  }

  private clearPending() {
    if (this.pendingEntry) {
      clearTimeout(this.pendingEntry.timer);
      this.pendingEntry = null;
    }
    this.context = { value: undefined, lastFlag: null, steps: [] };
    this.state.compositionEngineHandle = false;
  }

  private resetPendingTimer(timeout: number): void {
    if (!this.pendingEntry) return;
    clearTimeout(this.pendingEntry.timer);
    const timer = setTimeout(() => {
      this.clearPending();
    }, timeout);
    this.pendingEntry.timer = timer;
    this.pendingEntry.timeout = timeout;
  }

  /**
   * Filter candidates by affectOverlay and category, mirroring the
   * pattern used in global-sequence / global-key processors.
   */
  private filterEntries(
    entries: CompositioKey<TComponet>[],
    ctx: PipelineContext,
    affectOverlay: boolean,
  ): CompositioKey<TComponet>[] {
    return entries.filter((entry) => {
      if ((entry.affectOverlay ?? false) !== affectOverlay) return false;
      if (!ctx.topComponent) return false;

      if (affectOverlay && ctx.activeCount === 0 && !entry.executeWhenNoOverlay) return false;

      const cat = entry.category;
      if (cat !== undefined && cat !== '*') {
        if (Array.isArray(cat) && cat.length === 0) return false;
        if (Array.isArray(cat) && !cat.includes(ctx.topComponent as TComponet)) return false;
      }

      return true;
    });
  }

  private startPending(
    ctx: PipelineContext,
    affectOverlay: boolean,
  ): boolean {
    if (this.pendingEntry) return false;

    const allEntries = this.currentKey.flatMap((name) =>
      [...(this.keyMappingTable.get(name) ?? [])],
    );
    const filtered = this.filterEntries(allEntries, ctx, affectOverlay);
    const result = resolveCompositionKey(filtered, null);

    if (!result) return false;

    const initialCtx: CompositionContext = { value: undefined, lastFlag: null, steps: [] };
    const nextCtx = result.execute?.(initialCtx);
    // `execute` returns null → chain does not start
    if (!nextCtx) return false;

    this.context = nextCtx;
    this.state.compositionEngineHandle = true;

    const pending: CompositionPneding = {
      timeout: result.timeout ?? this.defaultTimeout,
      timer: undefined as unknown as ReturnType<typeof setTimeout>,
      exclusive: result.exclusive ?? false,
      affectOverlay,
    };

    const timer = setTimeout(() => {
      this.clearPending();
    }, pending.timeout);

    pending.timer = timer;
    this.pendingEntry = pending;
    return true;
  }

  private processPending(
    ctx: PipelineContext,
    affectOverlay: boolean,
  ): boolean {
    if (!this.pendingEntry) return false;
    if (this.pendingEntry.affectOverlay !== affectOverlay) return false;

    clearTimeout(this.pendingEntry.timer);

    const allEntries = this.currentKey.flatMap((name) =>
      [...(this.keyMappingTable.get(name) ?? [])],
    );
    const filtered = this.filterEntries(allEntries, ctx, affectOverlay);
    const result = resolveCompositionKey(filtered, this.context.lastFlag);

    if (result) {
      const nextCtx = result.execute?.(this.context);
      if (!nextCtx) {
        this.clearPending();
        return true;
      }

      this.context = nextCtx;

      const timeout = result.timeout ?? this.defaultTimeout;
      this.pendingEntry.timeout = timeout;
      this.pendingEntry.exclusive = result.exclusive ?? false;
      this.pendingEntry.affectOverlay = affectOverlay;

      const timer = setTimeout(() => {
        this.clearPending();
      }, timeout);
      this.pendingEntry.timer = timer;

      return true;
    }

    // No match — check exclusive on the pending chain
    if (this.pendingEntry.exclusive) {
      // Silently consume, keep waiting
      this.resetPendingTimer(this.pendingEntry.timeout);
      return true;
    }

    // Not exclusive — clear and let key fall through
    this.clearPending();
    return false;
  }


  start(ctx: PipelineContext, affectOverlay: boolean): boolean {
    this.synchronizingKey(ctx.eventNames);
    if (this.processPending(ctx, affectOverlay)) return true;
    return this.startPending(ctx, affectOverlay);
  }


}
