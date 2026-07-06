import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { clearDispatchers } from "../../../src/screen/provider.js";
import { clearShortcutOperations } from "../../../src/keyboard/provider.js";
import {
  Menu,
  setupKeyboardTests,
  flush,
  pressKey,
  renderKeyboardApp,
} from "./_helpers.js";

beforeEach(() => {
  setupKeyboardTests();
});

afterEach(() => {
  clearDispatchers();
  clearShortcutOperations();
  vi.restoreAllMocks();
});

describe("mode registration and switching", () => {
  it("addMode registers a new mode and returns true", () => {
    let result = false;
    renderKeyboardApp(Menu, (kb) => {
      result = kb.addMode("visual");
    }, { modes: ["normal", "insert"] });
    expect(result).toBe(true);
  });

  it("addMode returns false for a duplicate mode", () => {
    let first = false;
    let second = false;
    renderKeyboardApp(Menu, (kb) => {
      first = kb.addMode("visual");
      second = kb.addMode("visual");
    }, { modes: ["normal", "insert"] });
    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it("removeMode returns true when removing an existing mode", () => {
    let result = false;
    renderKeyboardApp(Menu, (kb) => {
      result = kb.removeMode("insert");
    }, { modes: ["normal", "insert"] });
    expect(result).toBe(true);
  });

  it("removeMode returns false for a non-existent mode", () => {
    let result = true;
    renderKeyboardApp(Menu, (kb) => {
      result = kb.removeMode("visual");
    }, { modes: ["normal", "insert"] });
    expect(result).toBe(false);
  });

  it("setMode switches to a registered mode and returns true", () => {
    let result = false;
    renderKeyboardApp(Menu, (kb) => {
      kb.setMode("normal");
      result = kb.setMode("insert");
    }, { modes: ["normal", "insert"] });
    expect(result).toBe(true);
  });

  it("setMode returns false for an unregistered mode", () => {
    let result = true;
    renderKeyboardApp(Menu, (kb) => {
      result = kb.setMode("visual");
    }, { modes: ["normal", "insert"] });
    expect(result).toBe(false);
  });

  it("setMode(null) always succeeds", () => {
    let result = false;
    renderKeyboardApp(Menu, (kb) => {
      kb.setMode("normal");
      result = kb.setMode(null);
    }, { modes: ["normal", "insert"] });
    expect(result).toBe(true);
  });

  it("getCurrentMode returns the active mode", () => {
    let current: string | null = undefined as unknown as string | null;
    renderKeyboardApp(Menu, (kb) => {
      kb.setMode("normal");
      current = kb.getCurrentMode();
    }, { modes: ["normal", "insert"] });
    expect(current).toBe("normal");
  });

  it("getCurrentMode returns null when no mode is set", () => {
    let current: string | null = undefined as unknown as string | null;
    renderKeyboardApp(Menu, (kb) => {
      current = kb.getCurrentMode();
    });
    expect(current).toBeNull();
  });

  it("nextMode cycles forward and wraps around", () => {
    const modes: string[] = [];
    renderKeyboardApp(Menu, (kb) => {
      kb.setMode("normal");
      kb.nextMode();
      modes.push(kb.getCurrentMode()!);
      kb.nextMode();
      modes.push(kb.getCurrentMode()!);
    }, { modes: ["normal", "insert"] });
    expect(modes).toEqual(["insert", "normal"]);
  });

  it("prevMode cycles backward and wraps around", () => {
    const modes: string[] = [];
    renderKeyboardApp(Menu, (kb) => {
      kb.setMode("normal");
      kb.prevMode();
      modes.push(kb.getCurrentMode()!);
      kb.prevMode();
      modes.push(kb.getCurrentMode()!);
    }, { modes: ["normal", "insert"] });
    expect(modes).toEqual(["insert", "normal"]);
  });

  it("nextMode is a no-op when no modes are registered", () => {
    let current: string | null = undefined as unknown as string | null;
    renderKeyboardApp(Menu, (kb) => {
      current = kb.getCurrentMode();
      kb.nextMode();
    });
    expect(current).toBeNull();
  });

  it("prevMode is a no-op when no modes are registered", () => {
    let current: string | null = undefined as unknown as string | null;
    renderKeyboardApp(Menu, (kb) => {
      current = kb.getCurrentMode();
      kb.prevMode();
    });
    expect(current).toBeNull();
  });
});

describe("KeyboardProvider modes and defaultMode props", () => {
  it("defaultMode sets the initial mode", () => {
    let current: string | null = undefined as unknown as string | null;
    renderKeyboardApp(Menu, (kb) => {
      current = kb.getCurrentMode();
    }, { modes: ["normal", "insert"], defaultMode: "insert" });
    expect(current).toBe("insert");
  });

  it("modes prop pre-registers modes for use by setMode", () => {
    let result = false;
    renderKeyboardApp(Menu, (kb) => {
      result = kb.setMode("insert");
    }, { modes: ["normal", "insert"] });
    expect(result).toBe(true);
  });
});

describe("boundKeyboard mode filtering", () => {
  it("fires when mode matches", async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(["a"], handler, { mode: "normal" });
    }, { modes: ["normal", "insert"], defaultMode: "normal" });
    await flush();

    await pressKey(stdin, "a");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not fire when mode does not match", async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(["a"], handler, { mode: "insert" });
    }, { modes: ["normal", "insert"], defaultMode: "normal" });
    await flush();

    await pressKey(stdin, "a");
    expect(handler).not.toHaveBeenCalled();
  });

  it("without mode tag fires in all modes including no-mode", async () => {
    const handler = vi.fn();
    let setMode: (m: string | null) => boolean;
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      setMode = kb.setMode;
      kb.boundKeyboard(["a"], handler);
    }, { modes: ["normal", "insert"], defaultMode: "normal" });
    await flush();

    await pressKey(stdin, "a");
    expect(handler).toHaveBeenCalledTimes(1);

    setMode("insert");
    await pressKey(stdin, "a");
    expect(handler).toHaveBeenCalledTimes(2);

    setMode(null);
    await pressKey(stdin, "a");
    expect(handler).toHaveBeenCalledTimes(3);
  });

  it("does not fire in no-mode when mode tag is set", async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(["a"], handler, { mode: "normal" });
    });
    await flush();

    await pressKey(stdin, "a");
    expect(handler).not.toHaveBeenCalled();
  });

  it("mode is checked before when", async () => {
    const whenFn = vi.fn(() => true);
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(["a"], handler, { mode: "insert", when: whenFn });
    }, { modes: ["normal", "insert"], defaultMode: "normal" });
    await flush();

    await pressKey(stdin, "a");
    expect(handler).not.toHaveBeenCalled();
    expect(whenFn).not.toHaveBeenCalled();
  });

  it("wildcard binding respects mode", async () => {
    const wildcardH = vi.fn();
    const exactH = vi.fn();
    let setMode: (m: string | null) => boolean;
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      setMode = kb.setMode;
      kb.boundKeyboard(["*"], wildcardH, { mode: "insert" });
      kb.boundKeyboard(["x"], exactH);
    }, { modes: ["normal", "insert"], defaultMode: "normal" });
    await flush();

    await pressKey(stdin, "x");
    expect(wildcardH).not.toHaveBeenCalled();
    expect(exactH).toHaveBeenCalledTimes(1);

    setMode("insert");
    await pressKey(stdin, "z");
    expect(wildcardH).toHaveBeenCalledTimes(1);
  });

  it("focus target binding respects mode", async () => {
    const handler = vi.fn();
    let setMode: (m: string | null) => boolean;
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      setMode = kb.setMode;
      kb.setMode("normal");
      kb.boundKeyboard(["x"], handler, { mode: "insert", focusId: "field" });
      kb.focusSet("field");
    }, { modes: ["normal", "insert"] });
    await flush();

    await pressKey(stdin, "x");
    expect(handler).not.toHaveBeenCalled();

    setMode("insert");
    await pressKey(stdin, "x");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("wildcardFirst layer-level wildcard respects mode", async () => {
    const wildcardH = vi.fn();
    const exactH = vi.fn();
    let setMode: (m: string | null) => boolean;
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      setMode = kb.setMode;
      kb.enableWildcardPriority();
      kb.boundKeyboard(["*"], wildcardH, { mode: "insert" });
      kb.boundKeyboard(["x"], exactH);
    }, { modes: ["normal", "insert"], defaultMode: "normal" });
    await flush();

    await pressKey(stdin, "x");
    expect(wildcardH).not.toHaveBeenCalled();
    expect(exactH).toHaveBeenCalledTimes(1);

    setMode("insert");
    await pressKey(stdin, "z");
    expect(wildcardH).toHaveBeenCalledTimes(1);
  });
});

