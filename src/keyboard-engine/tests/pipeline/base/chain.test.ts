import { describe, expect, it } from "vitest";
import { _insertRelative } from "../../../src/pipeline/chain.js";

const processor = (id: string) => ({ id, process: () => false });

describe("_insertRelative", () => {
  it("inserts by index, target, and default append order", () => {
    const base = [processor("modal"), processor("layer")];
    const byIndex = _insertRelative(base, [
      { processor: processor("i"), index: 1 },
    ]);
    expect(byIndex.map((p) => p.id)).toEqual(["modal", "i", "layer"]);

    const before = _insertRelative(base, [
      { processor: processor("x"), target: "layer", position: "before" },
    ]);
    expect(before.map((p) => p.id)).toEqual(["modal", "x", "layer"]);

    const after = _insertRelative(base, [
      { processor: processor("y"), target: "modal", position: "after" },
    ]);
    expect(after.map((p) => p.id)).toEqual(["modal", "y", "layer"]);

    const appended = _insertRelative(base, [{ processor: processor("z") }]);
    expect(appended.map((p) => p.id)).toEqual(["modal", "layer", "z"]);
  });

  it("applies multiple insertions in order", () => {
    const result = _insertRelative([processor("modal")], [
      { processor: processor("b"), index: 1 },
      { processor: processor("c") },
    ]);
    expect(result.map((p) => p.id)).toEqual(["modal", "b", "c"]);
  });

  it("throws on duplicate ids and missing targets", () => {
    const base = [processor("modal")];
    expect(() =>
      _insertRelative(base, [{ processor: processor("modal") }]),
    ).toThrow("duplicate id");
    expect(() =>
      _insertRelative(base, [
        { processor: processor("x"), target: "screen-stack", position: "before" },
      ]),
    ).toThrow("target \"screen-stack\" not found");
  });
});
