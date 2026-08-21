/**
 * Button Demo — one action entry point for mouse and keyboard.
 *
 * Four buttons, each with its own key that fires onClick:
 *   Save   — activates on Enter
 *   Delete — activates on d
 *   Edit   — activates on e
 *   Copy   — activates on c
 *
 * Controls:
 *   press a button's key — fires its onClick
 *   click a button — fires its onClick
 *   q — quit
 *
 * Run:
 *   npx tsx packages/cartridge-ui/examples/Button.tsx
 */
import React, { useEffect, useState } from "react";
import { render, Box, Text } from "ink";
import {
  CurrentScreen,
  KeyboardProvider,
  registerComponent,
  ScenarioManagementProvider,
  useKeyboard,
} from "ink-cartridge";
import { Button } from "../src/index.js";

function Demo() {
  const { boundKeyboard } = useKeyboard();
  const [last, setLast] = useState("(none)");

  useEffect(() => {
    return boundKeyboard(["q"], () => process.exit(0));
  }, [boundKeyboard]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Button demo — click a button, or press its key</Text>
      <Text dimColor>
        Enter: save · d: delete · e: edit · c: copy · q: quit
      </Text>

      <Box flexDirection="column" marginTop={1} width={40}>
        <Box>
          <Box borderStyle="round">
            <Button
              keys={["return"]}
              callbacks={{ onClick: () => setLast("Save") }}
            >
              <Text>Save</Text>
            </Button>
          </Box>
        </Box>
        <Box marginTop={1}>
          <Box borderStyle="round">
            <Button
              keys={["d"]}
              callbacks={{ onClick: () => setLast("Delete") }}
            >
              <Text>Delete</Text>
            </Button>
          </Box>
        </Box>
        <Box marginTop={1}>
          <Box borderStyle="round">
            <Button
              keys={["e"]}
              callbacks={{ onClick: () => setLast("Edit") }}
            >
              <Text>Edit</Text>
            </Button>
          </Box>
        </Box>
        <Box marginTop={1}>
          <Box borderStyle="round">
            <Button
              keys={["c"]}
              callbacks={{ onClick: () => setLast("Copy") }}
            >
              <Text>Copy</Text>
            </Button>
          </Box>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text>Last action: {last}</Text>
      </Box>
    </Box>
  );
}

registerComponent(Demo, {});

render(
  <ScenarioManagementProvider defaultScreen={Demo} fullScreen>
    <KeyboardProvider mouse>
      <CurrentScreen />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
