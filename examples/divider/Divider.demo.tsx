import React from 'react';
import { render, Box, Text } from 'ink';
import { Divider } from '../../src/components/divider/Divider.js';

function Demo() {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Divider component demo</Text>
      <Box flexDirection="column" marginTop={1} gap={1}>
        <Text>Default divider:</Text>
        <Divider />
        <Divider />
        <Text>With label:</Text>
        <Divider label="OR" />
        <Text>Custom character:</Text>
        <Divider char="·" />
        <Text>Custom width:</Text>
        <Divider width={20} />
        <Text>Label + custom character:</Text>
        <Divider label="END" char="═" />
      </Box>
    </Box>
  );
}

render(<Demo />);
