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
export function resolveCompositionKey<TComponent = unknown>(
	candidates: CompositioKey<TComponent>[],
	lastFlag: string | null,
): CompositioKey<TComponent> | null {
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

/**
 * State-change events emitted by the mapping-key subsystem.
 *
 * Kept separate from {@link CompositionEvent} so subscribers of one
 * subsystem are not notified by the other. The shape mirrors
 * CompositionEvent but is intentionally smaller — mapping keys do not
 * have an "aborted" / "undone" / "cleared" lifecycle.
 */
export type MappingKeyEvent =
	| { type: "started"; key: string }
	| { type: "continued"; key: string }
	| { type: "completed" }
	| { type: "broken"; key: string }
	| { type: "consumed"; key: string };

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

export interface CompositioKey<
	TComponet,
	TValue = unknown,
> extends PrimitiveTypeKeys<TComponet> {
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
	 * What is the timeout for pressing a key
	 */
	timeout?: number;

	/**
	 * When `true` and a needs mismatch occurs mid-sequence, the key is
	 * silently consumed (the timeout keeps running). When `false` or
	 * omitted, a mismatched key clears the pending chain and falls through.
	 */
	exclusive?: boolean;

	execute?: (
		ctx: CompositionContext<TValue>,
	) => CompositionContext<TValue> | null;

	/**
	 * This key is enabled only when this callback method returns true.
	 */
	when?: (() => boolean) | string;

	/**
	 * If true, when CTX returns null, the key will be swallowed silently after the chain is terminated, not released
	 */
	KeyReleaseWhenChainInterrupted?: boolean;

	/**
	 * The back button's function is usually the opposite of the execute key.
	 * Returning null will stop the undo action.
	 */
	undoAction?: undo;

	isEndKey?: string[];
}

export type undo<TValue = unknown> = (
	ctx: CompositionContext<TValue>,
) => CompositionContext<TValue> | null;

export type bufferEntry = {
	key: string;
	undoAction: undo;
	ctx: CompositionContext;
};

export interface MappingPendingEntry<TComponent> {
	keys: string[];
	nextIndex: number;
	timeout: number;
	timer: ReturnType<typeof setTimeout>;
	exclusive: boolean;
	affectOverlay: boolean;
	candidates: MappingKeyEntry<TComponent>[];
}

export interface MappingKeyEntry<
	TComponet,
> extends PrimitiveTypeKeys<TComponet> {
	keys: string[];
	target: string[];
	timeout?: number;
	when?: (() => boolean) | string;
	exclusive?: boolean;
	/**
	 * If true, when the target composition chain is interrupted (any
	 * target key fails to resolve / execute), the final key that broke
	 * the sequence is swallowed silently instead of being released to
	 * lower pipeline stages. Mirrors {@link CompositioKey.KeyReleaseWhenChainInterrupted}.
	 */
	KeyReleaseWhenChainInterrupted?: boolean;
}

export interface PrimitiveTypeKeys<TComponet> {
	affectOverlay?: boolean;
	mode?: string;
	category?: TComponet[] | "*";
	executeWhenNoOverlay?: boolean;
}

function compositionFingerprint<TComponent>(
	entry: CompositioKey<TComponent>,
): string {
	return JSON.stringify({
		key: entry.key,
		flags: entry.flags,
		needs: entry.needs,
		alternativeFlag: entry.alternativeFlag,
		optional: entry.optional,
		category: entry.category,
		affectOverlay: entry.affectOverlay,
		exclusive: entry.exclusive,
		executeWhenNoOverlay: entry.executeWhenNoOverlay,
		KeyReleaseWhenChainInterrupted: entry.KeyReleaseWhenChainInterrupted,
		isEndKey: entry.isEndKey,
		mode: entry.mode,
		timeout: entry.timeout,
	});
}

export default class CompositionEngine<TComponent = unknown> {
	private currentKey: string[] = [];
	private keyMappingTable: Map<string, Set<CompositioKey<TComponent>>> =
		new Map();

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

	// Separate subscriber pool for the mapping-key subsystem so its
	// state changes do not fire composition subscribers (and vice versa).
	private mappingSubscribers: Set<() => void> = new Set();
	private lastMappingEvent: MappingKeyEvent | null = null;

	private mapping: Map<string, Set<MappingKeyEntry<TComponent>>> = new Map();
	// Mapping keys independently maintain their own wait sequences.
	// This is done to better distinguish between key combinations and mapped keys, and to make management easier.
	// Sequences of mapped keys and sequences of key combinations cannot coexist.
	private mappingPendingEntry: MappingPendingEntry<TComponent> | null = null;
	private pendingEntry: CompositionPneding | null = null;

	private context: CompositionContext = {
		value: undefined,
		lastFlag: null,
		steps: [],
	};

	constructor(
		private state: EngineState<TComponent>,
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

	private checkMapping(
		set: Set<{
			keys: string[];
			target: string[];
		}>,
		newKeys: string[],
	): boolean {
		const newKeysStr = JSON.stringify(newKeys);

		for (const each of set) {
			const existingKeysStr = JSON.stringify(each.keys);
			if (existingKeysStr === newKeysStr) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Register a mapping key entry.
	 *
	 * @param base   The external trigger key sequence (what the user presses).
	 * @param target The internal composition key chain to execute in order.
	 * @param options Optional fields forwarded to the stored {@link MappingKeyEntry}:
	 *   `exclusive`, `KeyReleaseWhenChainInterrupted`, `when`, `affectOverlay`,
	 *   `mode`, `category`, `executeWhenNoOverlay`.
	 * @returns `true` if registered, `false` if `base` is empty, any `target`
	 *          key is not registered in `keyMappingTable`, or an identical
	 *          `base` sequence already exists.
	 */
	addMapping(
		base: string[],
		target: string[],
		options?: Omit<MappingKeyEntry<TComponent>, "keys" | "target">,
	) {
		if (base.length === 0) {
			return false;
		}

		for (const each of target) {
			if (!this.keyMappingTable.has(each)) {
				return false;
			}
		}

		const entry: MappingKeyEntry<TComponent> = {
			keys: base,
			target: target,
			...options,
		};

		const firstKey = base[0];
		const mapKey = this.mapping.get(firstKey);
		if (mapKey) {
			const repetitive = this.checkMapping(mapKey, base);
			if (repetitive) {
				return false;
			}

			mapKey.add(entry);
		} else {
			this.mapping.set(
				firstKey,
				new Set([entry]),
			);
		}

		return true;
	}

	removeMappingKey(keys: string[]) {
		const firstKey = keys[0];
		const mappingKey = this.mapping.get(firstKey);
		if (!mappingKey) {
			return false;
		}

		const stringArray = JSON.stringify(keys);
		for (const each of mappingKey) {
			const existingKeysStr = JSON.stringify(each.keys);
			if (existingKeysStr === stringArray) {
				mappingKey.delete(each);
				return true;
			}
		}

		return false;
	}

	removeMapping(firstKey: string) {
		return this.mapping.delete(firstKey);
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

	/**
	 * Subscribe to mapping-key state changes. The callback fires whenever a
	 * mapping-key sequence starts, advances, breaks, is consumed
	 * (exclusive), or completes. Independent from {@link subscribe} so
	 * composition subscribers are not notified by mapping-key events.
	 *
	 * @returns An unsubscribe function.
	 */
	subscribeMapping(fn: () => void): () => void {
		this.mappingSubscribers.add(fn);
		return () => {
			this.mappingSubscribers.delete(fn);
		};
	}

	/**
	 * Return the most recent {@link MappingKeyEvent}, or `null` if no
	 * mapping-key event has happened yet.
	 */
	getLastMappingEvent(): MappingKeyEvent | null {
		return this.lastMappingEvent;
	}

	private notifyMapping(event: MappingKeyEvent): void {
		this.lastMappingEvent = event;
		for (const fn of this.mappingSubscribers) {
			fn();
		}
	}

	synchronizingKey(eventName: string[]) {
		this.currentKey = eventName;
	}

	registryCompositionKey(entry: CompositioKey<TComponent>) {
		const key = entry.key;
		const set = this.keyMappingTable.get(key);

		if (!set) {
			this.keyMappingTable.set(key, new Set([entry]));
			return;
		}

		// Skip if a semantically equivalent entry already exists.
		// Fingerprint excludes callbacks (execute / undoAction / when)
		// because those are new references on every React render and
		// don't define the entry's identity in the chain.
		const fp = compositionFingerprint(entry);
		for (const existing of set) {
			if (compositionFingerprint(existing) === fp) return;
		}

		set.add(entry);
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
		updates: Partial<Omit<CompositioKey<TComponent>, "key" | "flags">>,
	): boolean {
		const set = this.keyMappingTable.get(key);
		if (!set) return false;

		for (const entry of set) {
			if (this.areFlagsEqual(flags, entry.flags)) {
				set.delete(entry);
				const merged: CompositioKey<TComponent> = {
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
	 * Clear the mapping-key pending state: cancel its timer and reset the
	 * composition-engine handle flag. Mirrors {@link clearPending} but for
	 * {@link mappingPendingEntry}. Does not touch composition context.
	 */
	private clearMappingPending(): void {
		if (this.mappingPendingEntry) {
			clearTimeout(this.mappingPendingEntry.timer);
			this.mappingPendingEntry = null;
		}
		this.state.compositionEngineHandle = false;
	}

	/**
	 * Reset the mapping-key pending timer to a new timeout. Mirrors
	 * {@link resetPendingTimer} but for {@link mappingPendingEntry}.
	 */
	private resetMappingPendingTimer(timeout: number): void {
		if (!this.mappingPendingEntry) return;
		clearTimeout(this.mappingPendingEntry.timer);
		const timer = setTimeout(() => {
			this.clearMappingPending();
		}, timeout);
		this.mappingPendingEntry.timer = timer;
		this.mappingPendingEntry.timeout = timeout;
	}

	/**
	 * Filter candidates by affectOverlay and category, mirroring the
	 * pattern used in global-sequence / global-key processors.
	 */
	private filterEntries<TComponent, T extends PrimitiveTypeKeys<TComponent>>(
		entries: T[],
		ctx: PipelineContext<TComponent>,
		affectOverlay: boolean,
	): T[] {
		return entries.filter((entry) => {
			if ((entry.affectOverlay ?? false) !== affectOverlay) return false;
			if (entry.mode && entry.mode !== ctx.currentMode) return false;
			if (!ctx.topComponent) return false;

			if (affectOverlay && ctx.activeCount === 0 && !entry.executeWhenNoOverlay)
				return false;

			const cat = entry.category;
			if (cat !== undefined && cat !== "*") {
				if (Array.isArray(cat) && cat.length === 0) return false;
				if (Array.isArray(cat) && !cat.includes(ctx.topComponent)) return false;
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

	private isEndKey(neededKeysFlag: string[], lastFlag: string | null) {
		if (!lastFlag) {
			// There is only one scenario in which null is returned: the key is the head key.
			// However, theoretically speaking, this situation shouldn't occur when this function is used within `processPending`.
			// So we're keeping it as a fallback option.
			return false;
		}

		return neededKeysFlag.includes(lastFlag);
	}

	private getMappingKeys() {
		return [...this.mapping.keys()];
	}

	private checkResult(result: CompositioKey<TComponent>, context: CompositionContext) {
		const nextCtx = result.execute?.(context);
		if (!nextCtx) {
			return null;
		}

		if (!nextCtx.lastFlag) {
			// Constraint: If the user returns `null` for the `lastFlag` associated with this key,
			// it indicates that they want the system to handle the flag automatically.
			// We give users control.
			nextCtx.lastFlag = result.alternativeFlag;
		}

		if (!this.validateOutput(nextCtx.lastFlag, nextCtx.value, result.key)) {
			return null;
		}

		return nextCtx
	}

	/**
	 * Execute a mapping key's `target` composition chain end-to-end.
	 *
	 * Walks `entry.target` in order, resolving each target key against
	 * `keyMappingTable` and running it via the same resolve → checkResult
	 * pattern used by single-key composition. The first iteration uses
	 * `lastFlag = null` (head of chain); subsequent iterations feed the
	 * previous step's `lastFlag` forward.
	 *
	 * On any failure (no entries after filter, resolve returns null,
	 * checkResult returns null) the chain is interrupted. The returned
	 * `swallow` flag mirrors {@link MappingKeyEntry.KeyReleaseWhenChainInterrupted}:
	 * when true, the breaking key is silently consumed rather than
	 * released to lower pipeline stages.
	 *
	 * @param entry        The locked-in mapping key candidate.
	 * @param ctx          Current pipeline context (for affectOverlay / category / mode filtering).
	 * @param affectOverlay Which pipeline phase is calling.
	 * @returns `{ ok: true }` on full success, or `{ ok: false, swallow }` on interruption.
	 */
	private runTargetChain(
		entry: MappingKeyEntry<TComponent>,
		ctx: PipelineContext<TComponent>,
		affectOverlay: boolean,
	): { ok: true } | { ok: false; swallow: boolean } {
		const target = entry.target;
		let currentCtx: CompositionContext = {
			value: undefined,
			lastFlag: null,
			steps: [],
		};

		for (let i = 0; i < target.length; i++) {
			const coms = [...(this.keyMappingTable.get(target[i]) ?? [])];
			const f = this.filterEntries(coms, ctx, affectOverlay);

			if (f.length === 0) {
				return {
					ok: false,
					swallow: entry.KeyReleaseWhenChainInterrupted ?? false,
				};
			}

			if (i === 0) {
				const result = resolveCompositionKey(f, null);
				if (!result) {
					return {
						ok: false,
						swallow: entry.KeyReleaseWhenChainInterrupted ?? false,
					};
				}
				const checkedCtx = this.checkResult(result, currentCtx);
				if (!checkedCtx) {
					return {
						ok: false,
						swallow: entry.KeyReleaseWhenChainInterrupted ?? false,
					};
				}
				currentCtx = checkedCtx;
				continue;
			}

			// Because the first key was specially handled during the first iteration,
			// `lastFlag` here is extremely unlikely to be `null`.
			const result = resolveCompositionKey(f, currentCtx.lastFlag);
			if (!result) {
				return {
					ok: false,
					swallow: entry.KeyReleaseWhenChainInterrupted ?? false,
				};
			}

			const checked = this.checkResult(result, currentCtx);
			if (!checked) {
				return {
					ok: false,
					swallow: entry.KeyReleaseWhenChainInterrupted ?? false,
				};
			}

			currentCtx = checked;
		}

		return { ok: true };
	}

	private tryStartMappingKeyPending(
		ctx: PipelineContext<TComponent>,
		affectOverlay: boolean,
	) {
		const mappingKeys = this.getMappingKeys();
		const keyOfDestiny = mappingKeys.find((each) =>
			this.currentKey.includes(each),
		);

		if (!keyOfDestiny) {
			return false;
		}

		const allCandidateKeys = this.mapping.get(keyOfDestiny);

		if (!allCandidateKeys) {
			return false;
		}

		const filtered = this.filterEntries(
			[...allCandidateKeys],
			ctx,
			affectOverlay,
		);

		// Single-key mappings (keys.length === 1) are executed immediately on
		// the head key — they have no subsequent keys to wait for. When both
		// single-key and multi-key mappings share the same head key, the
		// single-key mapping wins (first one in registration order), matching
		// how globalSequence picks `matching[0]` as the selected entry.
		const singleKeyEntries = filtered.filter((e) => e.keys.length === 1);
		if (singleKeyEntries.length >= 1) {
			const locked = singleKeyEntries[0];
			this.notifyMapping({ type: "started", key: keyOfDestiny });
			const outcome = this.runTargetChain(locked, ctx, affectOverlay);
			if (!outcome.ok) {
				this.notifyMapping({ type: "broken", key: keyOfDestiny });
				return outcome.swallow;
			}
			this.notifyMapping({ type: "completed" });
			return true;
		}

		// No single-key candidates — all remaining candidates need more keys.
		// If none remain, there is nothing to start.
		const multiKeyEntries = filtered.filter((e) => e.keys.length > 1);
		if (multiKeyEntries.length === 0) {
			return false;
		}

		// Mirrors globalSequence / boundSequence: the first matching entry
		// seeds `exclusive`. In exclusive mode the selected entry is locked in
		// immediately (no disambiguation needed), so it is kept as the sole
		// candidate. In non-exclusive mode, only non-exclusive entries stay
		// as disambiguation candidates.
		const selected = multiKeyEntries[0];
		const exclusive = selected.exclusive ?? false;
		const candidates = exclusive
			? [selected]
			: multiKeyEntries.filter((c) => c.exclusive !== true);

		const pending: MappingPendingEntry<TComponent> = {
			keys: [keyOfDestiny],
			nextIndex: 1,
			timeout: this.defaultTimeout,
			timer: undefined as unknown as NodeJS.Timeout,
			exclusive,
			affectOverlay,
			candidates,
		};

		const timer = setTimeout(() => {
			this.clearMappingPending();
		}, pending.timeout);
		pending.timer = timer;
		this.mappingPendingEntry = pending;
		this.state.compositionEngineHandle = true;
		this.notifyMapping({ type: "started", key: keyOfDestiny });

		return true;
	}

	/**
	 * Narrow a list of mapping-key candidates by checking which ones have
	 * a key at `nextIndex` that matches the user's current input.
	 *
	 * Used while a {@link MappingPendingEntry} is in progress and the user
	 * presses the next key. When multiple candidates share the same head
	 * key but diverge later, this filters out the ones whose next segment
	 * does not match, progressively resolving the ambiguity.
	 *
	 * @param candidates   The current candidate pool (from `mappingPendingEntry.candidates`).
	 * @param nextIndex    The index within each candidate's `keys` array to check against.
	 * @param currentKey   The single key name the user just pressed (e.g. `"s"` or `"ctrl+s"`).
	 * @returns The narrowed candidate list. May be empty (no candidate matches —
	 *          sequence is broken), length 1 (locked in), or still > 1 (ambiguous,
	 *          needs further narrowing on the next key).
	 */
	private disambiguateMappingCandidates(
		candidates: MappingKeyEntry<TComponent>[],
		nextIndex: number,
		currentKey: string,
	): MappingKeyEntry<TComponent>[] {
		if (candidates.length <= 1) return candidates;
		return candidates.filter((entry) => entry.keys[nextIndex] === currentKey);
	}

	/**
	 * Advance or complete an in-progress mapping-key pending sequence.
	 *
	 * Called on every key event while {@link mappingPendingEntry} is set.
	 * Resolves the user's current input against the registered mapping
	 * keys, narrows the candidate pool, and either:
	 *   - locks in a single candidate and runs its target chain,
	 *   - keeps narrowing when still ambiguous, or
	 *   - breaks the sequence (honoring exclusive / swallow semantics).
	 *
	 * @returns `true` if the key was consumed by the mapping subsystem,
	 *          `false` to let it fall through to lower pipeline stages.
	 */
	private processMappingKeyPending(
		ctx: PipelineContext<TComponent>,
		affectOverlay: boolean,
	): boolean {
		if (!this.mappingPendingEntry) return false;
		// Phase guard — a pending started in the overlay phase must not be
		// advanced by the screen-phase processor (and vice versa). Mirrors
		// processPending / globalSequence pending handling.
		if (this.mappingPendingEntry.affectOverlay !== affectOverlay) return false;

		clearTimeout(this.mappingPendingEntry.timer);

		const pending = this.mappingPendingEntry;

		// Determine the current input key name. Unlike tryStartMappingKeyPending
		// (which looks up registered mapping head keys), here we need to match
		// against the candidates' keys[nextIndex]. We try each name in
		// eventNames and pick the first one that appears in some candidate's
		// next segment. If none match, the key is unrelated to the sequence.
		const nextIndex = pending.nextIndex;
		let matchedKey: string | null = null;
		for (const name of this.currentKey) {
			if (pending.candidates.some((c) => c.keys[nextIndex] === name)) {
				matchedKey = name;
				break;
			}
		}

		// No candidate's next segment matches any current eventName — the user
		// pressed something unrelated. In exclusive mode the key is silently
		// consumed and the sequence keeps waiting; otherwise the pending is
		// cleared and the key is released to lower pipeline stages.
		if (matchedKey === null) {
			if (pending.exclusive) {
				this.resetMappingPendingTimer(pending.timeout);
				this.notifyMapping({ type: "consumed", key: this.currentKey[0] ?? "" });
				return true;
			}
			this.clearMappingPending();
			this.notifyMapping({ type: "broken", key: this.currentKey[0] ?? "" });
			return false;
		}

		const narrowed = this.disambiguateMappingCandidates(
			pending.candidates,
			nextIndex,
			matchedKey,
		);

		if (narrowed.length === 0) {
			// Should not happen given the matchedKey check above, but guard anyway.
			if (pending.exclusive) {
				this.resetMappingPendingTimer(pending.timeout);
				this.notifyMapping({ type: "consumed", key: this.currentKey[0] ?? "" });
				return true;
			}
			this.clearMappingPending();
			this.notifyMapping({ type: "broken", key: this.currentKey[0] ?? "" });
			return false;
		}

		if (narrowed.length > 1) {
			// Still ambiguous — record progress and keep waiting for the next key.
			pending.candidates = narrowed;
			pending.nextIndex++;
			this.resetMappingPendingTimer(pending.timeout);
			this.notifyMapping({ type: "continued", key: matchedKey });
			return true;
		}

		// Locked in to a single candidate. But the sequence may not be over yet —
		// only run the target chain when the current key is the last segment.
		const locked = narrowed[0];
		if (locked.keys.length > nextIndex + 1) {
			// More keys expected — advance and keep waiting, no longer ambiguous.
			pending.candidates = narrowed;
			pending.nextIndex++;
			this.resetMappingPendingTimer(pending.timeout);
			this.notifyMapping({ type: "continued", key: matchedKey });
			return true;
		}

		// Sequence complete — run the target composition chain end-to-end.
		const outcome = this.runTargetChain(locked, ctx, affectOverlay);
		if (outcome.ok) {
			this.clearMappingPending();
			this.notifyMapping({ type: "completed" });
			return true;
		}

		// Chain interrupted — clear pending and decide whether to swallow the key.
		this.clearMappingPending();
		this.notifyMapping({ type: "broken", key: this.currentKey[0] ?? "" });
		return outcome.swallow;
	}

	private startPending(
		ctx: PipelineContext<TComponent>,
		affectOverlay: boolean,
	): boolean {
		// We must ensure that only one of the mapped key sequence and the combined key sequence exists.
		// Therefore, we must ensure that neither of these two sequences exists before attempting to trigger one of them.
		if (this.pendingEntry || this.mappingPendingEntry) return false;
		this.historyKeys = [];

		const map = this.tryStartMappingKeyPending(ctx, affectOverlay);
		// If the variable above returns true, it indicates that the mapping processor has initiated a sequence.
		// If it returns `false`, it means the corresponding key was not found.
		// We return `true` only when it is being processed, to prevent subsequent handling of the key combination that could lead to confusion.
		// At the same time, the execution order ensures that mapped keys take precedence over standard key combinations.
		if (map) {
			return true;
		}

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

		// NOTE: Since this is the start of the sequence key, we do not check the endKey.
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
		ctx: PipelineContext<TComponent>,
		affectOverlay: boolean,
	): boolean {
		// Mapping-key pending takes priority over composition pending,
		// mirroring how tryStartMappingKeyPending takes priority over
		// single-key composition in startPending.
		if (this.processMappingKeyPending(ctx, affectOverlay)) return true;

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
				this.recordHistory();
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
				this.recordHistory();
				this.clearPending();
				return result.KeyReleaseWhenChainInterrupted === undefined
					? false
					: result.KeyReleaseWhenChainInterrupted;
			}

			// In fact, if the user manually returns `null`,
			// it is possible to simulate the current key being the last key under specific circumstances.
			// But I prefer to respect the user's choice.
			// Therefore, the check for the trailing key is placed after the check for whether the context is null.
			if (this.isEndKey(result.isEndKey ?? [], this.context.lastFlag)) {
				this.recordHistory();
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

	start(ctx: PipelineContext<TComponent>, affectOverlay: boolean): boolean {
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
