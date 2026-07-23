import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MouseConvenienceMethods } from '../../../../src/xterm-mouse/core/MouseConvenienceMethods.js';

describe('MouseConvenienceMethods', () => {
  let convenienceMethods: MouseConvenienceMethods;
  let mockEmitter: EventEmitter;
  let mockGetLastPosition: ReturnType<typeof vi.fn<() => { x: number; y: number } | null>>;

  beforeEach(() => {
    mockEmitter = new EventEmitter();
    mockGetLastPosition = vi.fn<() => { x: number; y: number } | null>(() => null);
    convenienceMethods = new MouseConvenienceMethods(
      mockEmitter,
      mockGetLastPosition as unknown as () => { x: number; y: number } | null,
    );
  });

  describe('waitForClick', () => {
    test('resolves when click event occurs', async () => {
      // Arrange
      const clickPromise = convenienceMethods.waitForClick({ timeout: 1000 });

      // Act
      setTimeout(() => {
        mockEmitter.emit('click', { x: 10, y: 10, button: 'left', action: 'click' });
      }, 10);

      // Assert
      await expect(clickPromise).resolves.toEqual(
        expect.objectContaining({
          x: 10,
          y: 10,
          button: 'left',
          action: 'click',
        }),
      );
    });

    test('rejects on timeout', async () => {
      // Arrange
      const clickPromise = convenienceMethods.waitForClick({ timeout: 50 });

      // Act & Assert
      await expect(clickPromise).rejects.toThrow('Timeout waiting for click');
    });

    test('rejects when abort signal is triggered', async () => {
      // Arrange
      const controller = new AbortController();
      const clickPromise = convenienceMethods.waitForClick({ signal: controller.signal, timeout: 1000 });

      // Act
      setTimeout(() => {
        controller.abort();
      }, 10);

      // Assert
      await expect(clickPromise).rejects.toThrow('aborted');
    });

    test('rejects immediately if already aborted', async () => {
      // Arrange
      const controller = new AbortController();
      controller.abort();

      // Act & Assert
      await expect(convenienceMethods.waitForClick({ signal: controller.signal })).rejects.toThrow('aborted');
    });

    test('cleans up listeners on completion', async () => {
      // Arrange
      const clickPromise = convenienceMethods.waitForClick({ timeout: 1000 });

      // Act
      setTimeout(() => {
        mockEmitter.emit('click', { x: 10, y: 10, button: 'left', action: 'click' });
      }, 10);

      await clickPromise;
      // Wait for cleanup
      await new Promise<void>((resolve) => setImmediate(() => resolve()));
      const finalListenerCount = mockEmitter.listenerCount('click');

      // Assert - temporary listener removed
      expect(finalListenerCount).toBe(0);
    });
  });

  describe('waitForInput', () => {
    test('resolves on press event', async () => {
      // Arrange
      const inputPromise = convenienceMethods.waitForInput({ timeout: 1000 });

      // Act
      setTimeout(() => {
        mockEmitter.emit('press', { x: 10, y: 10, button: 'left', action: 'press' });
      }, 10);

      // Assert
      await expect(inputPromise).resolves.toEqual(
        expect.objectContaining({
          action: 'press',
        }),
      );
    });

    test('resolves on release event', async () => {
      // Arrange
      const inputPromise = convenienceMethods.waitForInput({ timeout: 1000 });

      // Act
      setTimeout(() => {
        mockEmitter.emit('release', { x: 10, y: 10, button: 'left', action: 'release' });
      }, 10);

      // Assert
      await expect(inputPromise).resolves.toEqual(
        expect.objectContaining({
          action: 'release',
        }),
      );
    });

    test('resolves on drag event', async () => {
      // Arrange
      const inputPromise = convenienceMethods.waitForInput({ timeout: 1000 });

      // Act
      setTimeout(() => {
        mockEmitter.emit('drag', { x: 10, y: 10, button: 'left', action: 'drag' });
      }, 10);

      // Assert
      await expect(inputPromise).resolves.toEqual(
        expect.objectContaining({
          action: 'drag',
        }),
      );
    });

    test('resolves on wheel event', async () => {
      // Arrange
      const inputPromise = convenienceMethods.waitForInput({ timeout: 1000 });

      // Act
      setTimeout(() => {
        mockEmitter.emit('wheel', { x: 10, y: 10, button: 'wheel-up', action: 'wheel' });
      }, 10);

      // Assert
      await expect(inputPromise).resolves.toEqual(
        expect.objectContaining({
          action: 'wheel',
        }),
      );
    });

    test('resolves on move event', async () => {
      // Arrange
      const inputPromise = convenienceMethods.waitForInput({ timeout: 1000 });

      // Act
      setTimeout(() => {
        mockEmitter.emit('move', { x: 10, y: 10, button: 'none', action: 'move' });
      }, 10);

      // Assert
      await expect(inputPromise).resolves.toEqual(
        expect.objectContaining({
          action: 'move',
        }),
      );
    });

    test('resolves on click event', async () => {
      // Arrange
      const inputPromise = convenienceMethods.waitForInput({ timeout: 1000 });

      // Act
      setTimeout(() => {
        mockEmitter.emit('click', { x: 10, y: 10, button: 'left', action: 'click' });
      }, 10);

      // Assert
      await expect(inputPromise).resolves.toEqual(
        expect.objectContaining({
          action: 'click',
        }),
      );
    });

    test('rejects on timeout', async () => {
      // Arrange
      const inputPromise = convenienceMethods.waitForInput({ timeout: 50 });

      // Act & Assert
      await expect(inputPromise).rejects.toThrow('Timeout waiting for input');
    });

    test('rejects when abort signal is triggered', async () => {
      // Arrange
      const controller = new AbortController();
      const inputPromise = convenienceMethods.waitForInput({ signal: controller.signal, timeout: 1000 });

      // Act
      setTimeout(() => {
        controller.abort();
      }, 10);

      // Assert
      await expect(inputPromise).rejects.toThrow('aborted');
    });

    test('cleans up all event listeners on completion', async () => {
      // Arrange
      const inputPromise = convenienceMethods.waitForInput({ timeout: 1000 });

      // Act
      setTimeout(() => {
        mockEmitter.emit('press', { x: 10, y: 10, button: 'left', action: 'press' });
      }, 10);

      await inputPromise;
      // Wait for cleanup
      await new Promise<void>((resolve) => setImmediate(() => resolve()));

      // Assert - all temporary listeners removed
      expect(mockEmitter.listenerCount('press')).toBe(0);
      expect(mockEmitter.listenerCount('release')).toBe(0);
      expect(mockEmitter.listenerCount('drag')).toBe(0);
      expect(mockEmitter.listenerCount('wheel')).toBe(0);
      expect(mockEmitter.listenerCount('move')).toBe(0);
      expect(mockEmitter.listenerCount('click')).toBe(0);
    });
  });

  describe('getMousePosition', () => {
    test('returns cached position immediately if available', async () => {
      // Arrange
      mockGetLastPosition.mockReturnValue({ x: 10, y: 20 });

      // Act
      const position = await convenienceMethods.getMousePosition({ timeout: 1000 });

      // Assert
      expect(position).toEqual({ x: 10, y: 20 });
      expect(mockGetLastPosition).toHaveBeenCalledTimes(1);
    });

    test('waits for move event if no cached position', async () => {
      // Arrange
      mockGetLastPosition.mockReturnValue(null);
      const positionPromise = convenienceMethods.getMousePosition({ timeout: 1000 });

      // Act
      setTimeout(() => {
        mockEmitter.emit('move', { x: 30, y: 40, button: 'none', action: 'move' });
      }, 10);

      // Assert
      await expect(positionPromise).resolves.toEqual({ x: 30, y: 40 });
    });

    test('rejects on timeout', async () => {
      // Arrange
      mockGetLastPosition.mockReturnValue(null);

      // Act & Assert
      await expect(convenienceMethods.getMousePosition({ timeout: 50 })).rejects.toThrow(
        'Timeout waiting for mouse position',
      );
    });

    test('rejects when abort signal is triggered', async () => {
      // Arrange
      const controller = new AbortController();
      mockGetLastPosition.mockReturnValue(null);
      const positionPromise = convenienceMethods.getMousePosition({
        signal: controller.signal,
        timeout: 1000,
      });

      // Act
      setTimeout(() => {
        controller.abort();
      }, 10);

      // Assert
      await expect(positionPromise).rejects.toThrow('aborted');
    });

    test('rejects immediately if already aborted', async () => {
      // Arrange
      const controller = new AbortController();
      controller.abort();
      mockGetLastPosition.mockReturnValue(null);

      // Act & Assert
      await expect(convenienceMethods.getMousePosition({ signal: controller.signal })).rejects.toThrow('aborted');
    });

    test('cleans up listeners on completion', async () => {
      // Arrange
      mockGetLastPosition.mockReturnValue(null);
      const positionPromise = convenienceMethods.getMousePosition({ timeout: 1000 });

      // Act
      setTimeout(() => {
        mockEmitter.emit('move', { x: 30, y: 40, button: 'none', action: 'move' });
      }, 10);

      await positionPromise;
      const moveListeners = mockEmitter.listenerCount('move');

      // Assert
      expect(moveListeners).toBe(0);
    });

    test('returns different positions on successive calls', async () => {
      // Arrange - first call has cached position
      mockGetLastPosition.mockReturnValueOnce({ x: 10, y: 20 });
      mockGetLastPosition.mockReturnValueOnce(null);

      // Act
      const position1 = await convenienceMethods.getMousePosition({ timeout: 1000 });

      // Second call waits for new event
      const positionPromise = convenienceMethods.getMousePosition({ timeout: 1000 });
      setTimeout(() => {
        mockEmitter.emit('move', { x: 50, y: 60, button: 'none', action: 'move' });
      }, 10);
      const position2 = await positionPromise;

      // Assert
      expect(position1).toEqual({ x: 10, y: 20 });
      expect(position2).toEqual({ x: 50, y: 60 });
    });
  });
});
