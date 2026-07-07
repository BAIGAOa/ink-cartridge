import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import React, { useEffect } from 'react';
import { Text } from 'ink';
import { clearRegistry, registerComponent } from '../../src/screen/registry.js';
import { clearShortcutOperations } from '../../src/keyboard/provider.js';
import { clearDispatchers } from '../../src/screen/provider.js';
import { useKeyboard } from '../../src/keyboard/hook.js';
import {
  flush,
  pressKey,
  renderKeyboardApp,
  setupKeyboardTests,
  Menu,
} from './base/_helpers.js';

beforeEach(() => {
  setupKeyboardTests();
});

afterEach(() => {
  vi.restoreAllMocks();
  clearShortcutOperations();
  clearDispatchers();
});

describe('addCondition', () => {
  it('returns true when registering a new condition id', async () => {
    let result = false;
    const { unmount } = renderKeyboardApp(Menu, (kb) => {
      result = kb.addCondition('isEditing', false);
    });
    await flush();
    expect(result).toBe(true);
    unmount();
  });

  it('returns false when registering a duplicate condition id', async () => {
    let first = false;
    let second = true;
    const { unmount } = renderKeyboardApp(Menu, (kb) => {
      first = kb.addCondition('isEditing', false);
      second = kb.addCondition('isEditing', true);
    });
    await flush();
    expect(first).toBe(true);
    expect(second).toBe(false);
    unmount();
  });

  it('preserves the original value on duplicate registration', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.addCondition('gate', true);
      kb.addCondition('gate', false); // duplicate — ignored
      kb.boundKeyboard(['a'], handler, { when: 'gate' });
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('setCondition', () => {
  it('returns true when updating a registered condition', async () => {
    let result = false;
    const { unmount } = renderKeyboardApp(Menu, (kb) => {
      kb.addCondition('isEditing', false);
      result = kb.setCondition('isEditing', true);
    });
    await flush();
    expect(result).toBe(true);
    unmount();
  });

  it('returns false when the condition id is not registered', async () => {
    let result = true;
    const { unmount } = renderKeyboardApp(Menu, (kb) => {
      result = kb.setCondition('nonexistent', true);
    });
    await flush();
    expect(result).toBe(false);
    unmount();
  });
});

describe('removeCondition', () => {
  it('returns true when removing an existing condition', async () => {
    let result = false;
    const { unmount } = renderKeyboardApp(Menu, (kb) => {
      kb.addCondition('isEditing', false);
      result = kb.removeCondition('isEditing');
    });
    await flush();
    expect(result).toBe(true);
    unmount();
  });

  it('returns false when removing a nonexistent condition', async () => {
    let result = true;
    const { unmount } = renderKeyboardApp(Menu, (kb) => {
      result = kb.removeCondition('nonexistent');
    });
    await flush();
    expect(result).toBe(false);
    unmount();
  });
});

describe('boundKeyboard with when: string', () => {
  it('fires handler when condition is true', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.addCondition('isEditing', true);
      kb.boundKeyboard(['a'], handler, { when: 'isEditing' });
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('skips binding when condition is false', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.addCondition('isEditing', false);
      kb.boundKeyboard(['a'], handler, { when: 'isEditing' });
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handler).not.toHaveBeenCalled();
  });

  it('responds to runtime setCondition changes', async () => {
    const handler = vi.fn();
    let setCond: (v: boolean) => boolean = () => false;
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.addCondition('gate', false);
      kb.boundKeyboard(['a'], handler, { when: 'gate' });
      setCond = (v) => kb.setCondition('gate', v);
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handler).not.toHaveBeenCalled();

    setCond(true);
    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);

    setCond(false);
    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('throws when condition id is not registered', async () => {
    const handler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.boundKeyboard(['a'], handler, { when: 'notRegistered' });
    });
    await flush();

    await expect(pressKey(stdin, 'a')).rejects.toThrow(
      '[ink-cartridge] Condition "notRegistered" is not registered.',
    );
  });
});

