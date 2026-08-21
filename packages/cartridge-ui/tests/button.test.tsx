import React, { useState } from "react";
import { render } from "ink-testing-library";
import { Text } from "ink";
import { describe, expect, test, vi } from "vitest";
import {
  CurrentScreen,
  KeyboardProvider,
  registerComponent,
  ScenarioManagementProvider,
} from "ink-cartridge";
import { Button } from "../src/index.js";

let renders = 0;

function LoopProbe() {
  renders += 1;
  return (
    <Button keys={["return"]} callbacks={{ onClick: () => {} }}>
      <Text>Save</Text>
    </Button>
  );
}
registerComponent(LoopProbe, {});

describe("Button", () => {
  test("renders without an infinite layout loop", async () => {
    renders = 0;
    const instance = render(
      <ScenarioManagementProvider defaultScreen={LoopProbe} fullScreen>
        <KeyboardProvider mouse>
          <CurrentScreen />
        </KeyboardProvider>
      </ScenarioManagementProvider>,
    );
    // Regression: the ref-merge callback used to be recreated every render,
    // so React detached and re-attached the region ref on every commit; the
    // layout listener then observed the node mid-detach (empty metrics) and
    // setState'd "changed" metrics, re-rendering forever until React's
    // nested-update guard tripped. The loop is scheduler-driven (async), so
    // give it time to explode before asserting.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(renders).toBeLessThan(20);
    instance.unmount();
  });

  test("pressing a bound key fires onClick without focusId", async () => {
    const onClick = vi.fn();

    function KeyProbe() {
      return (
        <Button keys={["c"]} callbacks={{ onClick }}>
          <Text>Copy</Text>
        </Button>
      );
    }
    registerComponent(KeyProbe, {});

    const { stdin, unmount } = render(
      <ScenarioManagementProvider defaultScreen={KeyProbe} fullScreen>
        <KeyboardProvider mouse>
          <CurrentScreen />
        </KeyboardProvider>
      </ScenarioManagementProvider>,
    );

    stdin.write("c");
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(onClick).toHaveBeenCalledTimes(1);
    unmount();
  });

  test("pressing the key of a non-focused button stays silent", async () => {
    const saveClick = vi.fn();
    const deleteClick = vi.fn();

    function FocusProbe() {
      const [focused, setFocused] = useState("save");
      return (
        <>
          <Button
            keys={["return"]}
            focusId="save"
            callbacks={{ onClick: saveClick }}
          >
            <Text>Save</Text>
          </Button>
          <Button
            keys={["d"]}
            focusId="delete"
            callbacks={{ onClick: deleteClick }}
          >
            <Text>Delete</Text>
          </Button>
          <Text>focused: {focused}</Text>
        </>
      );
    }
    registerComponent(FocusProbe, {});

    const { stdin, unmount } = render(
      <ScenarioManagementProvider defaultScreen={FocusProbe} fullScreen>
        <KeyboardProvider mouse>
          <CurrentScreen />
        </KeyboardProvider>
      </ScenarioManagementProvider>,
    );

    // Enter fires Save (the focused target by default); d stays silent.
    stdin.write("\r");
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(saveClick).toHaveBeenCalledTimes(1);
    expect(deleteClick).not.toHaveBeenCalled();

    stdin.write("d");
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(deleteClick).not.toHaveBeenCalled();

    unmount();
  });
});
