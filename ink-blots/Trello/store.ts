/**
 * Storage layer for the Trello kanban app.
 *
 * Uses ink-cartridge's createStorage for atomic, type-safe JSON persistence.
 * Data lives in ~/.trello-kanban/ to avoid polluting the project directory.
 */
import { createStorage } from '../../src/index.js';
import type { StorageAPI } from '../../src/index.js';
import type { AppState } from './types.js';
import * as os from 'node:os';
import * as path from 'node:path';

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

let storageInstance: StorageAPI | null = null;

function getStorage(): StorageAPI {
  if (!storageInstance) {
    storageInstance = createStorage({
      dir: path.join(os.homedir(), '.trello-kanban'),
      file: 'data.json',
    });
  }
  return storageInstance;
}

/** Load full application state, initialising defaults on first run. */
export async function loadState(): Promise<AppState> {
  const storage = getStorage();
  const has = await storage.has('state');
  if (!has) {
    const initial: AppState = {
      boards: [DEFAULT_BOARD],
      columns: DEFAULT_COLUMNS,
      cards: [],
      lastBoardId: 'board-default',
      settings: { confirmBeforeDelete: true, showKeyHints: true },
    };
    await storage.write.obj('state', initial);
    return initial;
  }
  return storage.read.obj<AppState>('state', DEFAULT_BOARD as unknown as AppState);
}

/** Persist full application state. */
export async function saveState(state: AppState): Promise<void> {
  const storage = getStorage();
  await storage.write.obj('state', state);
}
