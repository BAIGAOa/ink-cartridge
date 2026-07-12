/**
 * In-memory state store for the Trello kanban app.
 *
 * Note: Originally used ink-cartridge's createStorage for JSON persistence.
 * Replaced with an in-memory store after storage was removed from the library.
 * To add persistence back, use node:fs directly or a third-party storage library.
 */
import type { AppState } from './types.js';

const DEFAULT_COLUMNS = [
  { id: 'col-todo', label: 'Todo', emoji: '📋' },
  { id: 'col-doing', label: 'Doing', emoji: '🔧' },
  { id: 'col-done', label: 'Done', emoji: '✅' },
];

const DEFAULT_BOARD: AppState['boards'][number] = {
  id: 'board-default',
  name: 'My Board',
  columnIds: ['col-todo', 'col-doing', 'col-done'],
};

const initialState: AppState = {
  boards: [DEFAULT_BOARD],
  columns: DEFAULT_COLUMNS,
  cards: [],
  lastBoardId: 'board-default',
  settings: { confirmBeforeDelete: true, showKeyHints: true },
};

let currentState: AppState = { ...initialState };

/** Load full application state. */
export async function loadState(): Promise<AppState> {
  return { ...currentState };
}

/** Persist full application state. */
export async function saveState(state: AppState): Promise<void> {
  currentState = { ...state };
}
