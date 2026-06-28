/**
 * Overlay: edit an existing card.
 */
import React, { useEffect, useState } from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { TextInput, closeOverlay } from '../../../src/index.js';
import { useKeyboard } from '../../../src/index.js';
import { useApp } from '../context.js';
import { centerOverlay } from '../layout.js';
import type { Card } from '../types.js';

const OVERLAY_W = 50;
const OVERLAY_H = 12;

interface Props {
  card: Card;
}

export default function EditCardOverlay({ card }: Props) {
  const { editCard } = useApp();
  const { boundKeyboard } = useKeyboard();
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const { columns: cols, rows } = useWindowSize();
  const { top, left } = centerOverlay(cols, rows, OVERLAY_W, OVERLAY_H);

  useEffect(() => {
    return boundKeyboard(['escape'], () => closeOverlay('edit-card'), {
      focusId: 'edit-card-title',
    });
  }, [boundKeyboard]);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (trimmed) {
      editCard(card.id, trimmed, description.trim());
      closeOverlay('edit-card');
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
      borderColor="yellow"
      padding={1}
    >
      <Text bold>✏️  Edit Card</Text>

      <Text>Title:</Text>
      <TextInput
        focusId="edit-card-title"
        value={title}
        onChange={setTitle}
        onSubmit={handleSubmit}
        placeholder="Card title..."
      />

      <Text>Description:</Text>
      <TextInput
        focusId="edit-card-desc"
        value={description}
        onChange={setDescription}
        onSubmit={handleSubmit}
        placeholder="Description (optional)..."
      />

      <Text dimColor>Enter to save  ·  Esc to cancel</Text>
    </Box>
  );
}
