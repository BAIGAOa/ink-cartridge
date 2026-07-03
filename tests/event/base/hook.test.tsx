import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import React, { useState, ReactNode } from 'react';
import { EventBus } from '../../../src/event/EventBus.js';
import { EventProvider, createEventBus } from '../../../src/event/EventProvider.js';
import { useEventBus, useEmitter, useSubscribe } from '../../../src/event/hook.js';

interface TestEvents {
  'test:event': string;
  'test:number': number;
}

function wrapper({ children }: { children: ReactNode }) {
  const bus = createEventBus<TestEvents>();
  return <EventProvider bus={bus}>{children}</EventProvider>;
}

describe('useEventBus', () => {
  it('returns the bus instance from context', () => {
    let bus: EventBus<TestEvents> | null = null;
    function Reader() {
      bus = useEventBus<TestEvents>();
      return null;
    }
    render(<Reader />, { wrapper });
    expect(bus).toBeInstanceOf(EventBus);
  });

  it('throws when used outside EventProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Bad() {
      useEventBus();
      return null;
    }
    expect(() => render(<Bad />)).toThrow(/useEventBus must be used within an EventProvider/);
    spy.mockRestore();
  });
});

describe('useEmitter', () => {
  it('returns a stable function reference across re-renders', () => {
    let emitterRef: ((payload: string) => void) | null = null;
    function App() {
      const [, force] = useState(0);
      const emit = useEmitter('test:event');
      if (!emitterRef) emitterRef = emit;
      return <button onClick={() => force((n) => n + 1)}>re-render</button>;
    }
    const { container } = render(<App />, { wrapper });
    const first = emitterRef;
    act(() => { container.querySelector('button')?.click(); });
    expect(emitterRef).toBe(first);
  });

  it('emits an event to a subscriber on the same bus', () => {
    const listener = vi.fn();
    function Sub() {
      useSubscribe('test:event', listener);
      return null;
    }
    let emitEvent!: (payload: string) => void;
    function Emitter() {
      emitEvent = useEmitter('test:event');
      return <button onClick={() => emitEvent('hello')}>emit</button>;
    }
    function App() {
      return (
        <EventProvider bus={createEventBus<TestEvents>()}>
          <Sub />
          <Emitter />
        </EventProvider>
      );
    }
    const { container } = render(<App />);
    act(() => { container.querySelector('button')?.click(); });
    expect(listener).toHaveBeenCalledWith('hello');
  });
});

describe('useSubscribe', () => {
  it('calls the callback when the event is emitted', () => {
    const listener = vi.fn();
    let emitEvent!: (payload: string) => void;
    function App() {
      emitEvent = useEmitter('test:event');
      useSubscribe('test:event', listener);
      return null;
    }
    render(<App />, { wrapper });
    act(() => { emitEvent('data'); });
    expect(listener).toHaveBeenCalledWith('data');
  });

  it('unsubscribes on unmount', () => {
    const listener = vi.fn();
    let emitEvent!: (payload: string) => void;
    let mounted = true;

    function Sub() {
      useSubscribe('test:event', listener);
      return null;
    }

    function App() {
      emitEvent = useEmitter('test:event');
      const [show, setShow] = useState(true);
      return (
        <>
          {show && <Sub />}
          <button onClick={() => setShow(false)}>unmount</button>
          <button onClick={() => { mounted = !mounted; }}>toggle</button>
        </>
      );
    }
    const { container } = render(<App />, { wrapper });

    act(() => { emitEvent('first'); });
    expect(listener).toHaveBeenCalledTimes(1);

    act(() => { container.querySelector('button')?.click(); });
    act(() => { emitEvent('second'); });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('re-binds callback when deps change', () => {
    const received: string[] = [];
    function App() {
      const emit = useEmitter('test:event');
      const [prefix, setPrefix] = useState('a');
      useSubscribe(
        'test:event',
        (payload: string) => received.push(`${prefix}:${payload}`),
        [prefix],
      );
      return (
        <>
          <button onClick={() => emit('x')}>emit</button>
          <button onClick={() => setPrefix('b')}>change-dep</button>
        </>
      );
    }
    const { container } = render(<App />, { wrapper });
    const buttons = container.querySelectorAll('button');

    act(() => { (buttons[0] as HTMLButtonElement).click(); });
    act(() => { (buttons[1] as HTMLButtonElement).click(); });
    act(() => { (buttons[0] as HTMLButtonElement).click(); });

    expect(received).toEqual(['a:x', 'b:x']);
  });

  it('handles multiple subscribers independently', () => {
    const a = vi.fn();
    const b = vi.fn();
    let emitEvent!: (payload: string) => void;
    function App() {
      emitEvent = useEmitter('test:event');
      return (
        <>
          <Sub spy={a} />
          <Sub spy={b} />
        </>
      );
    }
    function Sub({ spy }: { spy: ReturnType<typeof vi.fn> }) {
      useSubscribe('test:event', spy);
      return null;
    }
    render(<App />, { wrapper });
    act(() => { emitEvent('data'); });
    expect(a).toHaveBeenCalledWith('data');
    expect(b).toHaveBeenCalledWith('data');
  });
});
