# Divider

A horizontal divider / separator line for terminal UIs. Supports an optional centered label.

## Install

```bash
npm install ink-cartridge
```

## Quick Start

```tsx
import React from 'react';
import { Box, Text, render } from 'ink';
import { Divider } from 'ink-cartridge';

function Demo() {
  return (
    <Box flexDirection="column">
      <Text>Section A</Text>
      <Divider />
      <Text>Section B</Text>
      <Divider label="OR" />
      <Text>Section C</Text>
    </Box>
  );
}

render(<Demo />);
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Optional centered text |
| `char` | `string` | `'─'` | Character used for the line |
| `width` | `number` | `50` | Total character width |

## Examples

### Simple divider

```tsx
<Divider />
```

### With label

```tsx
<Divider label="Section 2" />
```

### Custom character and width

```tsx
<Divider char="·" width={30} />
<Divider char="═" label="END" />
```

## License

MIT
