/**
 * Button Demo — one action entry point for mouse and keyboard.
 *
 * Three focus-scoped buttons (Enter / d / e) plus one un-focused button
 * whose key always fires:
 *   Save   — focusId 'save',   activates on Enter
 *   Delete — focusId 'delete', activates on d
 *   Edit   — focusId 'edit',   activates on e
 *   Copy   — no focusId,       activates on c — no focus constraint
 *
 * Controls:
 *   click a button — fires its onClick and forwards keyboard focus to it
 *   Enter / d / e  — fire the focused button's onClick (others stay silent)
 *   c              — always fires Copy
 *   q              — quit
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
  useFocusState,
  useKeyboard,
} from "ink-cartridge";
import { Button } from "../src/index.js";

function Demo() {
  const { boundKeyboard } = useKeyboard();
  const [last, setLast] = useState("(none)");

  useEffect(() => {
    return boundKeyboard(["q"], () => process.exit(0));
  }, [boundKeyboard]);

  // Focus markers: ● = the button currently holding keyboard focus.
  const saveFocused = useFocusState("save");
  const deleteFocused = useFocusState("delete");
  const editFocused = useFocusState("edit");

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Button demo — click a button, or press the focused key</Text>
      <Text dimColor>
        Enter: save · d: delete · e: edit · c: copy (always) · q: quit
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
