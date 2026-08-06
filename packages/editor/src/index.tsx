#!/usr/bin/env node
import { Box, render } from "ink";
import React from "react";
import { InformationBar } from "./view/information-bar.js";
import {
  CurrentScreen,
  KeyboardProvider,
  registerComponent,
  ScenarioManagementProvider,
} from "ink-cartridge";
import { Editor } from "./view/editor.js";

function App() {
  return (
    <Box flexDirection="column" height="100%" width="100%">
      <Box flexGrow={1}>
        <InformationBar mode="NONE" />
      </Box>
      <Box height="100%" width="100%">
        <Editor value="你好" onChance={() => {}} />
      </Box>
    </Box>
  );
}

registerComponent(App, {});

render(
  <ScenarioManagementProvider defaultScreen={App} fullScreen>
    <KeyboardProvider autoTab={false} mouse>
      <CurrentScreen />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
