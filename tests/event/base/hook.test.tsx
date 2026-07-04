import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { ReactNode, useRef } from 'react';
import { EventBus } from '../../../src/event/EventBus.js';
import { EventProvider, createEventBus } from '../../../src/event/EventProvider.js';
import { useEventBus, useEmitter, useSubscribe } from '../../../src/event/hook.js';

interface TestEvents {
  'test:event': string;
  'test:number': number;
}

function wrapper({ children }: { children: ReactNode }) {
  const busRef = useRef<EventBus<TestEvents> | null>(null);
  if (!busRef.current) {
    busRef.current = createEventBus<TestEvents>();
  }
  return <EventProvider bus={busRef.current}>{children}</EventProvider>;
}

describe('useEventBus', () => {
  it('returns the bus instance from context', () => {
    const { result } = renderHook(() => useEventBus<TestEvents>(), { wrapper });
    expect(result.current).toBeInstanceOf(EventBus);
  });

  it('throws when used outside EventProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useEventBus())).toThrow(
      /useEventBus must be used within an EventProvider/,
    );
    spy.mockRestore();
  });
});

describe('useEmitter', () => {
  it('returns a stable function reference across re-renders', () => {
    const { result, rerender } = renderHook(() => useEmitter('test:event'), { wrapper });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('emits an event to a subscriber on the same bus', () => {
    const listener = vi.fn();
    const { result } = renderHook(() => {
      const emit = useEmitter('test:event');
      useSubscribe('test:event', listener);
      return emit;
    }, { wrapper });
    act(() => { result.current('hello'); });
    expect(listener).toHaveBeenCalledWith('hello');
  });
});

describe('useSubscribe', () => {
  it('calls the callback when the event is emitted', () => {
    const listener = vi.fn();
    const { result } = renderHook(() => {
      const emit = useEmitter('test:event');
      useSubscribe('test:event', listener);
      return emit;
    }, { wrapper });
    act(() => { result.current('data'); });
    expect(listener).toHaveBeenCalledWith('data');
  });

  it('unsubscribes on unmount', () => {
    const listener = vi.fn();
    const bus = createEventBus<TestEvents>();

    function sharedWrapper({ children }: { children: ReactNode }) {
      return <EventProvider bus={bus}>{children}</EventProvider>;
    }

    const { result, unmount } = renderHook(() => {
      const emit = useEmitter('test:event');
      useSubscribe('test:event', listener);
      return emit;
    }, { wrapper: sharedWrapper });

    act(() => { result.current('first'); });
    expect(listener).toHaveBeenCalledTimes(1);

    unmount();

    const { result: emitOnly } = renderHook(() => useEmitter('test:event'), {
      wrapper: sharedWrapper,
    });
    act(() => { emitOnly.current('second'); });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('re-binds callback when deps change', () => {
    const received: string[] = [];
    const { result, rerender } = renderHook(
      ({ prefix }: { prefix: string }) => {
        const emit = useEmitter('test:event');
        useSubscribe(
          'test:event',
          (payload: string) => received.push(`${prefix}:${payload}`),
          [prefix],
        );
        return emit;
      },
      { wrapper, initialProps: { prefix: 'a' } },
    );

    act(() => { result.current('x'); });
    expect(received).toEqual(['a:x']);

    rerender({ prefix: 'b' });
    act(() => { result.current('x'); });
    expect(received).toEqual(['a:x', 'b:x']);
  });

  it('handles multiple subscribers independently', () => {
    const a = vi.fn();
    const b = vi.fn();
    const { result } = renderHook(() => {
      const emit = useEmitter('test:event');
      useSubscribe('test:event', a);
      useSubscribe('test:event', b);
      return emit;
    }, { wrapper });

    act(() => { result.current('data'); });
    expect(a).toHaveBeenCalledWith('data');
    expect(b).toHaveBeenCalledWith('data');
  });
});
