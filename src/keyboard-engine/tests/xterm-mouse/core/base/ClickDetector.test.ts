import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { MouseEvent } from '../../../../src/xterm-mouse/types/index.js';
import { ClickDetector } from '../../../../src/xterm-mouse/core/ClickDetector.js';

// Helper function to create test mouse events
function createMouseEvent(overrides: Partial<MouseEvent> = {}): MouseEvent {
  return {
    x: 10,
    y: 10,
    button: 'left',
    action: 'press',
    shift: false,
    alt: false,
    ctrl: false,
    raw: 0,
    data: '',
    protocol: 'SGR',
    ...overrides,
  } as MouseEvent;
}

describe('ClickDetector', () => {
  let clickDetector: ClickDetector;
  let emitClickMock: ReturnType<typeof vi.fn<(clickEvent: MouseEvent) => void>>;

  beforeEach(() => {
    emitClickMock = vi.fn<(clickEvent: MouseEvent) => void>();
    clickDetector = new ClickDetector();
  });

  describe('with default threshold (1)', () => {
    test('stores press event', () => {
      // Arrange
      const pressEvent = createMouseEvent({ x: 10, y: 10, button: 'left', action: 'press' });

      // Act
      clickDetector.processEvent(pressEvent, emitClickMock as (event: MouseEvent) => void);

      // Assert - press event is stored (no assertion possible without exposing state)
      expect(emitClickMock).not.toHaveBeenCalled();
    });

    test('detects click when release within threshold', async () => {
      // Arrange
      const pressEvent = createMouseEvent({ x: 10, y: 10, button: 'left', action: 'press' });
      const releaseEvent = createMouseEvent({ x: 10, y: 10, button: 'left', action: 'release' });

      // Act
      clickDetector.processEvent(pressEvent, emitClickMock as (event: MouseEvent) => void);
      await new Promise<void>((resolve) =>
        setImmediate(() => {
          clickDetector.processEvent(releaseEvent, emitClickMock as (event: MouseEvent) => void);
          setImmediate(() => resolve());
        }),
      );

      // Assert - click detected (same position)
      expect(emitClickMock).toHaveBeenCalledTimes(1);
      expect(emitClickMock).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 10,
          y: 10,
          button: 'left',
          action: 'click',
        }),
      );
    });

    test('detects click when release within distance threshold', async () => {
      // Arrange
      const pressEvent = createMouseEvent({ x: 10, y: 10, button: 'left', action: 'press' });
      const releaseEvent = createMouseEvent({ x: 11, y: 11, button: 'left', action: 'release' });

      // Act
      clickDetector.processEvent(pressEvent, emitClickMock as (event: MouseEvent) => void);
      await new Promise<void>((resolve) =>
        setImmediate(() => {
          clickDetector.processEvent(releaseEvent, emitClickMock as (event: MouseEvent) => void);
          setImmediate(() => resolve());
        }),
      );

      // Assert - click detected (within threshold of 1)
      expect(emitClickMock).toHaveBeenCalledTimes(1);
    });

    test('does NOT detect click when release beyond threshold', async () => {
      // Arrange
      const pressEvent = createMouseEvent({ x: 10, y: 10, button: 'left', action: 'press' });
      const releaseEvent = createMouseEvent({ x: 12, y: 12, button: 'left', action: 'release' });

      // Act
      clickDetector.processEvent(pressEvent, emitClickMock as (event: MouseEvent) => void);
      await new Promise<void>((resolve) =>
        setImmediate(() => {
          clickDetector.processEvent(releaseEvent, emitClickMock as (event: MouseEvent) => void);
          setImmediate(() => resolve());
        }),
      );

      // Assert - no click (beyond threshold of 1)
      expect(emitClickMock).not.toHaveBeenCalled();
    });

    test('does NOT detect click when no press event', async () => {
      // Arrange
      const releaseEvent = createMouseEvent({ x: 10, y: 10, button: 'left', action: 'release' });

      // Act
      await new Promise<void>((resolve) =>
        setImmediate(() => {
          clickDetector.processEvent(releaseEvent, emitClickMock as (event: MouseEvent) => void);
          setImmediate(() => resolve());
        }),
      );

      // Assert - no click without press
      expect(emitClickMock).not.toHaveBeenCalled();
    });

    test('clears press after release', async () => {
      // Arrange
      const pressEvent = createMouseEvent({ x: 10, y: 10, button: 'left', action: 'press' });
      const releaseEvent1 = createMouseEvent({ x: 20, y: 20, button: 'left', action: 'release' });
      const releaseEvent2 = createMouseEvent({ x: 10, y: 10, button: 'left', action: 'release' });

      // Act
      clickDetector.processEvent(pressEvent, emitClickMock as (event: MouseEvent) => void);
      await new Promise<void>((resolve) =>
        setImmediate(() => {
          clickDetector.processEvent(releaseEvent1, emitClickMock as (event: MouseEvent) => void); // No click
          setImmediate(() => {
            clickDetector.processEvent(releaseEvent2, emitClickMock as (event: MouseEvent) => void); // Still no click
            setImmediate(() => resolve());
          });
        }),
      );

      // Assert - press was cleared after first release
      expect(emitClickMock).not.toHaveBeenCalled();
    });
  });

  describe('with custom threshold', () => {
    test('respects custom threshold of 0', async () => {
      // Arrange
      const detector = new ClickDetector({ clickDistanceThreshold: 0 });
      const pressEvent = createMouseEvent({ x: 10, y: 10, button: 'left', action: 'press' });
      const releaseEvent = createMouseEvent({ x: 11, y: 10, button: 'left', action: 'release' });

      // Act
      detector.processEvent(pressEvent, emitClickMock);
      await new Promise<void>((resolve) =>
        setImmediate(() => {
          detector.processEvent(releaseEvent, emitClickMock);
          setImmediate(() => resolve());
        }),
      );

      // Assert - no click (distance is 1, threshold is 0)
      expect(emitClickMock).not.toHaveBeenCalled();
    });

    test('allows larger distance with threshold of 5', async () => {
      // Arrange
      const detector = new ClickDetector({ clickDistanceThreshold: 5 });
      const pressEvent = createMouseEvent({ x: 10, y: 10, button: 'left', action: 'press' });
      const releaseEvent = createMouseEvent({ x: 15, y: 15, button: 'left', action: 'release' });

      // Act
      detector.processEvent(pressEvent, emitClickMock);
      await new Promise<void>((resolve) =>
        setImmediate(() => {
          detector.processEvent(releaseEvent, emitClickMock);
          setImmediate(() => resolve());
        }),
      );

      // Assert - click detected (within threshold of 5)
      expect(emitClickMock).toHaveBeenCalledTimes(1);
    });

    test('rejects distance beyond threshold of 5', async () => {
      // Arrange
      const detector = new ClickDetector({ clickDistanceThreshold: 5 });
      const pressEvent = createMouseEvent({ x: 10, y: 10, button: 'left', action: 'press' });
      const releaseEvent = createMouseEvent({ x: 16, y: 15, button: 'left', action: 'release' });

      // Act
      detector.processEvent(pressEvent, emitClickMock);
      await new Promise<void>((resolve) =>
        setImmediate(() => {
          detector.processEvent(releaseEvent, emitClickMock);
          setImmediate(() => resolve());
        }),
      );

      // Assert - no click (distance is 6, threshold is 5)
      expect(emitClickMock).not.toHaveBeenCalled();
    });
  });

  describe('with different mouse buttons', () => {
    test('detects click with right button', async () => {
      // Arrange
      const pressEvent = createMouseEvent({ x: 10, y: 10, button: 'right', action: 'press' });
      const releaseEvent = createMouseEvent({ x: 10, y: 10, button: 'right', action: 'release' });

      // Act
      clickDetector.processEvent(pressEvent, emitClickMock as (event: MouseEvent) => void);
      await new Promise<void>((resolve) =>
        setImmediate(() => {
          clickDetector.processEvent(releaseEvent, emitClickMock as (event: MouseEvent) => void);
          setImmediate(() => resolve());
        }),
      );

      // Assert
      expect(emitClickMock).toHaveBeenCalledWith(
        expect.objectContaining({
          button: 'right',
          action: 'click',
        }),
      );
    });

    test('detects click with middle button', async () => {
      // Arrange
      const pressEvent = createMouseEvent({ x: 10, y: 10, button: 'middle', action: 'press' });
      const releaseEvent = createMouseEvent({ x: 10, y: 10, button: 'middle', action: 'release' });

      // Act
      clickDetector.processEvent(pressEvent, emitClickMock as (event: MouseEvent) => void);
      await new Promise<void>((resolve) =>
        setImmediate(() => {
          clickDetector.processEvent(releaseEvent, emitClickMock as (event: MouseEvent) => void);
          setImmediate(() => resolve());
        }),
      );

      // Assert
      expect(emitClickMock).toHaveBeenCalledWith(
        expect.objectContaining({
          button: 'middle',
          action: 'click',
        }),
      );
    });
  });

  describe('reset', () => {
    test('clears press state on reset', async () => {
      // Arrange
      const pressEvent = createMouseEvent({ x: 10, y: 10, button: 'left', action: 'press' });
      const releaseEvent = createMouseEvent({ x: 10, y: 10, button: 'left', action: 'release' });

      // Act
      clickDetector.processEvent(pressEvent, emitClickMock as (event: MouseEvent) => void);
      await new Promise<void>((resolve) =>
        setImmediate(() => {
          clickDetector.reset();
          clickDetector.processEvent(releaseEvent, emitClickMock as (event: MouseEvent) => void);
          setImmediate(() => resolve());
        }),
      );

      // Assert - no click after reset
      expect(emitClickMock).not.toHaveBeenCalled();
    });
  });

  describe('async click emission', () => {
    test('emits click event asynchronously', async () => {
      // Arrange
      const pressEvent = createMouseEvent({ x: 10, y: 10, button: 'left', action: 'press' });
      const releaseEvent = createMouseEvent({ x: 10, y: 10, button: 'left', action: 'release' });

      // Act
      clickDetector.processEvent(pressEvent, emitClickMock as (event: MouseEvent) => void);
      await new Promise<void>((resolve) =>
        setImmediate(() => {
          clickDetector.processEvent(releaseEvent, emitClickMock as (event: MouseEvent) => void);
          setImmediate(() => resolve());
        }),
      );

      // Assert - click emitted via nextTick
      expect(emitClickMock).toHaveBeenCalledTimes(1);
    });
  });
});
