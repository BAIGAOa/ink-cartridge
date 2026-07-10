import { describe, test, expect, vi } from 'vitest';
import { createEngine } from '../_helpers/factories.js';

describe('mode filtering integration', () => {
  function setup(engine: ReturnType<typeof createEngine>) {
    engine.sync({
      path: ['screen'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
  }

  test('Given mode-specific binding, it only fires in the right mode', () => {
    const engine = createEngine(['normal', 'insert'], 'normal');
    setup(engine);
    const normalHandler = vi.fn();
    const insertHandler = vi.fn();
    engine.boundKeyboard(['i'], insertHandler, { mode: 'insert' });
    engine.boundKeyboard(['x'], normalHandler, { mode: 'normal' });

    // In normal mode
    engine.processKey('i', {}); // should NOT fire (mode=insert)
    expect(insertHandler).not.toHaveBeenCalled();
    engine.processKey('x', {}); // should fire (mode=normal)
    expect(normalHandler).toHaveBeenCalled();

    // Switch to insert mode
    engine.setMode('insert');
    engine.processKey('i', {}); // should fire now
    expect(insertHandler).toHaveBeenCalled();
  });

  test('Given binding without mode, it fires in all modes', () => {
    const engine = createEngine(['normal', 'insert'], 'normal');
    setup(engine);
    const handler = vi.fn();
    engine.boundKeyboard(['x'], handler);
    engine.processKey('x', {});
    expect(handler).toHaveBeenCalled();
    engine.setMode('insert');
    engine.processKey('x', {});
    expect(handler).toHaveBeenCalledTimes(2);
  });

  test('Given global key with mode, it only fires in matching mode', () => {
    const engine = createEngine(['normal', 'insert'], 'normal');
    setup(engine);
    const normalOp = vi.fn();
    const insertOp = vi.fn();
    engine.globalKeys([
      { key: 'n', operate: normalOp, mode: 'normal' },
      { key: 'i', operate: insertOp, mode: 'insert' },
    ]);
    engine.processKey('n', {});
    expect(normalOp).toHaveBeenCalled();
    engine.processKey('i', {});
    expect(insertOp).not.toHaveBeenCalled();
    engine.setMode('insert');
    engine.processKey('i', {});
    expect(insertOp).toHaveBeenCalled();
  });
});
