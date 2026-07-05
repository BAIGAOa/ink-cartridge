import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import { ProgressBar } from '../../src/components/progress-bar/ProgressBar.js';
import { Divider } from '../../src/components/divider/Divider.js';

function Demo() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPct((p) => (p >= 100 ? 0 : p + 2));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>ProgressBar component demo</Text>
      <Box flexDirection="column" marginTop={1} gap={1}>
        <Box>
          <Text>Default: </Text>
          <ProgressBar percent={pct} />
        </Box>
        <Box>
          <Text>Green: </Text>
          <ProgressBar percent={pct} color="green" />
        </Box>
        <Box>
          <Text>Width 40: </Text>
          <ProgressBar percent={pct} width={40} />
        </Box>
        <Box>
          <Text>No percentage: </Text>
          <ProgressBar percent={pct} showPercent={false} />
        </Box>
        <Box>
          <Text>Custom chars: </Text>
          <ProgressBar percent={pct} char="■" emptyChar="·" />
        </Box>
        <Divider />
        <Box>
          <Text>Fixed 50%: </Text>
          <ProgressBar percent={50} />
        </Box>
        <Box>
          <Text>Fixed 0%: </Text>
          <ProgressBar percent={0} />
        </Box>
        <Box>
          <Text>Fixed 100%: </Text>
          <ProgressBar percent={100} />
        </Box>
      </Box>
    </Box>
  );
}

render(<Demo />);
