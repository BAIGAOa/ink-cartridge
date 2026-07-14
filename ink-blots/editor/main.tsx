/**
 * Markdown Editor — multi-line text editor built on ink-cartridge.
 *
 * Run:
 *   npx tsx ink-blots/editor/main.tsx
 */
import React, { useState } from 'react';
import { render, Box, Text, useWindowSize } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
} from '../../src/index.js';
import Editor from './comp/Editor.js';


function EditorScreen() {
  const [text, setText] = useState('');

  const handleSubmit = (value: string) => {
    // TODO: save to file
  };

  const {rows} = useWindowSize()

  return (
    <Box flexDirection="column" padding={1}>
      <Box
        marginTop={1}
        borderStyle="round"
        borderColor="white"
        paddingX={1}
        height='100%'
        width='100%'
      >
        <Editor
          focusId="editor-main"
          value={text}
          onChange={setText}
          height={rows}
        />
      </Box>
    </Box>
  );
}

registerComponent(EditorScreen, {});

render(
  <ScenarioManagementProvider defaultScreen={EditorScreen} fullScreen>
    <KeyboardProvider>
      <CurrentScreen />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
