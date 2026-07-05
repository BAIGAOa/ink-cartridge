import type React from "react";

export interface SearchBarProps {
  /** Focus identifier for the keyboard system */
  focusId: string;

  /**
   * Input area width in characters. When omitted, auto-detected from
   * terminal dimensions (columns - 4 for border + prompt).
   */
  width?: number;

  /** Items to search through. Filtered and sorted as the user types. */
  items?: string[];

  /**
   * Called when the user confirms a selection (Enter on a highlighted
   * result, or Enter on typed text when no results match).
   */
  onSubmit?: (value: string) => void;

  /**
   * Maximum visible results before virtual scrolling kicks in.
   * @default 10
   */
  maxVisibleResults?: number;

  /**
   * Custom component for rendering a single result item.
   * Receives the item string and whether it is currently highlighted.
   */
  resultComponent?: React.ComponentType<{
    item: string;
    isSelected: boolean;
  }>;

  /**
   * Custom indicator rendered before each result row.
   * Receives whether that row is currently highlighted.
   */
  indicatorComponent?: React.ComponentType<{
    isSelected: boolean;
  }>;
}