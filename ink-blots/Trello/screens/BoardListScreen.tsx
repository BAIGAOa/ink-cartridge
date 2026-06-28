/**
 * BoardListScreen — first screen: select or create a board.
 */
import React, { useEffect } from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { SelectInput, openOverlay, skip } from '../../../src/index.js';
import { useKeyboard } from '../../../src/index.js';
import { useApp } from '../context.js';
import BoardScreen from './BoardScreen.js';
import CreateBoardOverlay from '../overlays/CreateBoardOverlay.js';

export default function BoardListScreen() {
  const { state } = useApp();
  const { boundKeyboard } = useKeyboard();
  const { rows } = useWindowSize();

  useEffect(() => {
    return boundKeyboard(['n'], () => {
      openOverlay('create-board', CreateBoardOverlay, {});
    }, { focusId: 'board-list' });
  }, [boundKeyboard]);

  const handleSelect = (item: { value: string }) => {
    skip(BoardScreen, { boardId: item.value });
  };

  const items = state.boards.map((b) => ({ label: `📌 ${b.name}`, value: b.id }));

  return (
    <Box flexDirection="column" padding={1} height={rows} width="100%">
      <Text bold>📋 Boards</Text>
      <Text dimColor>Enter to open  ·  n to create  ·  Ctrl+C to quit</Text>

      {items.length === 0 ? (
        <Text color="yellow">No boards yet. Press n to create one.</Text>
      ) : (
        <SelectInput
          focusId="board-list"
          items={items}
          onSelect={handleSelect}
          limit={10}
        />
      )}
    </Box>
  );
}
