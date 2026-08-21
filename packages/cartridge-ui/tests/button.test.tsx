import { EventEmitter } from "node:events";
import React, { act, useEffect, useRef, type ComponentType } from "react";
import { render as inkRender, Box, Text, type DOMElement } from "ink";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  CurrentScreen,
  KeyboardProvider,
  ScenarioManagementProvider,
  clearRegistry,
  registerComponent,
  useFocusState,
  useKeyboard,
} from "ink-cartridge";
import type { ReadableStreamWithEncoding } from "@cartridge-engine/keyboard-engine";
import { Button } from "../src/index.js";

/**
 * Button tests — the button is mouse-driven (`callbacks.onClick` fires on a
 * click). Keyboard only reaches it through an external binding on the
 * forwarded ref, so mouse input flows through the xterm-mouse 'data' listener.
 *
 * SGR sequences: press `\x1b[<0;x;yM` + release `\x1b[<0;x;ym` synthesize a
 * click; `\x1b[<35;x;yM` is a move. A button wrapped in an absolutely
 * positioned 20×3 box at the top-left spans columns 1..20, rows 1..3.
 */

class ResizableStdout extends EventEmitter {
  isTTY = true;
  frames: string[] = [];
  get columns() {
    return 100;
  }
  get rows() {
    return 30;
  }
  write = (frame: string) => {
    this.frames.push(frame);
  };
}

/** Mock stdin serving both Ink (readable + read) and xterm-mouse ('data'). */
class MockStdin extends EventEmitter {
  isTTY = true;
  private data: string | Buffer | null = null;
  setEncoding() {}
  setRawMode() {}
  resume() {}
  pause() {}
  ref() {}
  unref() {}
  read = () => {
    const { data } = this;
    this.data = null;
    return data;
  };
  write = (data: string | Buffer) => {
    this.data = data;
    this.emit("readable");
    this.emit("data", data);
  };
}

/** Mouse enable sequences must not pollute the frame assertions. */
const silentMouseOutput = { write: () => {} };

async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
}

function lastFrameText(): string {
  // eslint-disable-next-line no-control-regex
  const ansi = new RegExp("\\x1b\\[[0-9;]*m", "g");
  return (stdout.frames.at(-1) ?? "")
    .replace(ansi, "")
    .replace(/\s+/g, " ");
}

let stdout: ResizableStdout;
let stdin: MockStdin;

beforeEach(() => {
  clearRegistry();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });
  Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });
  stdout = new ResizableStdout();
  stdin = new MockStdin();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete (process.stdin as { isTTY?: boolean }).isTTY;
  delete (process.stdout as { isTTY?: boolean }).isTTY;
});

function renderApp(Screen: ComponentType): { unmount: () => void } {
  registerComponent(Screen, {});
  const instance = inkRender(
    <ScenarioManagementProvider defaultScreen={Screen} fullScreen>
      <KeyboardProvider
        autoTab={false}
        mouse
        mouseOptions={{
          inputStream: stdin as unknown as ReadableStreamWithEncoding,
          outputStream: silentMouseOutput as unknown as NodeJS.WriteStream,
        }}
      >
        <CurrentScreen />
      </KeyboardProvider>
    </ScenarioManagementProvider>,
    {
      stdout: stdout as unknown as NodeJS.WriteStream,
      stdin: stdin as unknown as NodeJS.ReadStream,
      debug: true,
      exitOnCtrlC: false,
      patchConsole: false,
    },
  );
  return {
    unmount: () => {
      instance.unmount();
      instance.cleanup();
    },
  };
}

async function press(ch: string): Promise<void> {
  await act(async () => {
    stdin.write(ch);
  });
  await flush();
}

async function click(x: number, y: number): Promise<void> {
  await act(async () => {
    stdin.write(`\x1b[<0;${x};${y}M`);
    stdin.write(`\x1b[<0;${x};${y}m`);
  });
  await flush();
}

async function move(x: number, y: number): Promise<void> {
  await act(async () => {
    stdin.write(`\x1b[<35;${x};${y}M`);
  });
  await flush();
}

