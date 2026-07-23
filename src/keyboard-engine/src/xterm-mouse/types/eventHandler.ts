import type { MouseEventAction } from './action.js';
import type { ButtonType } from './button.js';
import type { MouseEvent, MouseEventBase } from './event.js';

/**
 * Extracts the base properties from MouseEvent and infers action-specific button types.
 * This creates discriminated unions based on the action type.
 *
 * For example:
 * - 'wheel' events always have button='wheel-*'
 * - 'move' events always have button='none'
 * - 'click' events are synthesized with specific button types
 * - 'drag' events have actual button types (not wheel buttons)
 */
export type EventByAction<T extends MouseEventAction> = (MouseEventBase &
  (T extends 'wheel'
    ? { button: 'wheel-up' | 'wheel-down' | 'wheel-left' | 'wheel-right'; action: T }
    : T extends 'move'
      ? { button: 'none'; action: T }
      : T extends 'click'
        ? {
            button: 'left' | 'middle' | 'right' | 'wheel-up' | 'wheel-down' | 'wheel-left' | 'wheel-right';
            action: T;
          }
        : T extends 'drag'
          ? {
              button: Exclude<ButtonType, 'none' | 'wheel-up' | 'wheel-down' | 'wheel-left' | 'wheel-right'>;
              action: T;
            }
          : T extends 'press' | 'release'
            ? { button: ButtonType; action: T }
            : never)) &
  Pick<MouseEvent, 'protocol'>;

/**
 * Type-safe event listener type that infers the event parameter type based on the event name.
 *
 * @example
 * ```ts
 * // Type of event is inferred as EventByAction<'press'>
 * const pressHandler: TypedEventListener<'press'> = (event) => {
 *   // TypeScript knows event.action === 'press'
 *   // and button can be any ButtonType
 *   console.log(event.button); // ButtonType
 * };
 *
 * // Type of event is inferred as EventByAction<'wheel'>
 * const wheelHandler: TypedEventListener<'wheel'> = (event) => {
 *   // TypeScript knows event.action === 'wheel'
 *   // and button is 'wheel-up' | 'wheel-down' | 'wheel-left' | 'wheel-right'
 *   console.log(event.button); // 'wheel-up' | 'wheel-down' | 'wheel-left' | 'wheel-right'
 * };
 * ```
 */
export type TypedEventListener<T extends MouseEventAction> = (event: EventByAction<T>) => void;

/**
 * Error event listener type (for the 'error' event).
 */
export type ErrorEventListener = (error: Error) => void;

/**
 * Maps event names to their specific event types.
 *
 * This utility type enables the `on()` and `off()` methods to provide
 * accurate type inference for event handler parameters.
 *
 * @example
 * ```ts
 * type WheelEvent = EventHandlerTypeMap['wheel'];
 * // WheelEvent is EventByAction<'wheel'> which has:
 * // action: 'wheel'
 * // button: 'wheel-up' | 'wheel-down' | 'wheel-left' | 'wheel-right'
 * ```
 */
export type EventHandlerTypeMap = {
  [K in MouseEventAction]: EventByAction<K>;
} & { error: Error };

/**
 * Extracts the listener type for a given event name.
 *
 * @example
 * ```ts
 * type PressListener = ListenerFor<'press'>;
 * // PressListener is (event: EventByAction<'press'>) => void
 *
 * type ErrorListener = ListenerFor<'error'>;
 * // ErrorListener is (error: Error) => void
 * ```
 */
export type ListenerFor<T extends MouseEventAction | 'error'> = T extends MouseEventAction
  ? TypedEventListener<T>
  : ErrorEventListener;

/**
 * Extracts the event type for a given event name.
 *
 * @example
 * ```ts
 * type MoveEventType = EventTypeFor<'move'>;
 * // MoveEventType is EventByAction<'move'> (button: 'none', action: 'move')
 *
 * type ErrorEventType = EventTypeFor<'error'>;
 * // ErrorEventType is Error
 * ```
 */
export type EventTypeFor<T extends MouseEventAction | 'error'> = T extends MouseEventAction ? EventByAction<T> : Error;
