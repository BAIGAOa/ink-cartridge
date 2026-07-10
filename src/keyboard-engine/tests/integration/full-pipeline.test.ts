import { describe, test, expect, vi } from 'vitest';
import { createEngine } from '../_helpers/factories.js';

describe('full pipeline integration', () => {
  function setup(engine: ReturnType<typeof createEngine>) {
    engine.sync({
      path: ['screen'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
  }

  test('Given a screen binding, processKey calls the handler', () => {
    const engine = createEngine();
    setup(engine);
    const handler = vi.fn();
    engine.boundKeyboard(['x'], handler);
    engine.processKey('x', {});
    expect(handler).toHaveBeenCalledWith('x', {});
  });

  test('Given no binding matches, handler is not called', () => {
    const engine = createEngine();
    setup(engine);
    const handler = vi.fn();
    engine.boundKeyboard(['y'], handler);
    engine.processKey('x', {});
    expect(handler).not.toHaveBeenCalled();
  });

  test('Given a global key, it fires when matching key is pressed', () => {
    const engine = createEngine();
    setup(engine);
    const globalOp = vi.fn();
    engine.globalKeys([{ key: 'x', operate: globalOp }]);
    engine.processKey('x', {});
    expect(globalOp).toHaveBeenCalled();
  });

  test('Given a global key with cover=false, global key fires even with screen binding', () => {
    const engine = createEngine();
    setup(engine);
    const globalOp = vi.fn();
    const screenHandler = vi.fn();
    engine.globalKeys([{ key: 'x', operate: globalOp, cover: false }]);
    // cover=false means screen CANNOT override — engine.boundKeyboard would throw
    // So we don't bind screen to 'x'
    engine.boundKeyboard('y', screenHandler);
    engine.processKey('x', {});
    expect(globalOp).toHaveBeenCalled();
  });

  test('Given a modal active, screen keys are blocked', () => {
    const engine = createEngine();
    engine.sync({
      path: ['screen'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: 'modal1',
      displayedModals: [{ id: 'modal1' }],
    });
    const screenHandler = vi.fn();
    engine.boundKeyboard('x', screenHandler);
    // Modal is active — screen bindings should be blocked
    const consumed = engine.processKey('x', {});
    expect(consumed).toBe(true); // modal processor returns true
    expect(screenHandler).not.toHaveBeenCalled();
  });

  test('Given processKey with custom processors, custom processor runs in pipeline', () => {
    const engine = createEngine();
    setup(engine);
    const customHandler = vi.fn();
    engine.addProcessor({
      id: 'custom',
      process(ctx) {
        if (ctx.eventNames.includes('z')) {
          customHandler();
          return true;
        }
        return false;
      },
    }, { index: 0 });
    engine.processKey('z', {});
    expect(customHandler).toHaveBeenCalled();
  });

  test('Given globalSequence with matching keys, sequence fires after all keys pressed', () => {
    const engine = createEngine();
    setup(engine);
    const handler = vi.fn();
    engine.globalSequence([{ keys: ['g', 'g'], operate: handler }]);
    engine.processKey('g', {}); // start
    expect(handler).not.toHaveBeenCalled();
    engine.processKey('g', {}); // complete
    expect(handler).toHaveBeenCalled();
  });

  test('Given boundSequence on screen, sequence fires after all keys pressed', () => {
    const engine = createEngine();
    setup(engine);
    const handler = vi.fn();
    engine.boundSequence(['a', 'b', 'c'], handler);
    engine.processKey('a', {});
    engine.processKey('b', {});
    engine.processKey('c', {});
    expect(handler).toHaveBeenCalled();
  });
});
