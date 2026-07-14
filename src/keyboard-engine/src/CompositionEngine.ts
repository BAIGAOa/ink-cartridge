import { checkWhen } from "./checkWhen.js";
import EngineState from "./engine/EngineState.js";
import type { PipelineContext } from "./types.js";

/**
 * Runtime type guard for a value flowing through a composition chain.
 *
 * Returns `true` when the value matches the expected shape for a given flag.
 *
 * @example
 * ```ts
 * const schema: ValueSchema = {
 *   times: (v): v is number => typeof v === 'number',
 *   action: (v): v is number => typeof v === 'number',
 * };
 * ```
 */
export type ValueGuard = (value: unknown) => boolean;

/**
 * Maps flag names to {@link ValueGuard} functions.
 *
 * When provided to {@link CompositionEngine}, each execute callback's
 * input and output values are validated against the guards declared for
 * the corresponding flags. Validation failures clear the pending chain
 * and emit a `console.warn` in development.
 */
export type ValueSchema = Record<string, ValueGuard>;

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

export type Flags = {
	need: string;
	become: string;
}[];

export type CompositionEvent =
	| { type: "started"; key: string }
	| { type: "continued"; key: string }
	| { type: "completed" }
	| { type: "aborted" }
	| { type: "broken"; key: string }
	| { type: "consumed"; key: string }
	| { type: "undone"; steps: number }
	| { type: "cleared" };

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
	flags: Flags;

	/**
	 * What type of key is expected to precede
	 * If the preceding type does not match, the key is discarded
	 */
	needs: string[];

	alternativeFlag: string;

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

	execute?: (
		ctx: CompositionContext<TValue>,
	) => CompositionContext<TValue> | null;

	/**
	 * This key is enabled only when this callback method returns true.
	 */
	when?: (() => boolean) | string;

	/**
	 * Restrict this composition key to a specific mode.
	 *
	 * When set, the entry is skipped unless
	 * {@link PipelineContext.currentMode} matches. Checked after
	 * affectOverlay, before `when`, `category`, and other filters.
	 * When omitted, the key works in all modes (including no-mode).
	 */
	mode?: string;

	/**
	 * If true, when CTX returns null, the key will be swallowed silently after the chain is terminated, not released
	 */
	KeyReleaseWhenChainInterrupted?: boolean;

	/**
	 * The back button's function is usually the opposite of the execute key.
	 * Returning null will stop the undo action.
	 */
	undoAction?: undo;
}

export type undo<TValue = unknown> = (
	ctx: CompositionContext<TValue>,
) => CompositionContext<TValue> | null;

export type bufferEntry = {
	key: string;
	undoAction: undo;
	ctx: CompositionContext;
};

export default class CompositionEngine<TComponet = unknown> {
	private currentKey: string[] = [];
	private keyMappingTable: Map<string, Set<CompositioKey<TComponet>>> =
		new Map();

	private pendingEntry: CompositionPneding | null = null;
	private defaultTimeout: number;

	// This array represents the history of pressed keys.
	// Once the sequence begins, it records the keys in the order they are pressed by the user.
	private historyKeys: bufferEntry[] = [];
	// Each inner array represents one completed sequence's key history.
	// Multiple sequences accumulate here so undo can rewind across
	// several completed chains.
	private buffers: bufferEntry[][] = [];

	private valueSchema: ValueSchema | undefined;

	private subscribers: Set<() => void> = new Set();
	private lastEvent: CompositionEvent | null = null;

	private context: CompositionContext = {
		value: undefined,
		lastFlag: null,
		steps: [],
	};

	constructor(
		private state: EngineState<TComponet>,
		defaultTimeout?: number,
		valueSchema?: ValueSchema,
	) {
		this.defaultTimeout = defaultTimeout ?? 400;
		this.valueSchema = valueSchema;
	}

	/** Set or replace the runtime value schema for composition chain validation. */
	setValueSchema(schema: ValueSchema): void {
		this.valueSchema = schema;
	}

	/**
	 * Subscribe to composition state changes. The callback fires whenever the
	 * chain starts, advances, breaks, completes, or is undone. Use it to
	 * trigger a framework re-render (e.g. React `useState` setter).
	 *
	 * @returns An unsubscribe function.
	 */
	subscribe(fn: () => void): () => void {
		this.subscribers.add(fn);
		return () => {
			this.subscribers.delete(fn);
		};
	}