describe("boundSequence mode filtering", () => {
  it("sequence with matching mode fires", async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundSequence(["g", "g"], handler, { mode: "normal" });
    }, { modes: ["normal", "insert"], defaultMode: "normal" });
    await flush();

    await pressKey(stdin, "g");
    await pressKey(stdin, "g");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("sequence with non-matching mode does not start", async () => {
    const handler = vi.fn();
    const otherH = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundSequence(["g", "g"], handler, { mode: "insert" });
      kb.boundKeyboard(["g"], otherH);
    }, { modes: ["normal", "insert"], defaultMode: "normal" });
    await flush();

    await pressKey(stdin, "g");
    expect(otherH).toHaveBeenCalledTimes(1);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("globalKeys mode filtering", () => {
  it("global key with matching mode fires", async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalKeys([{ key: "a", operate: handler, mode: "normal" }]);
    }, { modes: ["normal", "insert"], defaultMode: "normal" });
    await flush();

    await pressKey(stdin, "a");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("global key with non-matching mode does not fire", async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalKeys([{ key: "a", operate: handler, mode: "insert" }]);
    }, { modes: ["normal", "insert"], defaultMode: "normal" });
    await flush();

    await pressKey(stdin, "a");
    expect(handler).not.toHaveBeenCalled();
  });

  it("global key without mode fires in all modes", async () => {
    const handler = vi.fn();
    let setMode: (m: string | null) => boolean;
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      setMode = kb.setMode;
      kb.globalKeys([{ key: "a", operate: handler }]);
    }, { modes: ["normal", "insert"], defaultMode: "normal" });
    await flush();

    await pressKey(stdin, "a");
    expect(handler).toHaveBeenCalledTimes(1);

    setMode("insert");
    await pressKey(stdin, "a");
    expect(handler).toHaveBeenCalledTimes(2);

    setMode(null);
    await pressKey(stdin, "a");
    expect(handler).toHaveBeenCalledTimes(3);
  });
});

