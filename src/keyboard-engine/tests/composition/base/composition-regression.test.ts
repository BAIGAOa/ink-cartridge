import { afterEach, describe, expect, it, vi } from "vitest";
import {
	type CompositionContext,
	type CompositionKey,
} from "../../../src/CompositionEngine.js";
import { createEngine } from "../../_helpers/factories.js";

const Root = {};

afterEach(() => {
	vi.useRealTimers();
});

function syncEngine() {
	const engine = createEngine();
	engine.sync({ pagePath: [Root], layers: [], modalLayers: [] });
	return engine;
}

function head(
	engine: ReturnType<typeof createEngine>,
	extra: Partial<CompositionKey<unknown>> = {},
) {
	const entry: CompositionKey<unknown> = {
		key: "3",
		flags: [],
		alternativeFlag: "times",
		needs: [],
		execute: (ctx) => ({
			value: 1,
			lastFlag: "times",
			steps: [...ctx.steps, "3"],
		}),
		...extra,
	};
	engine.registryCompositionKey(entry);
}

function cont(
	engine: ReturnType<typeof createEngine>,
	extra: Partial<CompositionKey<unknown>> = {},
) {
	const entry: CompositionKey<unknown> = {
		key: "w",
		flags: [],
		alternativeFlag: "action",
		needs: ["times"],
		execute: (ctx) => ({
			value: ctx.value,
			lastFlag: "action",
			steps: [...ctx.steps, "w"],
		}),
		...extra,
	};
	engine.registryCompositionKey(entry);
}

describe("composition undo buffers — one recorded sequence stays one entry", () => {
	it("does not re-record a chain that already completed on timeout", () => {
		vi.useFakeTimers();
		const engine = syncEngine();
		head(engine);
		engine.processKey("3", {});
		vi.advanceTimersByTime(600);
		expect(engine.bufferedCompositionCount()).toBe(1);

		engine.abortComposition();
		expect(engine.bufferedCompositionCount()).toBe(1);
	});

	it("keeps the count stable across repeated aborts", () => {
		vi.useFakeTimers();
		const engine = syncEngine();
		head(engine);
		engine.processKey("3", {});
		vi.advanceTimersByTime(600);

		engine.abortComposition();
		engine.abortComposition();
		engine.abortComposition();
		expect(engine.bufferedCompositionCount()).toBe(1);
	});

	it("does not resurrect history after clearCompositionBuffers", () => {
		vi.useFakeTimers();
		const engine = syncEngine();
		head(engine);
		engine.processKey("3", {});
		vi.advanceTimersByTime(600);

		engine.clearCompositionBuffers();
		expect(engine.bufferedCompositionCount()).toBe(0);

		engine.abortComposition();
		expect(engine.bufferedCompositionCount()).toBe(0);
	});

	it("runs each recorded undo action exactly once", () => {
		vi.useFakeTimers();
		const engine = syncEngine();
		const undoAction = vi.fn((ctx: CompositionContext) => ({
			...ctx,
			value: 0,
		}));
		head(engine, { undoAction });
		engine.processKey("3", {});
		vi.advanceTimersByTime(600);
		engine.abortComposition();

		expect(engine.undoComposition()).not.toBeNull();
		expect(undoAction).toHaveBeenCalledTimes(1);
		// Nothing left to rewind — the chain was recorded exactly once.
		expect(engine.bufferedCompositionCount()).toBe(0);
		expect(engine.undoComposition()).toBeNull();
		expect(undoAction).toHaveBeenCalledTimes(1);
	});

});

