import { describe, expect, it, vi } from "vitest";
import { createEngine, makeSyncLayer } from "../_helpers/factories.js";

const Root = {};
const Child = {};

describe("full pipeline", () => {
  it("runs custom processors inserted into the pipeline", () => {
    const engine = createEngine();
    const custom = vi.fn((_eventNames: string[]) => false);
    engine.addProcessor({
      id: "logger",
      process: (ctx) => {
        custom(ctx.eventNames);
        return false;
      },
    });
    engine.sync({ pagePath: [Root], layers: [], modalLayers: [] });
    engine.processKey("a", {});
    expect(custom).toHaveBeenCalledWith(["a"]);
  });

  it("respects modes across bindings and global keys", () => {
    const engine = createEngine({ modes: ["normal", "insert"], defaultMode: "normal" });
    const insertHandler = vi.fn();
    const normalHandler = vi.fn();
    const globalOperate = vi.fn();
    engine.sync({ pagePath: [Root], layers: [], modalLayers: [] });
    engine.boundKeyboard(["i"], insertHandler, { mode: "insert" });
    engine.boundKeyboard(["n"], normalHandler, { mode: "normal" });
    engine.globalKeys([{ key: "g", operate: globalOperate, mode: "insert" }]);

    engine.processKey("i", {});
    expect(insertHandler).not.toHaveBeenCalled();
    engine.processKey("g", {});
    expect(globalOperate).not.toHaveBeenCalled();

    engine.setMode("insert");
    engine.processKey("i", {});
    expect(insertHandler).toHaveBeenCalled();
    engine.processKey("g", {});
    expect(globalOperate).toHaveBeenCalled();
  });

  it("lets a layer sequence beat a screen binding", () => {
    const engine = createEngine();
    const seq = vi.fn();
    const screen = vi.fn();
    engine.sync({
      pagePath: [Root],
      layers: [makeSyncLayer("L", ["e1"])],
      modalLayers: [],
    });
    engine.pushOwner("L");
    engine.boundSequence(["a", "b"], seq, { elementId: "e1" });
    engine.popOwner("L");
    engine.boundKeyboard(["a"], screen);

    engine.processKey("a", {});
    expect(screen).not.toHaveBeenCalled();
    engine.processKey("b", {});
    expect(seq).toHaveBeenCalled();
  });

  it("supports autoTab focus rotation", () => {
    const engine = createEngine({
      autoTab: true,
      normalizeKeyNames: (input) =>
        input === "\t" ? ["tab"] : input ? [input] : [],
    });
    const first = vi.fn();
    const second = vi.fn();
    engine.sync({ pagePath: [Root], layers: [], modalLayers: [] });
    engine.boundKeyboard(["a"], first, { focusId: "one" });
    engine.boundKeyboard(["b"], second, { focusId: "two" });
    expect(engine.focusCurrent().result?.id).toBe("one");
    expect(engine.processKey("\t", {})).toBe(false);
    expect(engine.focusCurrent().result?.id).toBe("two");
  });

  it("supports composition over a screen binding", () => {
    const engine = createEngine();
    const screen = vi.fn();
    const composed = vi.fn();
    engine.sync({ pagePath: [Root], layers: [], modalLayers: [] });
    engine.boundKeyboard(["3"], screen);
    engine.registryCompositionKey({
      key: "3",
      flags: [],
      alternativeFlag: "times",
      needs: [],
      execute: (ctx) => ({
        value: 3,
        lastFlag: "times",
        steps: [...ctx.steps, "3"],
      }),
    });
    engine.registryCompositionKey({
      key: "w",
      flags: [],
      alternativeFlag: "action",
      needs: ["times"],
      optional: true,
      execute: (ctx) => {
        composed(ctx.value);
        return {
          value: ctx.value,
          lastFlag: "action",
          steps: [...ctx.steps, "w"],
        };
      },
    });
    engine.processKey("3", {});
    expect(screen).not.toHaveBeenCalled();
    engine.processKey("w", {});
    expect(composed).toHaveBeenCalledWith(3);
  });

  it("cleans page layers after navigation", () => {
    const engine = createEngine();
    engine.sync({ pagePath: [Root], layers: [], modalLayers: [] });
    engine.boundKeyboard(["x"], () => {});
    engine.cleanLayers();
    engine.sync({ pagePath: [Child], layers: [], modalLayers: [] });
    engine.cleanLayers();
    expect(engine.readLayer(Root)).toBeUndefined();
  });
});
