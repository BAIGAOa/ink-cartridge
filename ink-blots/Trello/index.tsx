/**
 * Trello Kanban — terminal kanban board built on ink-cartridge.
 *
 * Multi-screen (board list → board), overlay stacking (create/edit/move),
 * modal priority (delete confirm), and dense keyboard interaction.
 *
 * Run:
 *   npx tsx ink-blots/Trello/index.tsx
 */
import React, { useEffect, useState, useCallback } from 'react';
import { render, Box, Text } from 'ink';
import {
  registerComponent,
  ScenarioManagementProvider,
  CurrentScreen,
  KeyboardProvider,
  gotoScreen,
  useKeyboard,
} from '../../src/index.js';
import type { AppState, Card } from './types.js';
import { loadState, saveState } from './store.js';
import { AppContext } from './context.js';
import type { AppContextValue } from './context.js';
import BoardListScreen from './screens/BoardListScreen.js';
import BoardScreen from './screens/BoardScreen.js';
import CreateBoardOverlay from './overlays/CreateBoardOverlay.js';
import CreateCardOverlay from './overlays/CreateCardOverlay.js';
import EditCardOverlay from './overlays/EditCardOverlay.js';
import MoveCardOverlay from './overlays/MoveCardOverlay.js';
import ConfirmDeleteModal from './modals/ConfirmDeleteModal.js';
import SettingScreen from './setting/SettingScreen.js';

const DEFAULT_SETTINGS: AppState['settings'] = {
  confirmBeforeDelete: true,
  showKeyHints: true,
};

let nextId = 0;
function uid(): string {
  nextId += 1;
  return `id-${Date.now()}-${nextId}`;
}

/**
 * Global keyboard shortcuts registered once at the top level.
 * Uses `globalKeys` so these work from any screen or overlay.
 */
function GlobalKeysSetup() {
  const { globalKeys } = useKeyboard();
  useEffect(() => {
    globalKeys([
      {
        key: ['ctrl+,'], // Changed from ctrl+, — normalized form
        operate: () => gotoScreen(SettingScreen, {}),
        category: '*',
        affectOverlay: true,
      },
    ]);
    return () => globalKeys([]);
  }, [globalKeys]);
  return null;
}

function App() {
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    loadState().then(setState);
  }, []);

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  const updateState = useCallback((fn: (prev: AppState) => AppState) => {
    setState((prev) => prev ? fn(prev) : prev);
  }, []);

  const createBoard = useCallback((name: string) => {
    updateState((prev) => ({
      ...prev,
      boards: [...prev.boards, { id: uid(), name, columnIds: ['col-todo', 'col-doing', 'col-done'] }],
      columns: prev.columns.length > 0 ? prev.columns : [
        { id: 'col-todo', label: 'Todo', emoji: '📋' },
        { id: 'col-doing', label: 'Doing', emoji: '🔧' },
        { id: 'col-done', label: 'Done', emoji: '✅' },
      ],
    }));
  }, [updateState]);

  const createCard = useCallback((title: string, boardId: string, columnId: string) => {
    updateState((prev) => ({
      ...prev,
      cards: [...prev.cards, { id: uid(), title, description: '', boardId, columnId, createdAt: Date.now() }],
    }));
  }, [updateState]);

  const editCard = useCallback((cardId: string, title: string, description: string) => {
    updateState((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => (c.id === cardId ? { ...c, title, description } : c)),
    }));
  }, [updateState]);

  const deleteCard = useCallback((cardId: string) => {
    updateState((prev) => ({
      ...prev,
      cards: prev.cards.filter((c) => c.id !== cardId),
    }));
  }, [updateState]);

  const moveCard = useCallback((cardId: string, toColumnId: string) => {
    updateState((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => (c.id === cardId ? { ...c, columnId: toColumnId } : c)),
    }));
  }, [updateState]);

  const updateSettings = useCallback((patch: Partial<AppState['settings']>) => {
    updateState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  }, [updateState]);

  const ctx: AppContextValue = state
    ? { state, createBoard, createCard, editCard, deleteCard, moveCard, updateSettings }
    : { state: { boards: [], columns: [], cards: [], lastBoardId: null, settings: DEFAULT_SETTINGS }, createBoard, createCard, editCard, deleteCard, moveCard, updateSettings };

  return (
    <AppContext.Provider value={ctx}>
      <GlobalKeysSetup />
      {state ? <CurrentScreen /> : (
        <Box padding={1}><Text>Loading...</Text></Box>
      )}
    </AppContext.Provider>
  );
}



registerComponent(BoardListScreen, {});
registerComponent(BoardScreen, { boardId: '' }, { parent: BoardListScreen });
registerComponent(SettingScreen, {}, { parent: BoardListScreen });

registerComponent(CreateBoardOverlay, {});
registerComponent(CreateCardOverlay, { boardId: '', columnId: '', columns: [] });
registerComponent(EditCardOverlay, { card: null as unknown as Card });
registerComponent(MoveCardOverlay, { card: null as unknown as Card, columns: [] });

registerComponent(ConfirmDeleteModal, {
  title: '',
  message: '',
  confirmLabel: 'Delete',
  cancelLabel: 'Cancel',
  onConfirm: () => {},
  onCancel: () => {},
});

render(
  <ScenarioManagementProvider defaultScreen={BoardListScreen}>
    <KeyboardProvider>
      <App />
    </KeyboardProvider>
  </ScenarioManagementProvider>,
);