describe("Button", () => {
  test("renders without an infinite layout loop", async () => {
    let renders = 0;
    function LoopProbe() {
      renders += 1;
      return (
        <Button callbacks={{ onClick: () => {} }}>
          <Text>Save</Text>
        </Button>
      );
    }
    const { unmount } = renderApp(LoopProbe);
    // Regression: the ref-merge callback MUST keep a stable identity — a new
    // function every render makes React detach and re-attach the region ref,
    // and the layout listener then re-renders forever. The loop is
    // scheduler-driven (async), so give it time to explode before asserting.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(renders).toBeLessThan(20);
    unmount();
  });

  test("clicking the button fires onClick", async () => {
    const onClick = vi.fn();
    function ClickProbe() {
      return (
        <Box position="absolute" top={0} left={0} width={20} height={3}>
          <Button callbacks={{ onClick }}>
            <Text>Save</Text>
          </Button>
        </Box>
      );
    }
    const { unmount } = renderApp(ClickProbe);
    await flush();

    await click(10, 2);
    expect(onClick).toHaveBeenCalledTimes(1);
    unmount();
  });

  test("clicking outside the button is silent", async () => {
    const onClick = vi.fn();
    function ClickProbe() {
      return (
        <Box position="absolute" top={0} left={0} width={20} height={3}>
          <Button callbacks={{ onClick }}>
            <Text>Save</Text>
          </Button>
        </Box>
      );
    }
    const { unmount } = renderApp(ClickProbe);
    await flush();

    await click(40, 2);
    expect(onClick).not.toHaveBeenCalled();
    unmount();
  });

  test("hovering fires onEnter and onLeave", async () => {
    const onEnter = vi.fn();
    const onLeave = vi.fn();
    function HoverProbe() {
      return (
        <Box position="absolute" top={0} left={0} width={20} height={3}>
          <Button callbacks={{ onEnter, onLeave }}>
            <Text>Save</Text>
          </Button>
        </Box>
      );
    }
    const { unmount } = renderApp(HoverProbe);
    await flush();

    await move(10, 2);
    expect(onEnter).toHaveBeenCalledTimes(1);
    await move(40, 2);
    expect(onLeave).toHaveBeenCalledTimes(1);
    unmount();
  });

  test("keyboard input alone does not fire onClick", async () => {
    const onClick = vi.fn();
    function KeyProbe() {
      return (
        <Box position="absolute" top={0} left={0} width={20} height={3}>
          <Button callbacks={{ onClick }}>
            <Text>Save</Text>
          </Button>
        </Box>
      );
    }
    const { unmount } = renderApp(KeyProbe);
    await flush();

    await press("c");
    expect(onClick).not.toHaveBeenCalled();
    unmount();
  });

  test("an external key binding on the forwarded ref shares the region", async () => {
    const onClick = vi.fn();
    const onKey = vi.fn();
    function LinkedProbe() {
      const { boundKeyboard, kickFocusGroup } = useKeyboard();
      const focused = useFocusState("save");
      const ref = useRef<DOMElement | null>(null);

      useEffect(() => {
        return boundKeyboard(["return"], onKey, { ref, focusId: "save" });
      }, [boundKeyboard, ref, onKey]);

      useEffect(() => {
        // Kick the default group so nothing is focused until a click
        // forwards focus — proves the click, not auto-activation.
        kickFocusGroup();
      }, [kickFocusGroup]);

      return (
        <Box flexDirection="column">
          <Box position="absolute" top={0} left={0} width={20} height={3}>
            <Button ref={ref} callbacks={{ onClick }}>
              <Text>Save</Text>
            </Button>
          </Box>
          <Text>focused: {focused ? "1" : "0"}</Text>
        </Box>
      );
    }
    const { unmount } = renderApp(LinkedProbe);
    await flush();

    // Kicked group: the focus-scoped Enter is silent before any click.
    await press("\r");
    expect(onKey).not.toHaveBeenCalled();
    expect(lastFrameText()).toContain("focused: 0");

    // Click forwards focus to the external focusId and fires onClick.
    await click(10, 2);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(lastFrameText()).toContain("focused: 1");

    // The focus-scoped binding now fires.
    await press("\r");
    expect(onKey).toHaveBeenCalledTimes(1);

    unmount();
  });
});
