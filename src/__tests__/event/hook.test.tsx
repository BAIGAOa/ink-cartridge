import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import React, { useState, type ReactNode } from 'react';
import { EventProvider, createEventBus } from '../../event/EventProvider.js';
import { useEventBus, useEmitter, useSubscribe } from '../../event/hook.js';
import { EventBus } from '../../event/EventBus.js';

interface TestEvents {
  'test:event': string;
  'test:number': number;
}

/** Wrapper that provides a fresh EventBus to the component tree. */
function wrapper({ children }: { children: ReactNode }) {
  const bus = createEventBus<TestEvents>();
  return <EventProvider bus={bus}>{children}</EventProvider>;
}

describe('useEventBus', () => {
  it('returns the bus instance from context', () => {
    let bus: EventBus<any> | null = null;
    function Consumer() {
      bus = useEventBus();
      return null;
    }
    render(<Consumer />, { wrapper });
    expect(bus).toBeInstanceOf(EventBus);
  });

  it('throws when used outside EventProvider', () => {
    function Consumer() {
      useEventBus();
      return null;
    }
    // Suppress the expected error boundary log
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow(
      '[ink-cartridge] useEventBus must be used within an EventProvider',
    );
    spy.mockRestore();
  });
});

describe('useEmitter', () => {
  it('returns a stable function reference across re-renders', () => {
    let emitter1: Function | null = null;
    let emitter2: Function | null = null;
    let forceRender: () => void;

    function Consumer() {
      const [, setCount] = useState(0);
      const emit = useEmitter('test:event');
      if (!emitter1) {
        emitter1 = emit;
      } else {
        emitter2 = emit;
      }
      forceRender = () => setCount((c) => c + 1);
      return null;
    }

    render(<Consumer />, { wrapper });
    act(() => forceRender!());
    expect(emitter1).toBe(emitter2);
  });

  it('emits an event to a subscriber on the same bus', () => {
    const listener = vi.fn();

    function Consumer() {
      const emit = useEmitter('test:event');
      useSubscribe('test:event', listener);
      return <button onClick={() => emit('hello')}>Emit</button>;
    }

    const { getByText } = render(<Consumer />, { wrapper });
    act(() => getByText('Emit').click());
    expect(listener).toHaveBeenCalledWith('hello');
  });
});

describe('useSubscribe', () => {
  it('calls the callback when the event is emitted', () => {
    const listener = vi.fn();
    let emitRef: (payload: any) => void;

    function Emitter() {
      emitRef = useEmitter('test:event');
      return null;
    }

    function Subscriber() {
      useSubscribe('test:event', listener);
      return null;
    }

    function App() {
      return (
        <>
          <Emitter />
          <Subscriber />
        </>
      );
    }

    render(<App />, { wrapper });
    act(() => emitRef!('world'));
    expect(listener).toHaveBeenCalledWith('world');
  });

  it('unsubscribes on unmount', () => {
    const listener = vi.fn();
    let emitRef: (payload: any) => void;

    function Emitter() {
      emitRef = useEmitter('test:event');
      return null;
    }

    function Subscriber({ mounted }: { mounted: boolean }) {
      return mounted ? <Inner /> : null;
    }

    function Inner() {
      useSubscribe('test:event', listener);
      return null;
    }

    function App() {
      const [mounted, setMounted] = useState(true);
      return (
        <>
          <Emitter />
          <Subscriber mounted={mounted} />
          <button onClick={() => setMounted(false)}>Unmount</button>
        </>
      );
    }

    render(<App />, { wrapper });
    act(() => emitRef!('first'));
    expect(listener).toHaveBeenCalledTimes(1);

    // Unmount the subscriber
    act(() => {
      const btn = document.querySelector('button');
      btn?.click();
    });

    act(() => emitRef!('second'));
    // Still only called once — unsubscribed
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('re-binds callback when deps change', () => {
    const calls: string[] = [];
    let emitRef: (payload: any) => void;
    let setDep: (v: string) => void;

    function Emitter() {
      emitRef = useEmitter('test:event');
      return null;
    }

    function Subscriber() {
      const [dep, setDepLocal] = useState('a');
      setDep = setDepLocal;
      useSubscribe(
        'test:event',
        (payload: string) => calls.push(`${dep}:${payload}`),
        [dep],
      );
      return null;
    }

    function App() {
      return (
        <>
          <Emitter />
          <Subscriber />
        </>
      );
    }

    render(<App />, { wrapper });
    act(() => emitRef!('x'));
    expect(calls).toEqual(['a:x']);

    // Change the dep — the callback should be re-bound with the new dep value
    act(() => setDep!('b'));
    act(() => emitRef!('y'));
    expect(calls).toEqual(['a:x', 'b:y']);
  });

  it('handles multiple subscribers independently', () => {
    const a = vi.fn();
    const b = vi.fn();
    let emitRef: (payload: any) => void;

    function Emitter() {
      emitRef = useEmitter('test:event');
      return null;
    }

    function App() {
      return (
        <>
          <Emitter />
          <Sub callback={a} />
          <Sub callback={b} />
        </>
      );
    }

    function Sub({ callback }: { callback: (p: any) => void }) {
      useSubscribe('test:event', callback);
      return null;
    }

    render(<App />, { wrapper });
    act(() => emitRef!('shared'));
    expect(a).toHaveBeenCalledWith('shared');
    expect(b).toHaveBeenCalledWith('shared');
  });
});
