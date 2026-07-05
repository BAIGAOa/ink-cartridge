import React from 'react';
import { render, Box, Text } from 'ink';
import { Spinner } from '../../src/components/spinner/Spinner.js';
import { Divider } from '../../src/components/divider/Divider.js';

function Demo() {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Spinner component demo</Text>
      <Box flexDirection="column" marginTop={1} gap={1}>
        <Box>
          <Text>Default: </Text>
          <Spinner />
        </Box>
        <Box>
          <Text>With label: </Text>
          <Spinner label="Loading..." />
        </Box>
        <Box>
          <Text>Color: </Text>
          <Spinner color="green" label="Processing" />
        </Box>
        <Divider label="Animation style" />
        <Box>
          <Text>simple: </Text>
          <Spinner type="simple" />
        </Box>
        <Box>
          <Text>line: </Text>
          <Spinner type="line" />
        </Box>
        <Box>
          <Text>triangle: </Text>
          <Spinner type="triangle" />
        </Box>
        <Box>
          <Text>arc: </Text>
          <Spinner type="arc" />
        </Box>
        <Divider label="State" />
        <Box>
          <Text>active=false: </Text>
          <Spinner active={false} label="Done!" color="green" />
        </Box>
      </Box>
    </Box>
  );
}

render(<Demo />);
