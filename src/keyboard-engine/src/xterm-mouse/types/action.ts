/**
 * Represents the type of mouse action that occurred.
 *
 * Action types describe the state change or interaction that triggered the event.
 *
 * | Action | Description |
 * |--------|-------------|
 * | `'move'` | Mouse moved without any button pressed |
 * | `'press'` | A mouse button was pressed down |
 * | `'release'` | A mouse button was released |
 * | `'drag'` | Mouse moved while a button was held down |
 * | `'wheel'` | Mouse wheel was scrolled |
 * | `'click'` | A button was pressed and released within the threshold distance (synthesized event) |
 */
export type MouseEventAction = 'move' | 'release' | 'press' | 'drag' | 'wheel' | 'click';