	/**
	 * Return the most recent {@link CompositionEvent}, or `null` if nothing
	 * has happened yet. Useful for displaying diagnostic context (e.g.
	 * "Chain started with key '3'" or "Broke on key 'x'").
	 */
	getLastEvent(): CompositionEvent | null {
		return this.lastEvent;
	}

	private notify(event: CompositionEvent): void {
		this.lastEvent = event;
		for (const fn of this.subscribers) {
			fn();
		}
	}

	synchronizingKey(eventName: string[]) {
		this.currentKey = eventName;
	}

	registryCompositionKey(entry: CompositioKey<TComponet>) {
		const key = entry.key;
		const result = this.keyMappingTable.get(key);

		if (!result) {
			this.keyMappingTable.set(key, new Set([entry]));
			return;
		}

		result.add(entry);
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
		this.recordHistory();
		this.clearPending();
		this.notify({ type: "aborted" });
	}

	/**
	 * Undo one or more completed composition sequences.
	 *
	 * Each completed chain is stored as a separate entry in the undo buffer.
	 * Passing `steps` undoes that many sequences, executing every key's
	 * {@link CompositioKey#undoAction} in reverse order.
	 *
	 * @param steps - Number of past sequences to undo. Defaults to 1.
	 *   When `options.byKey` is `true`, `steps` counts individual keys instead.
	 * @param options.isolated - When `true`, each sequence's undo starts from
	 *   its own saved context — ctx does NOT propagate across sequences.
	 *   Defaults to `false` (flat propagation).
	 * @param options.byKey - When `true`, `steps` counts individual keys
	 *   instead of whole sequences. Orthogonal to `isolated`.
	 *   Defaults to `false`.
	 * @returns The final context after all undo actions, or `null` if
	 *   nothing was undone.
	 * @throws If `steps` exceeds the number of buffered sequences (or keys,
	 *   when `byKey` is `true`).
	 *
	 * @example Flat mode (default)
	 * ```ts
	 * engine.undo(2);
	 * ```
	 *
	 * @example Isolated mode
	 * ```ts
	 * engine.undo(2, { isolated: true });
	 * ```
	 *
	 * @example By-key mode
	 * ```ts
	 * engine.undo(3, { byKey: true });  // undo 3 keys, not 3 sequences
	 * ```
	 */
	undo(
		steps: number = 1,
		options?: { isolated?: boolean; byKey?: boolean },
	): CompositionContext | null {
		if (this.buffers.length === 0) return null;

		const byKey = options?.byKey === true;
		const isolated = options?.isolated === true;

		if (byKey) {
			return this.undoByKey(steps, isolated);
		}

		if (steps > this.buffers.length) {
			throw new Error(
				`[keyboard-engine] Cannot undo ${steps} sequence(s): only ` +
					`${this.buffers.length} buffered.`,
			);
		}

		const start = this.buffers.length - steps;
		const undone = this.buffers.slice(start);
		let currentCtx: CompositionContext | null = null;

		if (isolated) {
			for (let i = undone.length - 1; i >= 0; i--) {
				const seq = [...undone[i]].reverse();
				let seqCtx: CompositionContext = seq[0].ctx;
				let stopped = false;

				for (const buffer of seq) {
					const nextCtx = this.processUndoEntry(buffer, seqCtx);
					if (nextCtx === null) {
						stopped = true;
						break;
					}
					seqCtx = nextCtx;
				}

				if (stopped) break;
				currentCtx = seqCtx;
			}
		} else {
			const allEntries = undone.flat().reverse();
			if (allEntries.length === 0) return null;

			currentCtx = allEntries[0].ctx;

			for (const buffer of allEntries) {
				const nextCtx = this.processUndoEntry(buffer, currentCtx);
				if (nextCtx === null) break;
				currentCtx = nextCtx;
			}
		}

		if (currentCtx === null) return null;

		this.context = currentCtx;
		this.buffers.splice(start, steps);
		this.state.compositionEngineHandle = false;
		this.notify({ type: "undone", steps });
		return currentCtx;
	}

