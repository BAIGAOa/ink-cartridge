/**
 * In-memory storage layer for the Trello kanban app.
 *
 * Since the storage subsystem was removed from ink-cartridge (it was not
 * a TUI concern), state is kept in memory and reset on restart.
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

const defaultState: AppState = {
  boards: [DEFAULT_BOARD],
  columns: DEFAULT_COLUMNS,
  cards: [],
  lastBoardId: 'board-default',
  settings: { confirmBeforeDelete: true, showKeyHints: true },
};

let state: AppState = { ...defaultState, boards: [{ ...DEFAULT_BOARD }], columns: [...DEFAULT_COLUMNS] };

export async function loadState(): Promise<AppState> {
  return state;
}

export async function saveState(newState: AppState): Promise<void> {
  state = newState;
}
