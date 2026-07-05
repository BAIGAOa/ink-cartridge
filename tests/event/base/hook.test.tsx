import { describe, it, expect, vi } from 'vitest';
import React, { useRef } from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { EventBus } from '../../../src/event/EventBus.js';
import { EventProvider, createEventBus } from '../../../src/event/EventProvider.js';
import { useEventBus, useEmitter, useSubscribe } from '../../../src/event/hook.js';

interface TestEvents {
  'test:event': string;
  'test:number': number;
}

function Wrapper({ children, bus }: { children: React.ReactNode; bus?: EventBus<any> }) {
  const busRef = useRef<EventBus<any> | null>(null);
  if (!busRef.current) {
    busRef.current = bus ?? createEventBus<TestEvents>();
  }
  return <EventProvider bus={busRef.current}>{children}</EventProvider>;
}

describe('useEventBus', () => {
  it('returns the bus instance from context', () => {
    const resultRef: { current: any } = { current: null };
    function TestComponent() {
      resultRef.current = useEventBus<TestEvents>();
      return <Text>test</Text>;
    }
    render(<Wrapper><TestComponent /></Wrapper>);
    expect(resultRef.current).toBeInstanceOf(EventBus);
  });

  it('throws when used outside EventProvider', () => {
    let error: Error | null = null;
    function TestComponent() {
      try {
        useEventBus();
      } catch (e) {
        error = e as Error;
      }
      return <Text>test</Text>;
    }
    render(<TestComponent />);
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/useEventBus must be used within an EventProvider/);
  });
});

describe('useEmitter', () => {
  it('returns a stable function reference across re-renders', () => {
    const resultRef: { current: ReturnType<typeof useEmitter> | null } = { current: null };
    function TestComponent() {
      resultRef.current = useEmitter('test:event');
      return <Text>test</Text>;
    }
    const { rerender } = render(<Wrapper><TestComponent /></Wrapper>);
    const first = resultRef.current;
    rerender(<Wrapper><TestComponent /></Wrapper>);
    expect(resultRef.current).toBe(first);
  });

  it('emits an event to a subscriber on the same bus', () => {
    const listener = vi.fn();
    const emitRef: { current: ((payload: string) => void) | null } = { current: null };
    function TestComponent() {
      const emit = useEmitter('test:event');
      useSubscribe('test:event', listener);
      emitRef.current = emit;
      return <Text>test</Text>;
    }
    render(<Wrapper><TestComponent /></Wrapper>);
    emitRef.current!('hello');
    expect(listener).toHaveBeenCalledWith('hello');
  });
});

describe('useSubscribe', () => {
  it('calls the callback when the event is emitted', () => {
    const listener = vi.fn();
    const emitRef: { current: ((payload: string) => void) | null } = { current: null };
    function TestComponent() {
      const emit = useEmitter('test:event');
      useSubscribe('test:event', listener);
      emitRef.current = emit;
      return <Text>test</Text>;
    }
    render(<Wrapper><TestComponent /></Wrapper>);
    emitRef.current!('data');
    expect(listener).toHaveBeenCalledWith('data');
  });

  it('unsubscribes on unmount', () => {
    const listener = vi.fn();
    const bus = createEventBus<TestEvents>();
    const emitRef: { current: ((payload: string) => void) | null } = { current: null };

    function TestComponent() {
      const emit = useEmitter('test:event');
      useSubscribe('test:event', listener);
      emitRef.current = emit;
      return <Text>test</Text>;
    }

    const { unmount } = render(<Wrapper bus={bus}><TestComponent /></Wrapper>);
    emitRef.current!('first');
    expect(listener).toHaveBeenCalledTimes(1);

    unmount();

    const emitRef2: { current: ((payload: string) => void) | null } = { current: null };
    function EmitOnly() {
      emitRef2.current = useEmitter('test:event');
      return <Text>test</Text>;
    }
    render(<Wrapper bus={bus}><EmitOnly /></Wrapper>);
    emitRef2.current!('second');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