	/**
	 * Undo by individual key count. Walks buffers from the end,
	 * collecting `steps` entries across sequence boundaries.
	 */
	private undoByKey(
		steps: number,
		isolated: boolean,
	): CompositionContext | null {
		// Count total keys available
		let totalKeys = 0;
		for (const seq of this.buffers) {
			totalKeys += seq.length;
		}
		if (steps > totalKeys) {
			throw new Error(
				`[keyboard-engine] Cannot undo ${steps} key(s): only ` +
					`${totalKeys} buffered.`,
			);
		}

		// Collect the last `steps` entries, tracking which sequences they came from
		const collected: {
			entry: bufferEntry;
			seqIndex: number;
			entryIndex: number;
		}[] = [];
		let remaining = steps;

		for (let si = this.buffers.length - 1; si >= 0 && remaining > 0; si--) {
			const seq = this.buffers[si];
			for (let ei = seq.length - 1; ei >= 0 && remaining > 0; ei--) {
				collected.push({ entry: seq[ei], seqIndex: si, entryIndex: ei });
				remaining--;
			}
		}

		// collected is already in reverse chronological order (most recent first)
		let currentCtx: CompositionContext | null = null;

		if (isolated) {
			// Group entries by sequence, process each sequence independently
			let seqIndex = 0;
			while (seqIndex < collected.length) {
				const seqEntries: bufferEntry[] = [];
				const groupSeqId = collected[seqIndex].seqIndex;

				while (
					seqIndex < collected.length &&
					collected[seqIndex].seqIndex === groupSeqId
				) {
					seqEntries.push(collected[seqIndex].entry);
					seqIndex++;
				}

				// Entries within a sequence are already in reverse order (most recent first)
				let seqCtx: CompositionContext = seqEntries[0].ctx;
				let stopped = false;

				for (const buffer of seqEntries) {
					const nextCtx = this.processUndoEntry(buffer, seqCtx);
					if (nextCtx === null) {
						stopped = true;
						break;
					}
					seqCtx = nextCtx;
				}

				if (stopped) break;
				currentCtx = seqCtx;
			}
		} else {
			// Flat mode: process all collected entries in order (already reversed)
			currentCtx = collected[0].entry.ctx;

			for (const { entry } of collected) {
				const nextCtx = this.processUndoEntry(entry, currentCtx);
				if (nextCtx === null) break;
				currentCtx = nextCtx;
			}
		}

		if (currentCtx === null) return null;

		// Remove consumed entries from their sequences
		// Track per-sequence removal counts
		const removals: Map<number, number> = new Map();
		for (const c of collected) {
			removals.set(c.seqIndex, (removals.get(c.seqIndex) ?? 0) + 1);
		}

		// Walk sequences from the end, applying removals
		for (let si = this.buffers.length - 1; si >= 0; si--) {
			const count = removals.get(si);
			if (count === undefined) continue;

			const seq = this.buffers[si];
			if (count >= seq.length) {
				// Entire sequence consumed
				this.buffers.splice(si, 1);
			} else {
				// Partial sequence: remove the last N entries
				seq.splice(seq.length - count, count);
			}
		}

		this.context = currentCtx;
		this.state.compositionEngineHandle = false;
		this.notify({ type: "undone", steps });
		return currentCtx;
	}

	/** Number of completed sequences available for undo. */
	bufferedCount(): number {
		return this.buffers.length;
	}

	/** Clear all buffered undo history. */
	clearBuffers(): void {
		this.buffers = [];
		this.notify({ type: "cleared" });
	}

	/**
	 * Validate and execute a single undo entry.
	 * Returns the new context after the undo action, or `null` to stop the undo chain.
	 */
	private processUndoEntry(
		buffer: bufferEntry,
		currentCtx: CompositionContext,
	): CompositionContext | null {
		if (this.valueSchema && currentCtx.lastFlag) {
			const guard = this.valueSchema[currentCtx.lastFlag];
			if (guard && !guard(currentCtx.value)) {
				if (process.env.NODE_ENV !== "production") {
					console.warn(
						`[keyboard-engine] Undo key "${buffer.key}": input value ` +
							`from flag "${currentCtx.lastFlag}" failed type guard — stopping undo.`,
					);
				}
				return null;
			}
		}

		const newCtx = buffer.undoAction(currentCtx);
		if (!newCtx) {
			return null;
		}

		if (this.valueSchema && newCtx.lastFlag) {
			const guard = this.valueSchema[newCtx.lastFlag];
			if (guard && !guard(newCtx.value)) {
				if (process.env.NODE_ENV !== "production") {
					console.warn(
						`[keyboard-engine] Undo key "${buffer.key}": output value ` +
							`for flag "${newCtx.lastFlag}" failed type guard — stopping undo.`,
					);
				}
				return null;
			}
		}

		return newCtx;
	}