describe("mapping key timeouts — the entry's timeout is the one that counts", () => {
	it("expires a pending mapping on its own timeout, before the engine default", () => {
		vi.useFakeTimers();
		const engine = syncEngine();
		head(engine);
		expect(engine.addMapping(["g", "h"], ["3"], { timeout: 50 })).toBe(true);

		expect(engine.processKey("g", {})).toBe(true);
		expect(engine.getLastMappingEvent()?.type).toBe("started");

		// Past the entry's 50ms, still well inside the engine default (400ms).
		vi.advanceTimersByTime(200);
		expect(engine.processKey("h", {})).toBe(false);
	});

	it("keeps the entry timeout alive while advancing a longer sequence", () => {
		vi.useFakeTimers();
		const engine = syncEngine();
		head(engine);
		expect(engine.addMapping(["g", "h", "i"], ["3"], { timeout: 50 })).toBe(
			true,
		);

		expect(engine.processKey("g", {})).toBe(true);
		expect(engine.processKey("h", {})).toBe(true);
		expect(engine.getLastMappingEvent()?.type).toBe("continued");

		vi.advanceTimersByTime(200);
		expect(engine.processKey("i", {})).toBe(false);
	});

	it("falls back to the engine default when the entry declares no timeout", () => {
		vi.useFakeTimers();
		const engine = syncEngine();
		head(engine);
		expect(engine.addMapping(["g", "h"], ["3"])).toBe(true);

		expect(engine.processKey("g", {})).toBe(true);
		vi.advanceTimersByTime(200);
		expect(engine.processKey("h", {})).toBe(true);
		expect(engine.getLastMappingEvent()?.type).toBe("completed");
	});

	it("re-seeds the timeout from the entry disambiguation locks onto", () => {
		vi.useFakeTimers();
		const engine = syncEngine();
		head(engine);
		// The first entry seeds the pending state (and its generous timeout);
		// the second is the one the user actually completes.
		expect(
			engine.addMapping(["g", "h", "p", "q"], ["3"], { timeout: 900 }),
		).toBe(true);
		expect(
			engine.addMapping(["g", "h", "x", "y"], ["3"], { timeout: 50 }),
		).toBe(true);

		expect(engine.processKey("g", {})).toBe(true);
		expect(engine.processKey("h", {})).toBe(true);
		expect(engine.getLastMappingEvent()?.type).toBe("continued");

		// "x" rules out the first candidate; its 50ms timeout now applies.
		expect(engine.processKey("x", {})).toBe(true);
		expect(engine.getLastMappingEvent()?.type).toBe("continued");

		vi.advanceTimersByTime(200);
		expect(engine.processKey("y", {})).toBe(false);
	});
});

describe("abort drops a half-typed mapping prefix", () => {
	it("does not let the next key complete a sequence cancelled by abort()", () => {
		const engine = syncEngine();
		head(engine);
		expect(engine.addMapping(["g", "h"], ["3"])).toBe(true);

		expect(engine.processKey("g", {})).toBe(true);
		expect(engine.getLastMappingEvent()?.type).toBe("started");

		engine.abortComposition();
		expect(engine.hasPendingComposition()).toBe(false);

		expect(engine.processKey("h", {})).toBe(false);
		expect(engine.getLastMappingEvent()?.type).toBe("cancelled");
	});

	it("lets a fresh mapped sequence start after abort()", () => {
		const engine = syncEngine();
		head(engine);
		expect(engine.addMapping(["g", "h"], ["3"])).toBe(true);

		engine.processKey("g", {});
		engine.abortComposition();

		expect(engine.processKey("g", {})).toBe(true);
		expect(engine.getLastMappingEvent()?.type).toBe("started");
		expect(engine.processKey("h", {})).toBe(true);
		expect(engine.getLastMappingEvent()?.type).toBe("completed");
	});
});

describe("mapped chains reach the undo ledger like typed keys", () => {
	it("records a single-key mapping's target chain", () => {
		const engine = syncEngine();
		const undoAction = vi.fn((ctx: CompositionContext) => ({
			...ctx,
			value: 0,
		}));
		head(engine, { undoAction });
		expect(engine.addMapping(["g"], ["3"])).toBe(true);

		expect(engine.processKey("g", {})).toBe(true);
		expect(engine.getLastMappingEvent()?.type).toBe("completed");
		expect(engine.bufferedCompositionCount()).toBe(1);

		expect(engine.undoComposition()).not.toBeNull();
		expect(undoAction).toHaveBeenCalledTimes(1);
		expect(engine.bufferedCompositionCount()).toBe(0);
	});

	it("records a multi-key mapping per target key", () => {
		const engine = syncEngine();
		head(engine);
		cont(engine);
		expect(engine.addMapping(["g", "h"], ["3", "w"])).toBe(true);

		expect(engine.processKey("g", {})).toBe(true);
		expect(engine.processKey("h", {})).toBe(true);
		expect(engine.getLastMappingEvent()?.type).toBe("completed");
		expect(engine.bufferedCompositionCount()).toBe(1);

		// Same granularity as typing "3" then "w": undo-by-key peels one step.
		expect(engine.undoComposition(1, { byKey: true })).not.toBeNull();
		expect(engine.bufferedCompositionCount()).toBe(1);
		expect(engine.undoComposition(1, { byKey: true })).not.toBeNull();
		expect(engine.bufferedCompositionCount()).toBe(0);
	});

	it("records nothing when the target chain fails partway", () => {
		const engine = syncEngine();
		head(engine);
		// "q" can never follow "3" (it needs flag "other"), so the second
		// target key fails after the first one already executed.
		const dead: CompositionKey<unknown> = {
			key: "q",
			flags: [],
			alternativeFlag: "other",
			needs: ["other"],
			execute: (ctx) => ({
				value: ctx.value,
				lastFlag: "other",
				steps: [...ctx.steps, "q"],
			}),
		};
		engine.registryCompositionKey(dead);
		expect(engine.addMapping(["g", "h"], ["3", "q"])).toBe(true);

		expect(engine.processKey("g", {})).toBe(true);
		expect(engine.processKey("h", {})).toBe(false);
		expect(engine.getLastMappingEvent()?.type).toBe("broken");
		expect(engine.bufferedCompositionCount()).toBe(0);
	});

	it("records nothing for an empty target", () => {
		const engine = syncEngine();
		head(engine);
		expect(engine.addMapping(["g"], [])).toBe(true);

		expect(engine.processKey("g", {})).toBe(true);
		expect(engine.bufferedCompositionCount()).toBe(0);
	});
});

