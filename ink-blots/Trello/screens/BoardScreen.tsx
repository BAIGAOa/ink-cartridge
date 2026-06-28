/**
 * BoardScreen — kanban board with columns and cards.
 *
 * Keyboard:
 *   Esc — back to board list
 *   Tab/Shift+Tab — cycle focus through cards
 *   n — create card in active column
 *   e — edit selected card
 *   d — delete selected card (modal confirm)
 *   m — move selected card to another column
 */
import React, { useEffect, useState, useRef } from 'react';
import { Box, Text, useWindowSize } from 'ink';
import {
  back,
  openOverlay,
  closeOverlay,
  openModal,
  closeModal,
  useKeyboard,
  useFocusState,
} from '../../../src/index.js';
import { useApp } from '../context.js';
import type { Card, Column } from '../types.js';
import CreateCardOverlay from '../overlays/CreateCardOverlay.js';
import EditCardOverlay from '../overlays/EditCardOverlay.js';
import MoveCardOverlay from '../overlays/MoveCardOverlay.js';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal.js';

interface Props {
  boardId: string;
}

export default function BoardScreen({ boardId }: Props) {
  const { state, createCard, editCard, deleteCard, moveCard } = useApp();
  const { boundKeyboard, focusCurrent } = useKeyboard();
  const { rows } = useWindowSize();

  const board = state.boards.find((b) => b.id === boardId);
  const columns = state.columns;
  const cards = state.cards.filter((c) => c.boardId === boardId);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState(columns[0]?.id ?? '');

  // Stable refs for callbacks used inside keyboard bindings
  const selectedCardIdRef = useRef(selectedCardId);
  selectedCardIdRef.current = selectedCardId;
  const activeColumnIdRef = useRef(activeColumnId);
  activeColumnIdRef.current = activeColumnId;
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const settingsRef = useRef(state.settings);
  settingsRef.current = state.settings;

  // Esc → back
  useEffect(() => {
    return boundKeyboard(['escape'], () => back(), {});
  }, [boundKeyboard]);

  // n → create card
  useEffect(() => {
    return boundKeyboard(['n'], () => {
      openOverlay('create-card', CreateCardOverlay, {
        boardId,
        columnId: activeColumnIdRef.current,
        columns,
      });
    });
  }, [boundKeyboard, columns, boardId]);

  // e → edit card
  useEffect(() => {
    return boundKeyboard(['e'], () => {
      const id = selectedCardIdRef.current;
      if (!id) return;
      const card = cardsRef.current.find((c) => c.id === id);
      if (!card) return;
      openOverlay('edit-card', EditCardOverlay, { card });
    });
  }, [boundKeyboard]);

  // d → delete card
  useEffect(() => {
    return boundKeyboard(['d'], () => {
      const id = selectedCardIdRef.current;
      if (!id) return;
      const card = cardsRef.current.find((c) => c.id === id);
      if (!card) return;

      if (!settingsRef.current.confirmBeforeDelete) {
        deleteCard(id);
        setSelectedCardId(null);
        return;
      }

      openModal('confirm-delete', ConfirmDeleteModal, {
        title: 'Delete Card',
        message: `Delete "${card.title}"?`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        onConfirm: () => {
          deleteCard(id);
          setSelectedCardId(null);
          closeModal('confirm-delete');
        },
        onCancel: () => closeModal('confirm-delete'),
      });
    });
  }, [boundKeyboard, deleteCard]);

  // m → move card
  useEffect(() => {
    return boundKeyboard(['m'], () => {
      const id = selectedCardIdRef.current;
      if (!id) return;
      const card = cardsRef.current.find((c) => c.id === id);
      if (!card) return;
      openOverlay('move-card', MoveCardOverlay, { card, columns });
    });
  }, [boundKeyboard, columns]);

  // Poll focus to track selected card and active column
  useEffect(() => {
    const iv = setInterval(() => {
      const current = focusCurrent();
      if (!current) return;
      if (current.startsWith('card-')) {
        const id = current.replace('card-', '');
        setSelectedCardId(id);
        const card = cardsRef.current.find((c) => c.id === id);
        if (card) setActiveColumnId(card.columnId);
      }
      for (const col of columns) {
        if (current === `col-header-${col.id}`) {
          setActiveColumnId(col.id);
          setSelectedCardId(null);
        }
      }
    }, 50);
    return () => clearInterval(iv);
  }, [focusCurrent, columns]);

  if (!board) {
    return (
      <Box padding={1} height={rows} width="100%">
        <Text>Board not found. Press Esc to go back.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} height={rows} width="100%">
      <Box>
        <Text bold>📋 {board.name}</Text>
        <Text dimColor>  ·  Esc to go back</Text>
      </Box>

      <Box marginTop={1} gap={2}>
        {columns.map((col) => {
          const colCards = cards.filter((c) => c.columnId === col.id);
          return (
            <ColumnView
              key={col.id}
              column={col}
              cards={colCards}
              isActive={col.id === activeColumnId}
            />
          );
        })}
      </Box>

      {state.settings.showKeyHints && (
        <Box marginTop={1}>
          <Text dimColor>
            n:new  e:edit  d:delete  m:move  Tab:next  Ctrl+,:settings
          </Text>
        </Box>
      )}
    </Box>
  );
}

function ColumnView({
  column,
  cards,
  isActive,
}: {
  column: Column;
  cards: Card[];
  isActive: boolean;
}) {
  return (
    <Box
      flexDirection="column"
      width={24}
      borderStyle="round"
      borderColor={isActive ? 'cyan' : 'gray'}
      paddingX={1}
    >
      <Text bold color={isActive ? 'cyan' : undefined}>
        {column.emoji} {column.label} ({cards.length})
      </Text>

      {cards.map((card) => (
        <CardItem key={card.id} card={card} />
      ))}

      {cards.length === 0 && <Text dimColor>  (empty)</Text>}
    </Box>
  );
}

function CardItem({ card }: { card: Card }) {
  const isFocused = useFocusState(`card-${card.id}`);
  const { boundKeyboard, focusUnregister } = useKeyboard();
  const focusIdRef = useRef(`card-${card.id}`);
  focusIdRef.current = `card-${card.id}`;

  // Clean up focus target on unmount — separate from the keyboard
  // binding effect so it only runs once, not on every card.id change.
  useEffect(() => {
    return () => focusUnregister(focusIdRef.current);
  }, []);

  // Register the focus target so Tab can cycle to this card.
  // Without this, useFocusState alone does NOT register the target.
  useEffect(() => {
    return boundKeyboard(['return'], () => {}, { focusId: `card-${card.id}` });
  }, [boundKeyboard, card.id]);

  return (
    <Box
      flexDirection="column"
      marginY={1}
      paddingX={1}
      borderStyle={isFocused ? 'single' : undefined}
      borderColor={isFocused ? 'yellow' : undefined}
    >
      <Text bold={isFocused}>{card.title || '(untitled)'}</Text>
      {card.description ? (
        <Text dimColor>
          {card.description.length > 30
            ? card.description.slice(0, 30) + '…'
            : card.description}
        </Text>
      ) : null}
    </Box>
  );
}
