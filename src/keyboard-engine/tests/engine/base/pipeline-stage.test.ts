import { describe, expect, it, vi } from "vitest";
import { createEngine } from "../../_helpers/factories.js";
import { builtinProcessorWeights } from "../../../src/processors/weights.js";

function ids(engine: ReturnType<typeof createEngine>): string[] {
  return engine.getProcessors().map((p) => p.id);
}

// A weight with no built-in stage, so custom processors land in a stage of
// their own between `layer` (4000) and `global-key-overlay` (5000).
const FRESH_WEIGHT = 4500;

describe("pipeline stages", () => {
  describe("stage grouping via addProcessor", () => {
    it("puts equal-weight processors in one stage so both observe the event", () => {
      const engine = createEngine();
      const first = vi.fn(() => true);
      const second = vi.fn(() => false);
      engine.addProcessor({ id: "first", process: first }, { weight: FRESH_WEIGHT });
      engine.addProcessor({ id: "second", process: second }, { weight: FRESH_WEIGHT });

      expect(engine.processKey("x", {})).toBe(true);
      expect(first).toHaveBeenCalledOnce();
      // A sibling in the same stage still runs even though `first` consumed.
      expect(second).toHaveBeenCalledOnce();
    });

    it("merges a processor into the stage that already carries the weight", () => {
      const engine = createEngine();
      engine.addProcessor(
        { id: "audit", process: () => false },
        { weight: builtinProcessorWeights.layer },
      );

      const order = ids(engine);
      const layerAt = order.indexOf("layer");
      expect(order[layerAt + 1]).toBe("audit");
      expect(order[layerAt + 2]).toBe("composition-screen");
    });

    it("skips later stages once a stage consumes the event", () => {
      const engine = createEngine();
      const lower = vi.fn(() => false);
      engine.addProcessor(
        { id: "lower", process: lower },
        { weight: builtinProcessorWeights["screen-stack"] - 1000 },
      );
      engine.addProcessor({ id: "upper", process: () => true }, { weight: FRESH_WEIGHT });

      expect(engine.processKey("x", {})).toBe(true);
      expect(lower).not.toHaveBeenCalled();
    });

    it("reports consumption from the final stage", () => {
      const engine = createEngine();
      engine.addProcessor(
        { id: "tail", process: () => true },
        { weight: builtinProcessorWeights["screen-stack"] - 1000 },
      );

      expect(engine.processKey("x", {})).toBe(true);
    });

    it("inserts as a new stage slot at index, not a new processor slot", () => {
      const engine = createEngine();
      engine.addProcessor({ id: "mid", process: () => false }, { index: 4 });

      // Slot 4 sits between `global-key-overlay` (weight 5000) and `layer`
      // (4000), so the new stage lands there rather than after four processors.
      const order = ids(engine);
      const midAt = order.indexOf("mid");
      expect(order[midAt - 1]).toBe("global-key-overlay");
      expect(order[midAt + 1]).toBe("layer");
    });

    it("places before/after as a new stage beside the target's stage", () => {
      const engine = createEngine();
      engine.addProcessor({ id: "above", process: () => false }, { before: "layer" });
      engine.addProcessor({ id: "below", process: () => false }, { after: "layer" });

      const order = ids(engine);
      const layerAt = order.indexOf("layer");
      expect(order[layerAt - 1]).toBe("above");
      expect(order[layerAt + 1]).toBe("below");
    });
  });

  describe("index bounds", () => {
    it("rejects an out-of-range index", () => {
      const engine = createEngine();
      expect(() =>
        engine.addProcessor({ id: "bad", process: () => false }, { index: -1 }),
      ).toThrow("[ink-cartridge]");
      expect(() =>
        engine.addProcessor({ id: "bad", process: () => false }, { index: 10 }),
      ).toThrow("[ink-cartridge]");
    });

    it("accepts the stage count as the append slot", () => {
      const engine = createEngine();
      engine.addProcessor({ id: "tail", process: () => false }, { index: 9 });
      expect(ids(engine).at(-1)).toBe("tail");
    });
  });

  describe("setProcessorWeight", () => {
    it("moves a processor into the stage matching the target weight", () => {
      const engine = createEngine();
      const leader = vi.fn(() => true);
      engine.addProcessor({ id: "leader", process: leader }, { weight: FRESH_WEIGHT });
      const follower = vi.fn(() => false);
      engine.addProcessor({ id: "follower", process: follower }, { weight: 0 });

      // `follower` sits in the weight-0 stage, below the consuming leader.
      engine.processKey("x", {});
      expect(follower).not.toHaveBeenCalled();

      expect(engine.setProcessorWeight("follower", FRESH_WEIGHT)).toBe(true);

      expect(engine.processKey("x", {})).toBe(true);
      expect(follower).toHaveBeenCalledOnce();
    });

    it("opens a fresh stage when no stage carries the target weight", () => {
      const engine = createEngine();
      engine.addProcessor({ id: "mover", process: () => false }, { weight: 0 });

      expect(engine.setProcessorWeight("mover", builtinProcessorWeights.modal + 1000)).toBe(
        true,
      );
      expect(ids(engine)[0]).toBe("mover");
    });

    it("drops the stage a processor leaves empty", () => {
      const engine = createEngine();
      expect(engine.getProcessors()).toHaveLength(9);

      expect(engine.setProcessorWeight("modal", -1)).toBe(true);
      expect(ids(engine).at(-1)).toBe("modal");
      expect(engine.getProcessors()).toHaveLength(9);

      // Slot arithmetic still targets the remaining nine stages: slot 8 is
      // the gap between `screen-stack` and the moved (weight -1) `modal`.
      engine.addProcessor({ id: "mid", process: () => false }, { index: 8 });
      expect(ids(engine).at(-2)).toBe("mid");
    });

    it("leaves the other members when moving one out of a shared stage", () => {
      const engine = createEngine();
      const stayer = vi.fn(() => true);
      const mover = vi.fn(() => false);
      engine.addProcessor({ id: "stayer", process: stayer }, { weight: FRESH_WEIGHT });
      engine.addProcessor({ id: "mover", process: mover }, { weight: FRESH_WEIGHT });

      engine.processKey("x", {});
      expect(mover).toHaveBeenCalledOnce();

      expect(engine.setProcessorWeight("mover", 0)).toBe(true);
      mover.mockClear();
      engine.processKey("x", {});
      expect(ids(engine)).toContain("stayer");
      expect(stayer).toHaveBeenCalled();
      expect(mover).not.toHaveBeenCalled();
    });

    it("is a no-op when the weight is unchanged", () => {
      const engine = createEngine();
      engine.addProcessor({ id: "keep", process: () => false }, { weight: FRESH_WEIGHT });
      const before = ids(engine);

      expect(engine.setProcessorWeight("keep", FRESH_WEIGHT)).toBe(true);
      expect(ids(engine)).toEqual(before);
    });

    it("returns false for an unknown id", () => {
      const engine = createEngine();
      expect(engine.setProcessorWeight("missing", 0)).toBe(false);
    });
  });

  describe("removeProcessor", () => {
    it("removes one processor from a shared stage without touching its siblings", () => {
      const engine = createEngine();
      const removed = vi.fn(() => false);
      const kept = vi.fn(() => false);
      engine.addProcessor({ id: "removed", process: removed }, { weight: FRESH_WEIGHT });
      engine.addProcessor({ id: "kept", process: kept }, { weight: FRESH_WEIGHT });

      expect(engine.removeProcessor("removed")).toBe(true);

      engine.processKey("x", {});
      expect(removed).not.toHaveBeenCalled();
      expect(kept).toHaveBeenCalledOnce();
      expect(ids(engine)).not.toContain("removed");
    });

    it("drops the stage when its only processor is removed and frees the id", () => {
      const engine = createEngine();
      const only = vi.fn(() => true);
      engine.addProcessor({ id: "only", process: only }, { weight: FRESH_WEIGHT });
      expect(engine.processKey("x", {})).toBe(true);

      expect(engine.removeProcessor("only")).toBe(true);
      only.mockClear();
      expect(engine.processKey("x", {})).toBe(false);
      expect(only).not.toHaveBeenCalled();

      engine.addProcessor({ id: "only", process: () => false });
      expect(ids(engine)).toContain("only");
    });

    it("returns false for an unknown id", () => {
      const engine = createEngine();
      expect(engine.removeProcessor("missing")).toBe(false);
    });
  });

  describe("getProcessors", () => {
    it("returns a fresh flat copy including inactive processors", () => {
      const engine = createEngine();
      const snapshot = engine.getProcessors();
      expect(snapshot).toHaveLength(9);
      // Flattened into processing order — stages never leak as arrays.
      expect(snapshot.every((p) => typeof p.process === "function")).toBe(true);
      expect(engine.getProcessors()).not.toBe(snapshot);

      engine.kickProcessor("modal");
      expect(engine.getProcessors().find((p) => p.id === "modal")?.active).toBe(false);
      expect(engine.getProcessors()).toHaveLength(9);
    });
  });
});