describe("rejected continuations stay out of the ledger", () => {
	it("drops the partial chain when a when gate rejects the next key", () => {
		const engine = syncEngine();
		engine.addCondition("on", false);
		head(engine);
		cont(engine, { when: "on" });

		engine.processKey("3", {});
		expect(engine.processKey("w", {})).toBe(false);
		expect(engine.bufferedCompositionCount()).toBe(0);

		// A later abort must not resurrect the rejected partial chain either.
		engine.abortComposition();
		expect(engine.bufferedCompositionCount()).toBe(0);
	});

	it("still records a chain the author terminates with execute → null", () => {
		const engine = syncEngine();
		head(engine);
		cont(engine, { execute: () => null });

		engine.processKey("3", {});
		expect(engine.processKey("w", {})).toBe(false);
		expect(engine.bufferedCompositionCount()).toBe(1);
	});

	it("does not record a chain broken by an unmatched key", () => {
		const engine = syncEngine();
		engine.boundKeyboard(["z"], () => {});
		head(engine);

		engine.processKey("3", {});
		expect(engine.processKey("z", {})).toBe(false);
		expect(engine.getLastCompositionEvent()?.type).toBe("broken");
		expect(engine.bufferedCompositionCount()).toBe(0);
	});

	it("does not record a partial chain dropped by the value schema", () => {
		const engine = syncEngine();
		engine.setValueSchema({ times: () => true, action: () => true });
		head(engine);
		cont(engine);

		engine.processKey("3", {});
		engine.setValueSchema({ times: () => false, action: () => true });
		expect(engine.processKey("w", {})).toBe(false);
		expect(engine.bufferedCompositionCount()).toBe(0);
	});
});

describe("a dropped mapping prefix notifies subscribers", () => {
	it("notifies when the sequence times out", () => {
		vi.useFakeTimers();
		const engine = syncEngine();
		head(engine);
		expect(engine.addMapping(["g", "h"], ["3"])).toBe(true);
		const sub = vi.fn();
		engine.subscribeMapping(sub);

		expect(engine.processKey("g", {})).toBe(true);
		expect(engine.getLastMappingEvent()?.type).toBe("started");

		sub.mockClear();
		vi.advanceTimersByTime(600);
		expect(sub).toHaveBeenCalledTimes(1);
		expect(engine.getLastMappingEvent()?.type).toBe("cancelled");

		// The prefix is gone — the next key must not complete the sequence.
		expect(engine.processKey("h", {})).toBe(false);
	});

	it("notifies once when abort() drops the prefix, not on every abort()", () => {
		const engine = syncEngine();
		head(engine);
		engine.addMapping(["g", "h"], ["3"]);
		const sub = vi.fn();
		engine.subscribeMapping(sub);

		engine.processKey("g", {});
		sub.mockClear();

		engine.abortComposition();
		expect(sub).toHaveBeenCalledTimes(1);
		expect(engine.getLastMappingEvent()?.type).toBe("cancelled");

		engine.abortComposition();
		expect(sub).toHaveBeenCalledTimes(1);
	});

	it("notifies when undo() drops the prefix", () => {
		const engine = syncEngine();
		head(engine);
		engine.addMapping(["g", "h"], ["3"]);

		engine.processKey("g", {});
		expect(engine.undoComposition()).toBeNull();
		expect(engine.getLastMappingEvent()?.type).toBe("cancelled");
	});
});
