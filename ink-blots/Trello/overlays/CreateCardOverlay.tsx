/**
 * Overlay: create a new card.
 */
import React, { useEffect, useState } from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { TextInput, closeOverlay } from '../../../src/index.js';
import { useKeyboard } from '../../../src/index.js';
import { useApp } from '../context.js';
import { centerOverlay } from '../layout.js';
import type { Column } from '../types.js';

const OVERLAY_W = 40;
const OVERLAY_H = 8;

interface Props {
  boardId: string;
  columnId: string;
  columns: Column[];
}

export default function CreateCardOverlay({ boardId, columnId }: Props) {
  const { createCard } = useApp();
  const { boundKeyboard } = useKeyboard();
  const [title, setTitle] = useState('');
  const { columns: cols, rows } = useWindowSize();
  const { top, left } = centerOverlay(cols, rows, OVERLAY_W, OVERLAY_H);

  useEffect(() => {
    return boundKeyboard(['escape'], () => closeOverlay('create-card'), {
      focusId: 'create-card-input',
    });
  }, [boundKeyboard]);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (trimmed) {
      createCard(trimmed, boardId, columnId);
      closeOverlay('create-card');
    }
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
      borderColor="green"
      padding={1}
    >
      <Text bold>➕ New Card</Text>
      <TextInput
        focusId="create-card-input"
        value={title}
        onChange={setTitle}
        onSubmit={handleSubmit}
        placeholder="Card title..."
      />
      <Text dimColor>Enter to create  ·  Esc to cancel</Text>
    </Box>
  );
}
