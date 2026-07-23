import type { MouseEventAction } from './action.js';
import type { ButtonType } from './button.js';

/**
 * Base interface for all mouse event types.
 *
 * This interface contains the common properties shared across all mouse events,
 * regardless of the protocol used to encode them.
 *
 * @property x - The x-coordinate (column) of the mouse position (1-indexed)
 * @property y - The y-coordinate (row) of the mouse position (1-indexed)
 * @property button - The button that triggered the event
 * @property action - The type of action that occurred
 * @property shift - Whether the Shift key was held during the event
 * @property alt - Whether the Alt key was held during the event
 * @property ctrl - Whether the Ctrl key was held during the event
 * @property raw - The raw button code from the terminal protocol
 * @property data - The raw ANSI escape sequence data received from the terminal
 */
export type MouseEventBase = {
  x: number;
  y: number;
  button: ButtonType;
  action: MouseEventAction;
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  raw: number;
  data: string;
};

/**
 * A mouse event using the SGR (Select Graphic Rendition) protocol.
 *
 * The SGR protocol is the modern, preferred encoding for terminal mouse events.
 * It uses the format `ESC[<Cb;Cx;CyM` (press) or `ESC[<Cb;Cx;Cym` (release),
 * where the terminator character ('M' or 'm') distinguishes press from release.
 *
 * Advantages over the legacy ESC protocol:
 * - Supports coordinates beyond 223 (practically unlimited)
 * - Clearer encoding of button state and actions
 * - Better support for modern terminal features
 *
 * @example
 * ```ts
 * if (event.protocol === 'SGR') {
 *   // This is an SGR event with high-precision coordinates
 *   console.log(`Position: ${event.x}, ${event.y}`);
 * }
 * ```
 */
export type SGRMouseEvent = MouseEventBase & {
  protocol: 'SGR';
};

/**
 * A mouse event using the legacy ESC (escape sequence) protocol.
 *
 * The ESC protocol is the original mouse encoding scheme for terminals.
 * It uses the format `ESCCbCxCyM` where coordinates are encoded as
 * characters (code + 32) and button/action state is packed into a single byte.
 *
 * Limitations compared to SGR:
 * - Maximum coordinate value of 223 (0-indexed: 222) - some terminals limit to 95
 * - Less clear encoding of button state and release events
 * - No dedicated release encoding (release is inferred from button code 3)
 *
 * Despite limitations, this protocol is still widely supported by older terminals
 * and is used as a fallback when SGR is not available.
 *
 * @example
 * ```ts
 * if (event.protocol === 'ESC') {
 *   // This is an ESC event with potential coordinate limitations
 *   if (event.x > 95) {
 *     console.warn('Coordinates may be truncated on some terminals');
 *   }
 * }
 * ```
 */
export type ESCMouseEvent = MouseEventBase & {
  protocol: 'ESC';
};

/**
 * A discriminated union representing any mouse event from either protocol.
 *
 * This type combines both SGR and ESC mouse event types. The `protocol` property
 * serves as a discriminant that allows TypeScript to narrow the type.
 *
 * @example
 * ```ts
 * mouse.on('press', (event: MouseEvent) => {
 *   if (event.protocol === 'SGR') {
 *     // TypeScript knows this is SGRMouseEvent
 *     console.log('Using modern SGR protocol');
 *   } else {
 *     // TypeScript knows this is ESCMouseEvent
 *     console.log('Using legacy ESC protocol');
 *   }
 * });
 * ```
 */
export type MouseEvent = SGRMouseEvent | ESCMouseEvent;
