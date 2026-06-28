/**
 * Shared types for the Trello kanban app.
 */

export interface Card {
  /** Unique card ID */
  id: string;
  /** Card title */
  title: string;
  /** Optional longer description */
  description: string;
  /** Which board this card belongs to */
  boardId: string;
  /** Which column this card belongs to */
  columnId: string;
  /** Creation timestamp */
  createdAt: number;
}

export interface Column {
  /** Unique column ID */
  id: string;
  /** Display label, e.g. "Todo", "Doing", "Done" */
  label: string;
  /** Visual indicator */
  emoji: string;
}

export interface Board {
  /** Unique board ID */
  id: string;
  /** Board name */
  name: string;
  /** Ordered column IDs */
  columnIds: string[];
}

/** Application-wide settings persisted alongside board data. */
export interface Settings {
  /** Show confirm dialog before deleting a card */
  confirmBeforeDelete: boolean;
  /** Show key shortcut hints at the bottom of the board */
  showKeyHints: boolean;
}

/** Full application state persisted to disk */
export interface AppState {
  boards: Board[];
  columns: Column[];
  cards: Card[];
  /** ID of the board to show on startup (null = board list) */
  lastBoardId: string | null;
  /** App-wide settings */
  settings: Settings;
}
