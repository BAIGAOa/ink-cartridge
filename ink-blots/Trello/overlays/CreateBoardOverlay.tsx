/**
 * Overlay: create a new board.
 */
import React, { useEffect, useState } from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { TextInput, closeOverlay } from '../../../src/index.js';
import { useKeyboard } from '../../../src/index.js';
import { useApp } from '../context.js';
import { centerOverlay } from '../layout.js';

const OVERLAY_W = 36;
const OVERLAY_H = 6;

export default function CreateBoardOverlay() {
  const { createBoard } = useApp();
  const { boundKeyboard } = useKeyboard();
  const [name, setName] = useState('');
  const { columns, rows } = useWindowSize();
  const { top, left } = centerOverlay(columns, rows, OVERLAY_W, OVERLAY_H);

  useEffect(() => {
    return boundKeyboard(['escape'], () => closeOverlay('create-board'), {
      focusId: 'create-board-input',
    });
  }, [boundKeyboard]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (trimmed) {
      createBoard(trimmed);
      closeOverlay('create-board');
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
      borderColor="cyan"
      padding={1}
    >
      <Text bold>➕ Create Board</Text>
      <TextInput
        focusId="create-board-input"
        value={name}
        onChange={setName}
        onSubmit={handleSubmit}
        placeholder="Board name..."
      />
      <Text dimColor>Enter to confirm  ·  Esc to cancel</Text>
    </Box>
  );
}
