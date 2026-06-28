/**
 * App-wide context — separated from index.tsx to avoid circular imports
 * when screens and overlays need to useApp().
 */
import { createContext, useContext } from 'react';
import type { AppState, Board, Card, Column } from './types.js';

export interface AppContextValue {
  state: AppState;
  createBoard: (name: string) => void;
  createCard: (title: string, boardId: string, columnId: string) => void;
  editCard: (cardId: string, title: string, description: string) => void;
  deleteCard: (cardId: string) => void;
  moveCard: (cardId: string, toColumnId: string) => void;
  updateSettings: (patch: Partial<AppState['settings']>) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('[Trello] AppContext not found — wrap in App component');
  return ctx;
}