describe('penetration with when: string', () => {
  it('penetrates when condition is true, skipping child handler', async () => {
    const parentY = vi.fn();
    const childY = vi.fn();
    clearRegistry();

    function Parent() {
      const kb = useKeyboard();
      useEffect(() => {
        kb.addCondition('transparent', true);
        kb.boundKeyboard(['y'], parentY);
      }, []);
      return <Text>Parent</Text>;
    }
    Parent.displayName = 'Parent';

    function Child() {
      const kb = useKeyboard();
      useEffect(() => {
        kb.boundKeyboard(['y'], childY);
        kb.penetration(['y'], { when: 'transparent' });
      }, []);
      return <Text>Child</Text>;
    }
    Child.displayName = 'Child';

    registerComponent(Parent, {});
    registerComponent(Child, {}, { parent: Parent });

    const { stdin } = renderKeyboardApp(Parent, (_kb, sc) => {
      sc.skip(Child, {});
    });
    await flush();
    await flush();

    await pressKey(stdin, 'y');
    // condition is true → 'y' penetrates through Child, Parent fires
    expect(childY).not.toHaveBeenCalled();
    expect(parentY).toHaveBeenCalledTimes(1);
  });

  it('does not penetrate when condition is false, child handler fires', async () => {
    const parentY = vi.fn();
    const childY = vi.fn();
    clearRegistry();

    function Parent() {
      const kb = useKeyboard();
      useEffect(() => {
        kb.addCondition('transparent', false);
        kb.boundKeyboard(['y'], parentY);
      }, []);
      return <Text>Parent</Text>;
    }
    Parent.displayName = 'Parent';

    function Child() {
      const kb = useKeyboard();
      useEffect(() => {
        kb.boundKeyboard(['y'], childY);
        kb.penetration(['y'], { when: 'transparent' });
      }, []);
      return <Text>Child</Text>;
    }
    Child.displayName = 'Child';

    registerComponent(Parent, {});
    registerComponent(Child, {}, { parent: Parent });

    const { stdin } = renderKeyboardApp(Parent, (_kb, sc) => {
      sc.skip(Child, {});
    });
    await flush();
    await flush();

    await pressKey(stdin, 'y');
    // condition is false → penetration inactive, Child handler consumes
    expect(childY).toHaveBeenCalledTimes(1);
    expect(parentY).not.toHaveBeenCalled();
  });

  it('responds to runtime setCondition changes', async () => {
    const parentHandler = vi.fn();
    const childHandler = vi.fn();
    let setCond: (v: boolean) => boolean = () => false;
    clearRegistry();

    function Parent() {
      const kb = useKeyboard();
      useEffect(() => {
        kb.addCondition('transparent', false);
        kb.boundKeyboard(['y'], parentHandler);
        setCond = (v) => kb.setCondition('transparent', v);
      }, []);
      return <Text>Parent</Text>;
    }
    Parent.displayName = 'Parent';

    function Child() {
      const kb = useKeyboard();
      useEffect(() => {
        kb.boundKeyboard(['y'], childHandler);
        kb.penetration(['y'], { when: 'transparent' });
      }, []);
      return <Text>Child</Text>;
    }
    Child.displayName = 'Child';

    registerComponent(Parent, {});
    registerComponent(Child, {}, { parent: Parent });

    const { stdin } = renderKeyboardApp(Parent, (_kb, sc) => {
      sc.skip(Child, {});
    });
    await flush();
    await flush();

    // condition is false → penetration inactive, Child handler consumes
    await pressKey(stdin, 'y');
    expect(childHandler).toHaveBeenCalledTimes(1);
    expect(parentHandler).not.toHaveBeenCalled();

    // Enable penetration
    setCond(true);
    await pressKey(stdin, 'y');
    // Now penetrates → Child handler skipped, Parent fires
    expect(childHandler).toHaveBeenCalledTimes(1);
    expect(parentHandler).toHaveBeenCalledTimes(1);
  });
});

describe('stop with when: string', () => {
  it('stops propagation when condition is true', async () => {
    const parentX = vi.fn();
    clearRegistry();

    function Parent() {
      const kb = useKeyboard();
      useEffect(() => {
        kb.addCondition('barrier', true);
        kb.boundKeyboard(['x'], parentX);
      }, []);
      return <Text>Parent</Text>;
    }
    Parent.displayName = 'Parent';

    function Child() {
      const kb = useKeyboard();
      useEffect(() => {
        kb.stop(['x'], { when: 'barrier' });
      }, []);
      return <Text>Child</Text>;
    }
    Child.displayName = 'Child';

    registerComponent(Parent, {});
    registerComponent(Child, {}, { parent: Parent });

    const { stdin } = renderKeyboardApp(Parent, (_kb, sc) => {
      sc.skip(Child, {});
    });
    await flush();
    await flush();

    await pressKey(stdin, 'x');
    // condition true → 'x' stopped at Child, never reaches Parent
    expect(parentX).not.toHaveBeenCalled();
  });

  it('does not stop propagation when condition is false', async () => {
    const parentX = vi.fn();
    clearRegistry();

    function Parent() {
      const kb = useKeyboard();
      useEffect(() => {
        kb.addCondition('barrier', false);
        kb.boundKeyboard(['x'], parentX);
      }, []);
      return <Text>Parent</Text>;
    }
    Parent.displayName = 'Parent';

    function Child() {
      const kb = useKeyboard();
      useEffect(() => {
        kb.stop(['x'], { when: 'barrier' });
      }, []);
      return <Text>Child</Text>;
    }
    Child.displayName = 'Child';

    registerComponent(Parent, {});
    registerComponent(Child, {}, { parent: Parent });

    const { stdin } = renderKeyboardApp(Parent, (_kb, sc) => {
      sc.skip(Child, {});
    });
    await flush();
    await flush();

    await pressKey(stdin, 'x');
    // condition false → stop ignored, 'x' propagates to Parent
    expect(parentX).toHaveBeenCalledTimes(1);
  });
});

