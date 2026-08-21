/**
 * Button Demo — mouse click fires each button's onClick.
 *
 * Four buttons:
 *   Save, Delete, Edit, Copy — click to fire its onClick
 *
 * Controls:
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
      <Text bold>Button demo — click a button</Text>

      <Box flexDirection="column" marginTop={1} width={40}>
        <Box>
          <Box borderStyle="round" width={10}>
            <Button
              callbacks={{ onClick: () => setLast("Save") }}
            >
              <Text>Save</Text>
            </Button>
          </Box>
        </Box>
        <Box marginTop={1}>
          <Box borderStyle="round" width={10}>
            <Button
              callbacks={{ onClick: () => setLast("Delete") }}
            >
              <Text>Delete</Text>
            </Button>
          </Box>
        </Box>
        <Box marginTop={1}>
          <Box borderStyle="round" width={10}>
            <Button
              callbacks={{ onClick: () => setLast("Edit") }}
            >
              <Text>Edit</Text>
            </Button>
          </Box>
        </Box>
        <Box marginTop={1}>
          <Box borderStyle="round" width={10}>
            <Button
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
