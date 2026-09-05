import { describe, expect, it } from "vitest";
import { createEngine } from "../../_helpers/factories.js";

function ids(engine: ReturnType<typeof createEngine>): string[] {
  return engine.getProcessors().map((p) => p.id);
}

const BUILTIN_ORDER = [
  "modal",
  "composition-overlay",
  "global-sequence-overlay",
  "global-key-overlay",
  "layer",
  "composition-screen",
  "global-sequence-screen",
  "global-key-screen",
  "screen-stack",
];

describe("pipeline weight ordering", () => {
  it("defaults to the built-in weights (modal first, screen-stack last)", () => {
    const engine = createEngine();
    expect(ids(engine)).toEqual(BUILTIN_ORDER);
  });

  it("places a custom processor by weight between built-ins", () => {
    const engine = createEngine();
    engine.addProcessor({ id: "audit", process: () => false }, { weight: 5500 });
    const order = ids(engine);
    const at = order.indexOf("audit");
    expect(order[at - 1]).toBe("global-sequence-overlay");
    expect(order[at + 1]).toBe("global-key-overlay");
  });

  it("keeps registration order when weights are equal", () => {
    const engine = createEngine();
    engine.addProcessor({ id: "one", process: () => false }, { weight: 0 });
    engine.addProcessor({ id: "two", process: () => false }, { weight: 0 });
    const order = ids(engine);
    expect(order[order.length - 2]).toBe("one");
    expect(order[order.length - 1]).toBe("two");
  });

  it("stamps active/weight/createAt onto inserted processors", () => {
    const engine = createEngine();
    engine.addProcessor({ id: "custom", process: () => false });
    const stored = engine.getProcessors().find((p) => p.id === "custom");
    expect(stored).toBeDefined();
    expect(stored!.active).toBe(true);
    expect(typeof stored!.weight).toBe("number");
    expect(typeof stored!.createAt).toBe("number");
  });

  it("skips inactive processors before process() runs", () => {
    const engine = createEngine();
    let ran = false;
    engine.addProcessor(
      {
        id: "guard",
        process: () => {
          ran = true;
          return true;
        },
      },
      { weight: 9000 },
    );
    expect(engine.processKey("x", {})).toBe(true);
    expect(ran).toBe(true);

    ran = false;
    expect(engine.kickProcessor("guard")).toBe(true);
    expect(engine.processKey("x", {})).toBe(false);
    expect(ran).toBe(false);
  });
});
