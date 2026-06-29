import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../event/EventBus.js';

interface TestEvents {
  'test:event': string;
  'test:number': number;
  'test:object': { id: number; name: string };
  'test:void': void;
}

describe('EventBus', () => {
  let bus: EventBus<TestEvents>;

  beforeEach(() => {
    bus = new EventBus<TestEvents>();
  });

  describe('on + emit', () => {
    it('delivers the payload to a subscribed listener', () => {
      const listener = vi.fn();
      bus.on('test:event', listener);
      bus.emit('test:event', 'hello');
      expect(listener).toHaveBeenCalledWith('hello');
    });

    it('delivers to multiple listeners for the same event', () => {
      const a = vi.fn();
      const b = vi.fn();
      bus.on('test:event', a);
      bus.on('test:event', b);
      bus.emit('test:event', 'world');
      expect(a).toHaveBeenCalledWith('world');
      expect(b).toHaveBeenCalledWith('world');
    });

    it('does not deliver to listeners of a different event', () => {
      const listener = vi.fn();
      bus.on('test:event', listener);
      bus.emit('test:number', 42);
      expect(listener).not.toHaveBeenCalled();
    });

    it('supports different payload types', () => {
      const str = vi.fn();
      const num = vi.fn();
      const obj = vi.fn();
      const vd = vi.fn();

      bus.on('test:event', str);
      bus.on('test:number', num);
      bus.on('test:object', obj);
      bus.on('test:void', vd);

      bus.emit('test:event', 'text');
      bus.emit('test:number', 42);
      bus.emit('test:object', { id: 1, name: 'test' });
      bus.emit('test:void', undefined);

      expect(str).toHaveBeenCalledWith('text');
      expect(num).toHaveBeenCalledWith(42);
      expect(obj).toHaveBeenCalledWith({ id: 1, name: 'test' });
      expect(vd).toHaveBeenCalledWith(undefined);
    });

    it('is a no-op when emitting an event with no listeners', () => {
      expect(() => bus.emit('test:event', 'nobody')).not.toThrow();
    });
  });

  describe('off', () => {
    it('removes a specific listener', () => {
      const listener = vi.fn();
      bus.on('test:event', listener);
      bus.off('test:event', listener);
      bus.emit('test:event', 'hello');
      expect(listener).not.toHaveBeenCalled();
    });

    it('removes all listeners for an event when no listener is given', () => {
      const a = vi.fn();
      const b = vi.fn();
      bus.on('test:event', a);
      bus.on('test:event', b);
      bus.off('test:event');
      bus.emit('test:event', 'hello');
      expect(a).not.toHaveBeenCalled();
      expect(b).not.toHaveBeenCalled();
    });

    it('is a no-op when removing a listener not subscribed', () => {
      const listener = vi.fn();
      expect(() => bus.off('test:event', listener)).not.toThrow();
    });

    it('is a no-op when removing from an event with no listeners', () => {
      expect(() => bus.off('test:event')).not.toThrow();
    });
  });

  describe('on returns unsubscribe', () => {
    it('unsubscribes the listener when the returned function is called', () => {
      const listener = vi.fn();
      const unsubscribe = bus.on('test:event', listener);
      unsubscribe();
      bus.emit('test:event', 'hello');
      expect(listener).not.toHaveBeenCalled();
    });

    it('only unsubscribes its own listener', () => {
      const a = vi.fn();
      const b = vi.fn();
      const unsubA = bus.on('test:event', a);
      bus.on('test:event', b);
      unsubA();
      bus.emit('test:event', 'hello');
      expect(a).not.toHaveBeenCalled();
      expect(b).toHaveBeenCalledWith('hello');
    });
  });

  describe('error isolation', () => {
    it('allows other handlers to run when one throws', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const bad = vi.fn().mockImplementation(() => {
        throw new Error('boom');
      });
      const good = vi.fn();

      bus.on('test:event', bad);
      bus.on('test:event', good);
      bus.emit('test:event', 'hello');

      expect(bad).toHaveBeenCalled();
      expect(good).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('clear', () => {
    it('removes all listeners for all events', () => {
      const a = vi.fn();
      const b = vi.fn();
      bus.on('test:event', a);
      bus.on('test:number', b);
      bus.clear();
      bus.emit('test:event', 'hello');
      bus.emit('test:number', 42);
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
      bus.emit('test:event', 'hello');
      bus.emit('test:number', 42);
      expect(a).not.toHaveBeenCalled();
      expect(b).toHaveBeenCalledWith(42);
    });

    it('is a no-op for an event with no listeners', () => {
      expect(() => bus.clearEvent('test:event')).not.toThrow();
    });
  });

  describe('subscriberCount', () => {
    it('returns 0 when no listeners are registered', () => {
      expect(bus.subscriberCount('test:event')).toBe(0);
    });

    it('returns the correct count after subscribing', () => {
      bus.on('test:event', vi.fn());
      expect(bus.subscriberCount('test:event')).toBe(1);
      bus.on('test:event', vi.fn());
      expect(bus.subscriberCount('test:event')).toBe(2);
    });

    it('returns the correct count after unsubscribing', () => {
      const a = vi.fn();
      bus.on('test:event', a);
      bus.on('test:event', vi.fn());
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
});
