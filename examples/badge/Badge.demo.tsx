import React from 'react';
import { render, Box, Text } from 'ink';
import { Badge } from '../../src/components/badge/Badge.js';

function Demo() {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Badge component demo</Text>
      <Box flexDirection="column" marginTop={1} gap={1}>
        <Box>
          <Text>Default (cyan): </Text>
          <Badge>New</Badge>
        </Box>
        <Box>
          <Text>Green: </Text>
          <Badge color="green">Success</Badge>
        </Box>
        <Box>
          <Text>Red: </Text>
          <Badge color="red">Error</Badge>
        </Box>
        <Box>
          <Text>Yellow: </Text>
          <Badge color="yellow">Warning</Badge>
        </Box>
        <Box>
          <Text>Blue: </Text>
          <Badge color="blue">Info</Badge>
        </Box>
        <Box>
          <Text>Multiple: </Text>
          <Badge color="green">Build</Badge>
          <Badge color="yellow">Test</Badge>
          <Badge color="red">Lint</Badge>
        </Box>
      </Box>
    </Box>
  );
}

render(<Demo />);
