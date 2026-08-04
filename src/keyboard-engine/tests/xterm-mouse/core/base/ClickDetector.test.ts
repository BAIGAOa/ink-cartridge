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

  describe('degraded mode (press-only terminals, e.g. VS Code built-in)', () => {
    // After several buttons are pressed simultaneously, some terminals stop
    // sending `release` events entirely. The detector must fall back to
    // treating presses as clicks so onClick keeps working.
    test('consecutive presses with no release synthesize a click from the third press', async () => {
      // Simulates: double-press (2 presses) then a click reported as press-only.
      clickDetector.processEvent(
        createMouseEvent({ x: 84, y: 7, button: 'right', action: 'press' }),
        emitClickMock as (event: MouseEvent) => void,
      );
      clickDetector.processEvent(
        createMouseEvent({ x: 84, y: 7, button: 'left', action: 'press' }),
        emitClickMock as (event: MouseEvent) => void,
      );
      await new Promise<void>((resolve) =>
        setImmediate(() => {
          // Third press — crosses the storm threshold (3), degrades, synthesizes a click.
          clickDetector.processEvent(
            createMouseEvent({ x: 90, y: 9, button: 'left', action: 'press' }),
            emitClickMock as (event: MouseEvent) => void,
          );
          setImmediate(() => resolve());
        }),
      );

      expect(emitClickMock).toHaveBeenCalledTimes(1);
      expect(emitClickMock).toHaveBeenCalledWith(
        expect.objectContaining({ x: 90, y: 9, button: 'left', action: 'click' }),
      );
    });

    test('deduplicates multiple presses at the same position in degraded mode', async () => {
      // Enter degraded mode.
      clickDetector.processEvent(
        createMouseEvent({ x: 1, y: 1, button: 'right', action: 'press' }),
        emitClickMock as (event: MouseEvent) => void,
      );
      clickDetector.processEvent(
        createMouseEvent({ x: 1, y: 1, button: 'left', action: 'press' }),
        emitClickMock as (event: MouseEvent) => void,
      );
      await new Promise<void>((resolve) =>
        setImmediate(() => {
          clickDetector.processEvent(
            createMouseEvent({ x: 10, y: 10, button: 'left', action: 'press' }),
            emitClickMock as (event: MouseEvent) => void,
          );
          setImmediate(() => resolve());
        }),
      );

      // One terminal click is reported as two button presses at the same spot.
      clickDetector.processEvent(
        createMouseEvent({ x: 10, y: 10, button: 'right', action: 'press' }),
        emitClickMock as (event: MouseEvent) => void,
      );
      // Moving to a new position is a new click.
      clickDetector.processEvent(
        createMouseEvent({ x: 15, y: 10, button: 'left', action: 'press' }),
        emitClickMock as (event: MouseEvent) => void,
      );

      await new Promise<void>((resolve) => setImmediate(() => resolve()));

      // 1 (threshold crossing) + 1 (new position) — the same-spot press was deduped.
      expect(emitClickMock).toHaveBeenCalledTimes(2);
      expect(emitClickMock.mock.calls[1][0]).toMatchObject({ x: 15, y: 10, action: 'click' });
    });

    test('a release event restores normal press+release behavior', async () => {
      // Enter degraded mode via a press storm…
      clickDetector.processEvent(
        createMouseEvent({ x: 1, y: 1, button: 'left', action: 'press' }),
        emitClickMock as (event: MouseEvent) => void,
      );
      clickDetector.processEvent(
        createMouseEvent({ x: 1, y: 1, button: 'left', action: 'press' }),
        emitClickMock as (event: MouseEvent) => void,
      );
      clickDetector.processEvent(
        createMouseEvent({ x: 1, y: 1, button: 'left', action: 'press' }),
        emitClickMock as (event: MouseEvent) => void,
      );
      await new Promise<void>((resolve) => setImmediate(() => resolve()));
      expect(emitClickMock).toHaveBeenCalledTimes(1);

      // …then a release arrives (terminal recovered): the storm resets and a
      // normal click is synthesized on the next press+release.
      clickDetector.processEvent(
        createMouseEvent({ x: 1, y: 1, button: 'left', action: 'release' }),
        emitClickMock as (event: MouseEvent) => void,
      );
      clickDetector.processEvent(
        createMouseEvent({ x: 5, y: 5, button: 'left', action: 'press' }),
        emitClickMock as (event: MouseEvent) => void,
      );
      clickDetector.processEvent(
        createMouseEvent({ x: 5, y: 5, button: 'left', action: 'release' }),
        emitClickMock as (event: MouseEvent) => void,
      );
      await new Promise<void>((resolve) => setImmediate(() => resolve()));

      expect(emitClickMock).toHaveBeenCalledTimes(2); // degraded click + recovered click
    });

    test('presses spread beyond the storm window do not trigger degraded mode', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      try {
        // Each press is > 500ms apart (default window) — not a storm.
        for (let i = 0; i < 6; i++) {
          clickDetector.processEvent(
            createMouseEvent({ x: 1 + i, y: 1, button: 'left', action: 'press' }),
            emitClickMock as (event: MouseEvent) => void,
          );
          vi.advanceTimersByTime(600);
        }
        await new Promise<void>((resolve) => setImmediate(() => resolve()));

        // No degraded clicks synthesized.
        expect(emitClickMock).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    test('presses within the storm window trigger degraded mode', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      try {
        // Three presses, each 100ms apart — well inside the 500ms window.
        clickDetector.processEvent(
          createMouseEvent({ x: 1, y: 1, button: 'left', action: 'press' }),
          emitClickMock as (event: MouseEvent) => void,
        );
        vi.advanceTimersByTime(100);
        clickDetector.processEvent(
          createMouseEvent({ x: 1, y: 1, button: 'left', action: 'press' }),
          emitClickMock as (event: MouseEvent) => void,
        );
        vi.advanceTimersByTime(100);
        clickDetector.processEvent(
          createMouseEvent({ x: 2, y: 2, button: 'left', action: 'press' }),
          emitClickMock as (event: MouseEvent) => void,
        );
        await new Promise<void>((resolve) => setImmediate(() => resolve()));

        expect(emitClickMock).toHaveBeenCalledTimes(1);
        expect(emitClickMock).toHaveBeenCalledWith(
          expect.objectContaining({ x: 2, y: 2, action: 'click' }),
        );
      } finally {
        vi.useRealTimers();
      }
    });

    test('a fresh click at the same spot after the dedup window is a new click', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      try {
        // Enter degraded mode: third press synthesizes a click at (10,10).
        clickDetector.processEvent(
          createMouseEvent({ x: 1, y: 1, button: 'left', action: 'press' }),
          emitClickMock as (event: MouseEvent) => void,
        );
        clickDetector.processEvent(
          createMouseEvent({ x: 1, y: 1, button: 'left', action: 'press' }),
          emitClickMock as (event: MouseEvent) => void,
        );
        clickDetector.processEvent(
          createMouseEvent({ x: 10, y: 10, button: 'left', action: 'press' }),
          emitClickMock as (event: MouseEvent) => void,
        );
        await new Promise<void>((resolve) => setImmediate(() => resolve()));
        expect(emitClickMock).toHaveBeenCalledTimes(1);

        // Same spot within the dedup window — same click, deduped.
        clickDetector.processEvent(
          createMouseEvent({ x: 10, y: 10, button: 'right', action: 'press' }),
          emitClickMock as (event: MouseEvent) => void,
        );
        await new Promise<void>((resolve) => setImmediate(() => resolve()));
        expect(emitClickMock).toHaveBeenCalledTimes(1);

        // After the window (default 300ms), a press at the same spot is a NEW click.
        vi.advanceTimersByTime(400);
        clickDetector.processEvent(
          createMouseEvent({ x: 10, y: 10, button: 'left', action: 'press' }),
          emitClickMock as (event: MouseEvent) => void,
        );
        await new Promise<void>((resolve) => setImmediate(() => resolve()));

        expect(emitClickMock).toHaveBeenCalledTimes(2);
        expect(emitClickMock.mock.calls[1][0]).toMatchObject({ x: 10, y: 10, action: 'click' });
      } finally {
        vi.useRealTimers();
      }
    });

    test('respects a custom pressStormThreshold', async () => {
      clickDetector = new ClickDetector({ pressStormThreshold: 5 });

      // 3 presses: below the custom threshold of 5 — no degraded clicks.
      clickDetector.processEvent(
        createMouseEvent({ x: 1, y: 1, button: 'left', action: 'press' }),
        emitClickMock as (event: MouseEvent) => void,
      );
      clickDetector.processEvent(
        createMouseEvent({ x: 1, y: 1, button: 'left', action: 'press' }),
        emitClickMock as (event: MouseEvent) => void,
      );
      clickDetector.processEvent(
        createMouseEvent({ x: 1, y: 1, button: 'left', action: 'press' }),
        emitClickMock as (event: MouseEvent) => void,
      );
      await new Promise<void>((resolve) => setImmediate(() => resolve()));
      expect(emitClickMock).not.toHaveBeenCalled();
    });

    test('pressStormThreshold: Infinity disables degraded mode entirely', () => {
      clickDetector = new ClickDetector({ pressStormThreshold: Infinity });

      for (let i = 0; i < 10; i++) {
        clickDetector.processEvent(
          createMouseEvent({ x: i, y: 1, button: 'left', action: 'press' }),
          emitClickMock as (event: MouseEvent) => void,
        );
      }
      expect(emitClickMock).not.toHaveBeenCalled();
    });
  });
});