	private areFlagsEqual(a: Flags, b: Flags): boolean {
		if (a.length !== b.length) return false;

		for (let i = 0; i < a.length; i++) {
			if (a[i].need !== b[i].need || a[i].become !== b[i].become) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Update a registered entry identified by `key` + `flags`.
	 * The old entry is removed and the merged entry is re-registered.
	 * @returns `true` if the entry was found and updated, `false` otherwise.
	 */
	updateCompositionKey(
		key: string,
		flags: Flags,
		updates: Partial<Omit<CompositioKey<TComponet>, "key" | "flags">>,
	): boolean {
		const set = this.keyMappingTable.get(key);
		if (!set) return false;

		for (const entry of set) {
			if (this.areFlagsEqual(flags, entry.flags)) {
				set.delete(entry);
				const merged: CompositioKey<TComponet> = {
					...entry,
					...updates,
					key,
					flags,
				};
				set.add(merged);
				return true;
			}
		}

		return false;
	}

	private validateInput(lastFlag: string | null, entryKey: string): boolean {
		if (!this.valueSchema || !lastFlag) return true;
		const guard = this.valueSchema[lastFlag];
		if (!guard) return true;
		if (!guard(this.context.value)) {
			if (process.env.NODE_ENV !== "production") {
				console.warn(
					`[keyboard-engine] Composition key "${entryKey}": input value from flag ` +
						`"${lastFlag}" failed type guard — clearing pending chain.`,
				);
			}
			return false;
		}
		return true;
	}

	private validateOutput(
		flag: string,
		value: unknown,
		entryKey: string,
	): boolean {
		if (!this.valueSchema) return true;
		const guard = this.valueSchema[flag];
		if (!guard) return true;
		if (!guard(value)) {
			if (process.env.NODE_ENV !== "production") {
				console.warn(
					`[keyboard-engine] Composition key "${entryKey}" (flag: "${flag}") ` +
						`produced a value that failed its type guard.`,
				);
			}
			return false;
		}
		return true;
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
			if (entry.mode && entry.mode !== ctx.currentMode) return false;
			if (!ctx.topComponent) return false;

			if (affectOverlay && ctx.activeCount === 0 && !entry.executeWhenNoOverlay)
				return false;

			const cat = entry.category;
			if (cat !== undefined && cat !== "*") {
				if (Array.isArray(cat) && cat.length === 0) return false;
				if (Array.isArray(cat) && !cat.includes(ctx.topComponent as TComponet))
					return false;
			}

			return true;
		});
	}

	private chooseFlag(
		lastFlag: string | null,
		flags: Flags,
		alternative: string,
	): string {
		if (!lastFlag) {
			return alternative;
		}

		for (const each of flags) {
			if (each.need === lastFlag) {
				return each.become;
			}
		}

		return alternative;
	}

