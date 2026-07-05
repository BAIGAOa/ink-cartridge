import React, { useState } from 'react';
import { render, Box, Text } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
} from '../../src/index.js';
import { SearchInput } from '../../src/components/search-input/SearchInput.js';
import { Divider } from '../../src/components/divider/Divider.js';
import { KeyHint } from '../../src/components/key-hint/KeyHint.js';

function Demo() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>SearchInput component demo</Text>

      <Box flexDirection="column" marginTop={1} gap={1}>
        <Box>
          <Text>Search: </Text>
          <SearchInput
            focusId="search"
            value={query}
            onChange={setQuery}
            placeholder="Type to search..."
            onSubmit={(v) => setSubmitted(v)}
          />
        </Box>
      </Box>

      <Divider />

      <Box flexDirection="column">
        <Text>Current: [{query}]</Text>
        <Text>Submitted: [{submitted}]</Text>
      </Box>

      <Divider />

      <KeyHint keys={[
        { key: 'Esc', desc: 'Clear' },
        { key: 'Enter', desc: 'Submit' },
      ]} />
    </Box>
  );
}

registerComponent(Demo, {});

render(
  <ScenarioManagementProvider defaultScreen={Demo}>
    <KeyboardProvider>
      <CurrentScreen />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