describe('allowModal with when: string', () => {
  it('allows key through modal when condition is true', async () => {
    const screenHandler = vi.fn();
    clearRegistry();

    function TestScreen() {
      const kb = useKeyboard();
      useEffect(() => {
        kb.addCondition('openGate', true);
        return kb.boundKeyboard(['x'], screenHandler);
      }, []);
      return <Text>Screen</Text>;
    }
    TestScreen.displayName = 'TestScreen';

    function MyModal() {
      const kb = useKeyboard();
      useEffect(() => {
        return kb.allowModal(['x'], { when: 'openGate' });
      }, []);
      return <Text>MODAL</Text>;
    }
    MyModal.displayName = 'MyModal';

    registerComponent(TestScreen, {});
    registerComponent(MyModal, {});

    const { stdin } = renderKeyboardApp(TestScreen, (_kb, sc) => {
      sc.openModal('m', MyModal, {});
    });
    await flush();
    await flush();

    await pressKey(stdin, 'x');
    // condition true → 'x' passes through modal to screen
    expect(screenHandler).toHaveBeenCalledTimes(1);
  });

  it('blocks key when condition is false', async () => {
    const screenHandler = vi.fn();
    clearRegistry();

    function TestScreen() {
      const kb = useKeyboard();
      useEffect(() => {
        kb.addCondition('openGate', false);
        return kb.boundKeyboard(['x'], screenHandler);
      }, []);
      return <Text>Screen</Text>;
    }
    TestScreen.displayName = 'TestScreen';

    function MyModal() {
      const kb = useKeyboard();
      useEffect(() => {
        return kb.allowModal(['x'], { when: 'openGate' });
      }, []);
      return <Text>MODAL</Text>;
    }
    MyModal.displayName = 'MyModal';

    registerComponent(TestScreen, {});
    registerComponent(MyModal, {});

    const { stdin } = renderKeyboardApp(TestScreen, (_kb, sc) => {
      sc.openModal('m', MyModal, {});
    });
    await flush();
    await flush();

    await pressKey(stdin, 'x');
    // condition false → modal blocks 'x'
    expect(screenHandler).not.toHaveBeenCalled();
  });
});

describe('globalKeys with when: string', () => {
  it('fires global key when condition is true', async () => {
    const globalHandler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.addCondition('globalGate', true);
      kb.globalKeys([{
        key: 'g',
        operate: globalHandler,
        when: 'globalGate',
      }]);
    });
    await flush();

    await pressKey(stdin, 'g');
    expect(globalHandler).toHaveBeenCalledTimes(1);
  });

  it('skips global key when condition is false', async () => {
    const globalHandler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.addCondition('globalGate', false);
      kb.globalKeys([{
        key: 'g',
        operate: globalHandler,
        when: 'globalGate',
      }]);
    });
    await flush();

    await pressKey(stdin, 'g');
    expect(globalHandler).not.toHaveBeenCalled();
  });

  it('responds to runtime setCondition changes', async () => {
    const globalHandler = vi.fn();
    let setCond: (v: boolean) => boolean = () => false;
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.addCondition('globalGate', false);
      kb.globalKeys([{
        key: 'g',
        operate: globalHandler,
        when: 'globalGate',
      }]);
      setCond = (v) => kb.setCondition('globalGate', v);
    });
    await flush();

    await pressKey(stdin, 'g');
    expect(globalHandler).not.toHaveBeenCalled();

    setCond(true);
    await pressKey(stdin, 'g');
    expect(globalHandler).toHaveBeenCalledTimes(1);
  });
});

