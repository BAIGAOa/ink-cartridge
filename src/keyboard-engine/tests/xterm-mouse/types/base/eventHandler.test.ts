import { describe, expect, test } from 'vitest';
import { Mouse } from '../../../../src/xterm-mouse/core/Mouse.js';
import type { EventByAction, EventTypeFor, ListenerFor, TypedEventListener } from '../../../../src/xterm-mouse/types/eventHandler.js';

describe('Type Inference Utilities', () => {
  describe('EventByAction', () => {
    test('should infer correct types for wheel events', () => {
      // Arrange
      const wheelEvent: EventByAction<'wheel'> = {
        x: 10,
        y: 20,
        button: 'wheel-up',
        action: 'wheel',
        shift: false,
        alt: false,
        ctrl: false,
        raw: 64,
        data: '\x1b[<64;10;20M',
        protocol: 'SGR',
      };

      // Assert
      expect(wheelEvent.action).toBe('wheel');
      expect(wheelEvent.button).toBe('wheel-up');
      expect(['wheel-up', 'wheel-down', 'wheel-left', 'wheel-right']).toContain(wheelEvent.button);
    });

    test('should infer correct types for move events', () => {
      // Arrange
      const moveEvent: EventByAction<'move'> = {
        x: 15,
        y: 25,
        button: 'none',
        action: 'move',
        shift: false,
        alt: false,
        ctrl: false,
        raw: 35,
        data: '\x1b[<35;15;25M',
        protocol: 'SGR',
      };

      // Assert
      expect(moveEvent.action).toBe('move');
      expect(moveEvent.button).toBe('none');
    });

    test('should infer correct types for drag events', () => {
      // Arrange
      const dragEvent: EventByAction<'drag'> = {
        x: 30,
        y: 40,
        button: 'left',
        action: 'drag',
        shift: false,
        alt: false,
        ctrl: false,
        raw: 36,
        data: '\x1b[<36;30;40M',
        protocol: 'SGR',
      };

      // Assert
      expect(dragEvent.action).toBe('drag');
      expect(dragEvent.button).toBe('left');
      // Drag events should not have wheel buttons
      expect(['wheel-up', 'wheel-down', 'wheel-left', 'wheel-right', 'none']).not.toContain(dragEvent.button);
    });

    test('should infer correct types for press events', () => {
      // Arrange
      const pressEvent: EventByAction<'press'> = {
        x: 5,
        y: 10,
        button: 'left',
        action: 'press',
        shift: false,
        alt: false,
        ctrl: false,
        raw: 0,
        data: '\x1b[<0;5;10M',
        protocol: 'SGR',
      };

      // Assert
      expect(pressEvent.action).toBe('press');
      expect(pressEvent.button).toBe('left');
    });

    test('should infer correct types for release events', () => {
      // Arrange
      const releaseEvent: EventByAction<'release'> = {
        x: 5,
        y: 10,
        button: 'left',
        action: 'release',
        shift: false,
        alt: false,
        ctrl: false,
        raw: 0,
        data: '\x1b[<0;5;10m',
        protocol: 'SGR',
      };

      // Assert
      expect(releaseEvent.action).toBe('release');
      expect(releaseEvent.button).toBe('left');
    });

    test('should infer correct types for click events', () => {
      // Arrange
      const clickEvent: EventByAction<'click'> = {
        x: 8,
        y: 12,
        button: 'left',
        action: 'click',
        shift: false,
        alt: false,
        ctrl: false,
        raw: 0,
        data: '\x1b[<0;8;12M',
        protocol: 'SGR',
      };

      // Assert
      expect(clickEvent.action).toBe('click');
      expect(clickEvent.button).toBe('left');
      expect(['left', 'middle', 'right', 'wheel-up', 'wheel-down', 'wheel-left', 'wheel-right']).toContain(
        clickEvent.button,
      );
    });
  });

  describe('TypedEventListener', () => {
    test('should provide correct type inference for wheel listener', () => {
      // Arrange
      const wheelHandler: TypedEventListener<'wheel'> = (event) => {
        // TypeScript should infer event.button as wheel button type
        const button: 'wheel-up' | 'wheel-down' | 'wheel-left' | 'wheel-right' = event.button;
        return button;
      };

      // Act & Assert
      expect(wheelHandler).toBeTypeOf('function');
    });

    test('should provide correct type inference for move listener', () => {
      // Arrange
      const moveHandler: TypedEventListener<'move'> = (event) => {
        // TypeScript should infer event.button as 'none'
        const button: 'none' = event.button;
        return button;
      };

      // Act & Assert
      expect(moveHandler).toBeTypeOf('function');
    });

    test('should provide correct type inference for drag listener', () => {
      // Arrange
      const dragHandler: TypedEventListener<'drag'> = (event) => {
        // TypeScript should infer event.button as excluding wheel buttons and 'none'
        const button = event.button;
        // Button should not be a wheel button or 'none'
        expect(['wheel-up', 'wheel-down', 'wheel-left', 'wheel-right', 'none']).not.toContain(button);
        return button;
      };

      // Act & Assert
      expect(dragHandler).toBeTypeOf('function');
    });
  });

  describe('ListenerFor', () => {
    test('should provide correct listener type for wheel event', () => {
      // Arrange
      type WheelListener = ListenerFor<'wheel'>;

      // Act
      const listener: WheelListener = (event) => {
        expect(event.button).toBe('wheel-up');
      };

      // Assert
      expect(listener).toBeTypeOf('function');
    });

    test('should provide correct listener type for error event', () => {
      // Arrange
      type ErrorListener = ListenerFor<'error'>;

      // Act
      const listener: ErrorListener = (error) => {
        expect(error).toBeInstanceOf(Error);
      };

      // Assert
      expect(listener).toBeTypeOf('function');
    });
  });

  describe('EventTypeFor', () => {
    test('should extract correct event type for wheel action', () => {
      // Arrange
      type WheelEventType = EventTypeFor<'wheel'>;

      // Act
      const event: WheelEventType = {
        x: 1,
        y: 2,
        button: 'wheel-up',
        action: 'wheel',
        shift: false,
        alt: false,
        ctrl: false,
        raw: 64,
        data: '\x1b[<64;1;2M',
        protocol: 'SGR',
      };

      // Assert
      expect(event.action).toBe('wheel');
      expect(['wheel-up', 'wheel-down', 'wheel-left', 'wheel-right']).toContain(event.button);
    });

    test('should extract Error type for error event', () => {
      // Arrange
      type ErrorEventType = EventTypeFor<'error'>;

      // Act
      const error: ErrorEventType = new Error('Test error');

      // Assert
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('Mouse.on() type inference', () => {
    test('should infer correct event type for wheel handler', () => {
      // Arrange
      const mouse = new Mouse();

      // Act - TypeScript should infer the correct type
      mouse.on('wheel', (event) => {
        // event.button should be typed as wheel button
        const button: 'wheel-up' | 'wheel-down' | 'wheel-left' | 'wheel-right' = event.button;
        expect(['wheel-up', 'wheel-down', 'wheel-left', 'wheel-right']).toContain(button);
      });

      // Assert - if type inference works, this compiles without errors
      expect(mouse).toBeInstanceOf(Mouse);
    });

    test('should infer correct event type for move handler', () => {
      // Arrange
      const mouse = new Mouse();

      // Act - TypeScript should infer event.button as 'none'
      mouse.on('move', (event) => {
        // event.button should be typed as 'none'
        const button: 'none' = event.button;
        expect(button).toBe('none');
      });

      // Assert
      expect(mouse).toBeInstanceOf(Mouse);
    });

    test('should infer correct event type for drag handler', () => {
      // Arrange
      const mouse = new Mouse();

      // Act - TypeScript should infer event.button as non-wheel button
      mouse.on('drag', (event) => {
        // event.button should not include wheel buttons or 'none'
        expect(['wheel-up', 'wheel-down', 'wheel-left', 'wheel-right', 'none']).not.toContain(event.button);
      });

      // Assert
      expect(mouse).toBeInstanceOf(Mouse);
    });

    test('should infer correct type for error handler', () => {
      // Arrange
      const mouse = new Mouse();

      // Act - TypeScript should infer parameter as Error
      mouse.on('error', (error) => {
        // error should be typed as Error
        expect(error).toBeInstanceOf(Error);
      });

      // Assert
      expect(mouse).toBeInstanceOf(Mouse);
    });
  });

  describe('Mouse.off() type inference', () => {
    test('should maintain type consistency between on() and off()', () => {
      // Arrange
      const mouse = new Mouse();
      const handler = (event: EventByAction<'press'>) => {
        expect(event.action).toBe('press');
      };

      // Act & Assert - Both should accept the same handler type
      mouse.on('press', handler);
      mouse.off('press', handler);
      expect(mouse).toBeInstanceOf(Mouse);
    });
  });
});
