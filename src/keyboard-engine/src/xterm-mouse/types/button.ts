type NoneButton = 'none';

/**
 * Represents a mouse button identifier.
 *
 * Button types indicate which physical mouse button or wheel action triggered an event.
 *
 * | Button | Description |
 * |--------|-------------|
 * | `'none'` | No button pressed (used for movement events) |
 * | `'left'` | Primary (left) mouse button |
 * | `'middle'` | Middle mouse button (often the scroll wheel click) |
 * | `'right'` | Secondary (right) mouse button |
 * | `'wheel-up'` | Mouse wheel scrolled up/away from user |
 * | `'wheel-down'` | Mouse wheel scrolled down/toward user |
 * | `'wheel-left'` | Mouse wheel scrolled left (horizontal scroll) |
 * | `'wheel-right'` | Mouse wheel scrolled right (horizontal scroll) |
 * | `'back'` | Back button (typically side button on mice with 5+ buttons) |
 * | `'forward'` | Forward button (typically side button on mice with 5+ buttons) |
 * | `'unknown'` | Unknown button type (fallback for unrecognized codes) |
 */
export type ButtonType =
  | NoneButton
  | 'left'
  | 'middle'
  | 'right'
  | 'wheel-up'
  | 'wheel-down'
  | 'wheel-left'
  | 'wheel-right'
  | 'back'
  | 'forward'
  | 'unknown';