	private startPending(ctx: PipelineContext, affectOverlay: boolean): boolean {
		if (this.pendingEntry) return false;

		this.historyKeys = [];

		const allEntries = this.currentKey.flatMap((name) => [
			...(this.keyMappingTable.get(name) ?? []),
		]);
		const filtered = this.filterEntries(allEntries, ctx, affectOverlay);
		const result = resolveCompositionKey(filtered, null);

		if (!result) return false;

		if (!checkWhen(result.when, ctx.conditions)) return false;

		const initialCtx: CompositionContext = {
			value: undefined,
			lastFlag: null,
			steps: [],
		};

		const nextCtx = result.execute?.(initialCtx);
		// `execute` returns null → chain does not start
		if (!nextCtx) return false;

		if (!nextCtx.lastFlag) {
			// Constraint: If the user returns `null` for the `lastFlag` associated with this key,
			// it indicates that they want the system to handle the flag automatically.
			// We give users control.
			nextCtx.lastFlag = result.alternativeFlag;
		}

		// Instead of passing candidate keys directly into the result, they are obtained from the context provided by the user.
		if (!this.validateOutput(nextCtx.lastFlag, nextCtx.value, result.key)) {
			return false;
		}

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

			this.recordHistory();
			this.notify({ type: "completed" });
		}, pending.timeout);

		pending.timer = timer;
		this.pendingEntry = pending;
		this.historyKeys.push({
			key: result.key,
			undoAction: result.undoAction ?? ((ctx) => ctx),
			ctx: this.context,
		});
		this.notify({ type: "started", key: result.key });
		return true;
	}

	private processPending(
		ctx: PipelineContext,
		affectOverlay: boolean,
	): boolean {
		if (!this.pendingEntry) return false;
		if (this.pendingEntry.affectOverlay !== affectOverlay) return false;

		clearTimeout(this.pendingEntry.timer);

		const allEntries = this.currentKey.flatMap((name) => [
			...(this.keyMappingTable.get(name) ?? []),
		]);
		const filtered = this.filterEntries(allEntries, ctx, affectOverlay);
		const result = resolveCompositionKey(filtered, this.context.lastFlag);

		if (result) {
			if (!checkWhen(result.when, ctx.conditions)) {
				this.clearPending();
				return false;
			}

			if (!this.validateInput(this.context.lastFlag, result.key)) {
				this.clearPending();
				return result.KeyReleaseWhenChainInterrupted === undefined
					? false
					: result.KeyReleaseWhenChainInterrupted;
			}

			const nextCtx = result.execute?.(this.context);
			if (!nextCtx) {
				this.clearPending();
				return result.KeyReleaseWhenChainInterrupted === undefined
					? false
					: result.KeyReleaseWhenChainInterrupted;
			}

			// Constraint: If the user returns `null` for the `lastFlag` associated with this key,
			// it indicates that they want the system to handle the flag automatically.
			// We give users control.
			if (!nextCtx.lastFlag) {
				const resultFlag = this.chooseFlag(
					this.context.lastFlag,
					result.flags,
					result.alternativeFlag,
				);
				nextCtx.lastFlag = resultFlag;
			}

			if (!this.validateOutput(nextCtx.lastFlag, nextCtx.value, result.key)) {
				this.clearPending();
				return result.KeyReleaseWhenChainInterrupted === undefined
					? false
					: result.KeyReleaseWhenChainInterrupted;
			}

			this.context = nextCtx;

			const timeout = result.timeout ?? this.defaultTimeout;
			this.pendingEntry.timeout = timeout;
			this.pendingEntry.exclusive = result.exclusive ?? false;
			this.pendingEntry.affectOverlay = affectOverlay;

			const timer = setTimeout(() => {
				this.clearPending();

				// Why is a buffer needed?
				// Without a buffer, we can only manipulate historyKeys.
				// This is because `historyKeys` is cleared at the start of each sequence to avoid confusion.
				// However, clearing it in that way would result in the loss of historical information from the previous sequence, making it impossible to perform undo operations during the new sequence.
				// The buffer is responsible for recording these historical keys before each cleanup.
				this.recordHistory();
				this.notify({ type: "completed" });
			}, timeout);
			this.historyKeys.push({
				key: result.key,
				undoAction: result.undoAction ?? ((ctx) => ctx),
				ctx: this.context,
			});
			this.pendingEntry.timer = timer;

			this.notify({ type: "continued", key: result.key });
			return true;
		}

		// No match — check exclusive on the pending chain
		if (this.pendingEntry.exclusive) {
			// Silently consume, keep waiting
			this.resetPendingTimer(this.pendingEntry.timeout);
			this.notify({ type: "consumed", key: this.currentKey[0] ?? "" });
			return true;
		}

		// Not exclusive — clear and let key fall through
		this.clearPending();
		this.notify({ type: "broken", key: this.currentKey[0] ?? "" });
		return false;
	}

	start(ctx: PipelineContext, affectOverlay: boolean): boolean {
		this.synchronizingKey(ctx.eventNames);
		if (this.processPending(ctx, affectOverlay)) return true;
		return this.startPending(ctx, affectOverlay);
	}

	private recordHistory() {
		if (this.historyKeys.length > 0) {
			this.buffers.push([...this.historyKeys]);
		}
	}
}
