import React from 'react';
import { render, Box, Text } from 'ink';
import { KeyHint } from '../../src/components/key-hint/KeyHint.js';
import { Divider } from '../../src/components/divider/Divider.js';

function Demo() {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>KeyHint component demo</Text>
      <Box flexDirection="column" marginTop={1} gap={1}>
        <Text>Menu shortcuts:</Text>
        <KeyHint keys={[
          { key: 's', desc: 'Start' },
          { key: 'l', desc: 'Load' },
          { key: 'q', desc: 'Quit' },
        ]} />
        <Divider />
        <Text>Editor shortcuts:</Text>
        <KeyHint keys={[
          { key: 'ctrl+s', desc: 'Save' },
          { key: 'ctrl+z', desc: 'Undo' },
          { key: 'ctrl+c', desc: 'Copy' },
          { key: 'ctrl+v', desc: 'Paste' },
        ]} />
        <Divider />
        <Text>Single key:</Text>
        <KeyHint keys={[
          { key: '?', desc: 'Help' },
        ]} />
      </Box>
    </Box>
  );
}

render(<Demo />);
