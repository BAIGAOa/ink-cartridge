/**
 * Overlay: move a card to another column.
 */
import React, { useEffect } from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { SelectInput, closeOverlay } from '../../../src/index.js';
import { useKeyboard } from '../../../src/index.js';
import { useApp } from '../context.js';
import { centerOverlay } from '../layout.js';
import type { Card, Column } from '../types.js';

const OVERLAY_W = 36;
const OVERLAY_H = 10;

interface Props {
  card: Card;
  columns: Column[];
}

export default function MoveCardOverlay({ card, columns }: Props) {
  const { moveCard } = useApp();
  const { boundKeyboard } = useKeyboard();
  const { columns: cols, rows } = useWindowSize();
  const { top, left } = centerOverlay(cols, rows, OVERLAY_W, OVERLAY_H);

  useEffect(() => {
    return boundKeyboard(['escape'], () => closeOverlay('move-card'), {
      focusId: 'move-card-select',
    });
  }, [boundKeyboard]);

  const items = columns
    .filter((c) => c.id !== card.columnId)
    .map((c) => ({ label: `${c.emoji} ${c.label}`, value: c.id }));

  if (items.length === 0) {
    closeOverlay('move-card');
    return null;
  }

  const handleSelect = (item: { value: string }) => {
    moveCard(card.id, item.value);
    closeOverlay('move-card');
  };

  return (
    <Box
      position="absolute"
      top={top}
      left={left}
      width={OVERLAY_W}
      height={OVERLAY_H}
      flexDirection="column"
      borderStyle="round"
      borderColor="magenta"
      padding={1}
    >
      <Text bold>📦 Move "{card.title}"</Text>
      <SelectInput
        focusId="move-card-select"
        items={items}
        onSelect={handleSelect}
        limit={10}
      />
      <Text dimColor>Esc to cancel</Text>
    </Box>
  );
}
