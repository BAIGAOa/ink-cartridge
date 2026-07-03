import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../../src/event/EventBus.js';

interface TestEvents {
  'test:event': string;
  'test:number': number;
  'test:object': { id: number; name: string };
  'test:void': void;
}

let bus: EventBus<TestEvents>;

beforeEach(() => {
  bus = new EventBus<TestEvents>();
});

describe('on + emit', () => {
  it('delivers payload to a subscribed listener', () => {
    const listener = vi.fn();
    bus.on('test:event', listener);
    bus.emit('test:event', 'hello');
    expect(listener).toHaveBeenCalledWith('hello');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('delivers to multiple listeners for the same event', () => {
    const a = vi.fn();
    const b = vi.fn();
    bus.on('test:event', a);
    bus.on('test:event', b);
    bus.emit('test:event', 'payload');
    expect(a).toHaveBeenCalledWith('payload');
    expect(b).toHaveBeenCalledWith('payload');
  });

  it('does not deliver to listeners of a different event', () => {
    const listener = vi.fn();
    bus.on('test:event', listener);
    bus.emit('test:number', 42);
    expect(listener).not.toHaveBeenCalled();
  });

  it('supports different payload types', () => {
    const strListener = vi.fn();
    const numListener = vi.fn();
    const objListener = vi.fn();
    const voidListener = vi.fn();

    bus.on('test:event', strListener);
    bus.on('test:number', numListener);
    bus.on('test:object', objListener);
    bus.on('test:void', voidListener);

    bus.emit('test:event', 'hello');
    bus.emit('test:number', 42);
    bus.emit('test:object', { id: 1, name: 'test' });
    bus.emit('test:void', undefined);

    expect(strListener).toHaveBeenCalledWith('hello');
    expect(numListener).toHaveBeenCalledWith(42);
    expect(objListener).toHaveBeenCalledWith({ id: 1, name: 'test' });
    expect(voidListener).toHaveBeenCalledWith(undefined);
  });

  it('no-op when emitting an event with no listeners', () => {
    expect(() => bus.emit('test:event', 'nobody')).not.toThrow();
  });
});

describe('off', () => {
  it('removes a specific listener', () => {
    const a = vi.fn();
    const b = vi.fn();
    bus.on('test:event', a);
    bus.on('test:event', b);
    bus.off('test:event', a);
    bus.emit('test:event', 'x');
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledWith('x');
  });

  it('removes all listeners for an event when no listener is given', () => {
    const a = vi.fn();
    const b = vi.fn();
    bus.on('test:event', a);
    bus.on('test:event', b);
    bus.off('test:event');
    bus.emit('test:event', 'x');
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it('removing a listener not subscribed is a no-op', () => {
    expect(() => bus.off('test:event', vi.fn())).not.toThrow();
  });

  it('removing from an event with no listeners is a no-op', () => {
    expect(() => bus.off('test:event')).not.toThrow();
  });
});

describe('on returns unsubscribe', () => {
  it('unsubscribes the listener when the returned function is called', () => {
    const listener = vi.fn();
    const unsub = bus.on('test:event', listener);
    unsub();
    bus.emit('test:event', 'x');
    expect(listener).not.toHaveBeenCalled();
  });

  it('only unsubscribes its own listener', () => {
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = bus.on('test:event', a);
    bus.on('test:event', b);
    unsubA();
    bus.emit('test:event', 'x');
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledWith('x');
  });
});

describe('error isolation', () => {
  it('when one handler throws, other handlers still run', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const good = vi.fn();
    bus.on('test:event', () => { throw new Error('boom'); });
    bus.on('test:event', good);
    bus.emit('test:event', 'payload');
    expect(good).toHaveBeenCalledWith('payload');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('clear', () => {
  it('removes all listeners for all events', () => {
    const a = vi.fn();
    const b = vi.fn();
    bus.on('test:event', a);
    bus.on('test:number', b);
    bus.clear();
    bus.emit('test:event', 'x');
    bus.emit('test:number', 1);
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });
});

describe('clearEvent', () => {
  it('removes all listeners for a single event', () => {
    const a = vi.fn();
    const b = vi.fn();
    bus.on('test:event', a);
    bus.on('test:number', b);
    bus.clearEvent('test:event');
    bus.emit('test:event', 'x');
    bus.emit('test:number', 1);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledWith(1);
  });

  it('no-op for an event with no listeners', () => {
    expect(() => bus.clearEvent('test:void')).not.toThrow();
  });
});

describe('subscriberCount', () => {
  it('returns 0 when no listeners are registered', () => {
    expect(bus.subscriberCount('test:event')).toBe(0);
  });

  it('returns correct count after subscribing', () => {
    bus.on('test:event', vi.fn());
    bus.on('test:event', vi.fn());
    expect(bus.subscriberCount('test:event')).toBe(2);
  });

  it('returns correct count after unsubscribing', () => {
    const a = vi.fn();
    const b = vi.fn();
    bus.on('test:event', a);
    bus.on('test:event', b);
    bus.off('test:event', a);
    expect(bus.subscriberCount('test:event')).toBe(1);
  });

  it('returns 0 after clearEvent', () => {
    bus.on('test:event', vi.fn());
    bus.clearEvent('test:event');
    expect(bus.subscriberCount('test:event')).toBe(0);
  });

  it('returns 0 after clear', () => {
    bus.on('test:event', vi.fn());
    bus.clear();
    expect(bus.subscriberCount('test:event')).toBe(0);
  });
});
