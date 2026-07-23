import { beforeEach, describe, expect, test } from 'vitest';
import type { MouseEvent } from '../../../../src/xterm-mouse/types/index.js';
import { PositionTracker } from '../../../../src/xterm-mouse/core/PositionTracker.js';

// Helper function to create test mouse events
function createMouseEvent(overrides: Partial<MouseEvent> = {}): MouseEvent {
  return {
    x: 10,
    y: 10,
    button: 'none',
    action: 'move',
    shift: false,
    alt: false,
    ctrl: false,
    raw: 0,
    data: '',
    protocol: 'SGR',
    ...overrides,
  } as MouseEvent;
}

describe('PositionTracker', () => {
  let positionTracker: PositionTracker;

  beforeEach(() => {
    positionTracker = new PositionTracker();
  });

  describe('initial state', () => {
    test('returns null when no movement has occurred', () => {
      // Arrange & Act
      const position = positionTracker.getLastPosition();

      // Assert
      expect(position).toBeNull();
    });
  });

  describe('tracking move events', () => {
    test('tracks position from move event', () => {
      // Arrange
      const moveEvent = createMouseEvent({ x: 10, y: 20, button: 'none', action: 'move' });

      // Act
      positionTracker.processEvent(moveEvent);
      const position = positionTracker.getLastPosition();

      // Assert
      expect(position).toEqual({ x: 10, y: 20 });
    });

    test('updates position on subsequent move events', () => {
      // Arrange
      const moveEvent1 = createMouseEvent({ x: 10, y: 20, button: 'none', action: 'move' });
      const moveEvent2 = createMouseEvent({ x: 15, y: 25, button: 'none', action: 'move' });

      // Act
      positionTracker.processEvent(moveEvent1);
      positionTracker.processEvent(moveEvent2);
      const position = positionTracker.getLastPosition();

      // Assert
      expect(position).toEqual({ x: 15, y: 25 });
    });

    test('tracks negative coordinates', () => {
      // Arrange
      const moveEvent = createMouseEvent({ x: -5, y: -10, button: 'none', action: 'move' });

      // Act
      positionTracker.processEvent(moveEvent);
      const position = positionTracker.getLastPosition();

      // Assert
      expect(position).toEqual({ x: -5, y: -10 });
    });

    test('tracks large coordinates', () => {
      // Arrange
      const moveEvent = createMouseEvent({ x: 1000, y: 2000, button: 'none', action: 'move' });

      // Act
      positionTracker.processEvent(moveEvent);
      const position = positionTracker.getLastPosition();

      // Assert
      expect(position).toEqual({ x: 1000, y: 2000 });
    });
  });

  describe('tracking drag events', () => {
    test('tracks position from drag event', () => {
      // Arrange
      const dragEvent = createMouseEvent({ x: 30, y: 40, button: 'left', action: 'drag' });

      // Act
      positionTracker.processEvent(dragEvent);
      const position = positionTracker.getLastPosition();

      // Assert
      expect(position).toEqual({ x: 30, y: 40 });
    });

    test('updates position on subsequent drag events', () => {
      // Arrange
      const dragEvent1 = createMouseEvent({ x: 30, y: 40, button: 'left', action: 'drag' });
      const dragEvent2 = createMouseEvent({ x: 35, y: 45, button: 'left', action: 'drag' });

      // Act
      positionTracker.processEvent(dragEvent1);
      positionTracker.processEvent(dragEvent2);
      const position = positionTracker.getLastPosition();

      // Assert
      expect(position).toEqual({ x: 35, y: 45 });
    });
  });

  describe('ignoring other events', () => {
    test('does NOT track position from press events', () => {
      // Arrange
      const pressEvent = createMouseEvent({ x: 10, y: 20, button: 'left', action: 'press' });

      // Act
      positionTracker.processEvent(pressEvent);
      const position = positionTracker.getLastPosition();

      // Assert
      expect(position).toBeNull();
    });

    test('does NOT track position from release events', () => {
      // Arrange
      const releaseEvent = createMouseEvent({ x: 10, y: 20, button: 'left', action: 'release' });

      // Act
      positionTracker.processEvent(releaseEvent);
      const position = positionTracker.getLastPosition();

      // Assert
      expect(position).toBeNull();
    });

    test('does NOT track position from click events', () => {
      // Arrange
      const clickEvent = createMouseEvent({ x: 10, y: 20, button: 'left', action: 'click' });

      // Act
      positionTracker.processEvent(clickEvent);
      const position = positionTracker.getLastPosition();

      // Assert
      expect(position).toBeNull();
    });

    test('does NOT track position from wheel events', () => {
      // Arrange
      const wheelEvent = createMouseEvent({ x: 10, y: 20, button: 'wheel-up', action: 'wheel' });

      // Act
      positionTracker.processEvent(wheelEvent);
      const position = positionTracker.getLastPosition();

      // Assert
      expect(position).toBeNull();
    });
  });

  describe('mixed event sequences', () => {
    test('tracks position through move and drag events', () => {
      // Arrange
      const moveEvent = createMouseEvent({ x: 10, y: 20, button: 'none', action: 'move' });
      const dragEvent = createMouseEvent({ x: 15, y: 25, button: 'left', action: 'drag' });
      const pressEvent = createMouseEvent({ x: 20, y: 30, button: 'left', action: 'press' });

      // Act
      positionTracker.processEvent(moveEvent);
      positionTracker.processEvent(dragEvent);
      positionTracker.processEvent(pressEvent); // Should be ignored
      const position = positionTracker.getLastPosition();

      // Assert
      expect(position).toEqual({ x: 15, y: 25 }); // Last tracked position from drag
    });

    test('drag overrides previous move position', () => {
      // Arrange
      const moveEvent = createMouseEvent({ x: 10, y: 20, button: 'none', action: 'move' });
      const dragEvent = createMouseEvent({ x: 30, y: 40, button: 'left', action: 'drag' });

      // Act
      positionTracker.processEvent(moveEvent);
      positionTracker.processEvent(dragEvent);
      const position = positionTracker.getLastPosition();

      // Assert
      expect(position).toEqual({ x: 30, y: 40 }); // Drag overrode move
    });

    test('move overrides previous drag position', () => {
      // Arrange
      const dragEvent = createMouseEvent({ x: 30, y: 40, button: 'left', action: 'drag' });
      const moveEvent = createMouseEvent({ x: 10, y: 20, button: 'none', action: 'move' });

      // Act
      positionTracker.processEvent(dragEvent);
      positionTracker.processEvent(moveEvent);
      const position = positionTracker.getLastPosition();

      // Assert
      expect(position).toEqual({ x: 10, y: 20 }); // Move overrode drag
    });
  });

  describe('reset', () => {
    test('clears position on reset', () => {
      // Arrange
      const moveEvent = createMouseEvent({ x: 10, y: 20, button: 'none', action: 'move' });

      // Act
      positionTracker.processEvent(moveEvent);
      positionTracker.reset();
      const position = positionTracker.getLastPosition();

      // Assert
      expect(position).toBeNull();
    });

    test('can track new position after reset', () => {
      // Arrange
      const moveEvent1 = createMouseEvent({ x: 10, y: 20, button: 'none', action: 'move' });
      const moveEvent2 = createMouseEvent({ x: 30, y: 40, button: 'none', action: 'move' });

      // Act
      positionTracker.processEvent(moveEvent1);
      positionTracker.reset();
      positionTracker.processEvent(moveEvent2);
      const position = positionTracker.getLastPosition();

      // Assert
      expect(position).toEqual({ x: 30, y: 40 });
    });
  });

  describe('multiple instances', () => {
    test('each tracker maintains independent state', () => {
      // Arrange
      const tracker1 = new PositionTracker();
      const tracker2 = new PositionTracker();
      const moveEvent1 = createMouseEvent({ x: 10, y: 20, button: 'none', action: 'move' });
      const moveEvent2 = createMouseEvent({ x: 30, y: 40, button: 'none', action: 'move' });

      // Act
      tracker1.processEvent(moveEvent1);
      tracker2.processEvent(moveEvent2);
      const position1 = tracker1.getLastPosition();
      const position2 = tracker2.getLastPosition();

      // Assert
      expect(position1).toEqual({ x: 10, y: 20 });
      expect(position2).toEqual({ x: 30, y: 40 });
    });
  });
});