describe("globalSequence mode filtering", () => {
  it("global sequence with matching mode fires", async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalSequence([{ keys: ["g", "g"], operate: handler, mode: "normal" }]);
    }, { modes: ["normal", "insert"], defaultMode: "normal" });
    await flush();

    await pressKey(stdin, "g");
    await pressKey(stdin, "g");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("global sequence with non-matching mode does not start", async () => {
    const handler = vi.fn();
    const otherH = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalSequence([{ keys: ["g", "g"], operate: handler, mode: "insert" }]);
      kb.globalKeys([{ key: "g", operate: otherH }]);
    }, { modes: ["normal", "insert"], defaultMode: "normal" });
    await flush();

    await pressKey(stdin, "g");
    expect(otherH).toHaveBeenCalledTimes(1);
    expect(handler).not.toHaveBeenCalled();
  });

  it("mode is checked before when in global sequence", async () => {
    const whenFn = vi.fn(() => true);
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.globalSequence([{ keys: ["g", "g"], operate: handler, mode: "insert", when: whenFn }]);
    }, { modes: ["normal", "insert"], defaultMode: "normal" });
    await flush();

    await pressKey(stdin, "g");
    expect(whenFn).not.toHaveBeenCalled();
  });
});

describe("mode system integration", () => {
  it("switching mode mid-session enables and disables bindings correctly", async () => {
    const normalH = vi.fn();
    const insertH = vi.fn();
    let setMode: (m: string | null) => boolean;
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      setMode = kb.setMode;
      kb.boundKeyboard(["j"], normalH, { mode: "normal" });
      kb.boundKeyboard(["*"], insertH, { mode: "insert" });
    }, { modes: ["normal", "insert"], defaultMode: "normal" });
    await flush();

    await pressKey(stdin, "j");
    expect(normalH).toHaveBeenCalledTimes(1);
    expect(insertH).not.toHaveBeenCalled();

    setMode("insert");

    await flush()

    await pressKey(stdin, "j");
    expect(insertH).toHaveBeenCalledTimes(1);
    expect(normalH).toHaveBeenCalledTimes(1);

    setMode("normal");

    await flush()

    await pressKey(stdin, "j");

    await flush()

    expect(normalH).toHaveBeenCalledTimes(2);
  });
});
