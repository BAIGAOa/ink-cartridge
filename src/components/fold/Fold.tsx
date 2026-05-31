import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useKeyboard, useFocusState } from '../../keyboard/index.js';
import type { FoldProps } from './types.js';

export function Fold({ focusId, label, preview, children, expanded, onToggle, defaultExpanded }: FoldProps) {
  const isControlled = expanded !== undefined;
  const [internalExpanded, setInternal] = useState(defaultExpanded ?? false);
  const isExpanded = isControlled ? expanded : internalExpanded;

  const isFocused = useFocusState(focusId);
  const { boundKeyboard, focusUnregister } = useKeyboard();

  const toggle = () => {
    if (isControlled) {
      onToggle?.();
    } else {
      setInternal((prev) => !prev);
    }
  };

  useEffect(() => {
    const unSpace = boundKeyboard([' '], () => toggle(), { focusId });
    return () => { unSpace(); focusUnregister(focusId); };
  }, [focusId]);

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={isFocused ? 'cyan' : 'grey'}>
          {isExpanded ? '▼ ' : '▶ '}
        </Text>
        <Text>
          {label}
        </Text>
      </Box>
      {isExpanded
        ? <Box>{children}</Box>
        : (preview ? <Box>{preview}</Box> : null)
      }
    </Box>
  );
}