describe('globalSequence with when: string', () => {
  it('starts and completes sequence when condition is true', async () => {
    const seqHandler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.addCondition('seqGate', true);
      kb.globalSequence([{
        keys: ['a', 'b'],
        operate: seqHandler,
        when: 'seqGate',
      }]);
    });
    await flush();

    await pressKey(stdin, 'a');
    await pressKey(stdin, 'b');
    expect(seqHandler).toHaveBeenCalledTimes(1);
  });

  it('does not start sequence when condition is false', async () => {
    const seqHandler = vi.fn();
    const fallbackHandler = vi.fn();
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.addCondition('seqGate', false);
      kb.globalSequence([{
        keys: ['a', 'b'],
        operate: seqHandler,
        when: 'seqGate',
      }]);
      kb.boundKeyboard(['a'], fallbackHandler);
    });
    await flush();

    await pressKey(stdin, 'a');
    // condition false → sequence not started
    expect(seqHandler).not.toHaveBeenCalled();
  });

  it('cancels pending sequence when condition becomes false mid-sequence', async () => {
    const seqHandler = vi.fn();
    let setCond: (v: boolean) => boolean = () => false;
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.addCondition('seqGate', true);
      kb.globalSequence([{
        keys: ['a', 'b'],
        operate: seqHandler,
        when: 'seqGate',
      }]);
      setCond = (v) => kb.setCondition('seqGate', v);
    });
    await flush();

    await pressKey(stdin, 'a');
    // Disable mid-sequence
    setCond(false);
    await pressKey(stdin, 'b');
    expect(seqHandler).not.toHaveBeenCalled();
  });
});

describe('boundSequence with when: string', () => {
  it('completes sequence when condition is true', async () => {
    const seqHandler = vi.fn();
    clearRegistry();

    function SeqScreen() {
      const kb = useKeyboard();
      useEffect(() => {
        kb.addCondition('seqGate', true);
        kb.boundSequence(['a', 'b'], seqHandler, { when: 'seqGate' });
      }, []);
      return <Text>SeqScreen</Text>;
    }
    SeqScreen.displayName = 'SeqScreen';
    registerComponent(SeqScreen, {});

    const { stdin } = renderKeyboardApp(SeqScreen);
    await flush();

    await pressKey(stdin, 'a');
    await pressKey(stdin, 'b');
    expect(seqHandler).toHaveBeenCalledTimes(1);
  });

  it('does not start sequence when condition is false', async () => {
    const seqHandler = vi.fn();
    clearRegistry();

    function SeqScreen() {
      const kb = useKeyboard();
      useEffect(() => {
        kb.addCondition('seqGate', false);
        kb.boundSequence(['a', 'b'], seqHandler, { when: 'seqGate' });
      }, []);
      return <Text>SeqScreen</Text>;
    }
    SeqScreen.displayName = 'SeqScreen';
    registerComponent(SeqScreen, {});

    const { stdin } = renderKeyboardApp(SeqScreen);
    await flush();

    await pressKey(stdin, 'a');
    expect(seqHandler).not.toHaveBeenCalled();
  });

  it('cancels pending sequence when condition becomes false mid-sequence', async () => {
    const seqHandler = vi.fn();
    let setCond: (v: boolean) => boolean = () => false;
    clearRegistry();

    function SeqScreen() {
      const kb = useKeyboard();
      useEffect(() => {
        kb.addCondition('seqGate', true);
        kb.boundSequence(['a', 'b'], seqHandler, { when: 'seqGate' });
        setCond = (v) => kb.setCondition('seqGate', v);
      }, []);
      return <Text>SeqScreen</Text>;
    }
    SeqScreen.displayName = 'SeqScreen';
    registerComponent(SeqScreen, {});

    const { stdin } = renderKeyboardApp(SeqScreen);
    await flush();

    await pressKey(stdin, 'a');
    setCond(false);
    await pressKey(stdin, 'b');
    expect(seqHandler).not.toHaveBeenCalled();
  });
});

describe('shared condition across multiple bindings', () => {
  it('one setCondition toggles all bindings sharing the condition', async () => {
    const handlerA = vi.fn();
    const handlerB = vi.fn();
    let setCond: (v: boolean) => boolean = () => false;
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.addCondition('shared', true);
      kb.boundKeyboard(['a'], handlerA, { when: 'shared' });
      kb.boundKeyboard(['b'], handlerB, { when: 'shared' });
      setCond = (v) => kb.setCondition('shared', v);
    });
    await flush();

    await pressKey(stdin, 'a');
    await pressKey(stdin, 'b');
    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).toHaveBeenCalledTimes(1);

    setCond(false);
    await pressKey(stdin, 'a');
    await pressKey(stdin, 'b');
    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).toHaveBeenCalledTimes(1);
  });
});

describe('removeCondition error', () => {
  it('throws after condition is removed and referenced binding is triggered', async () => {
    const handler = vi.fn();
    let removeCond: () => boolean = () => false;
    const { stdin } = renderKeyboardApp(Menu, (kb) => {
      kb.addCondition('temp', true);
      kb.boundKeyboard(['a'], handler, { when: 'temp' });
      removeCond = () => kb.removeCondition('temp');
    });
    await flush();

    await pressKey(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);

    removeCond();

    await expect(pressKey(stdin, 'a')).rejects.toThrow(
      '[ink-cartridge] Condition "temp" is not registered.',
    );
  });
});
