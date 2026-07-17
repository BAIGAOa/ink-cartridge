import { describe, test, expect, vi } from 'vitest';
import { createEngine } from '../../_helpers/factories.js';

describe('LayerManager — focus', () => {
  function setupScreen(engine: ReturnType<typeof createEngine>) {
    engine.sync({
      path: ['screenA'],
      activeOverlayIds: [],
      displayedOverlays: [],
      activeModalId: null,
      displayedModals: [],
    });
  }

  describe('focusSet', () => {
    test('Given focusSet called with a focusId previously registered via boundKeyboard, Then currentFocusId is set', () => {
      const engine = createEngine();
      setupScreen(engine);
      // Create a focus target by binding with focusId
      engine.boundKeyboard('x', () => {}, { focusId: 'input1' });
      // Now focusSet should work
      engine.focusSet('input1');
      expect(engine.focusCurrent().result?.id).toBe('input1');
    });

    test('Given boundKeyboard creates focus targets, focusSet switches between them', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: 'input1' });
      engine.boundKeyboard('b', () => {}, { focusId: 'input2' });
      engine.focusSet('input2');
      expect(engine.focusCurrent().result?.id).toBe('input2');
      engine.focusSet('input1');
      expect(engine.focusCurrent().result?.id).toBe('input1');
    });

    test('Given no current owner (no screen path), focusSet is a no-op (does not throw)', () => {
      const engine = createEngine();
      engine.focusSet('input1');
      expect(engine.focusCurrent().noOwner).toBe(true);
    });

    test('Given owner exists but no layer created, focusSet throws layer-not-found error', () => {
      const engine = createEngine();
      // Sync to set up path but DON'T call boundKeyboard — no layer is created
      engine.sync({
        path: ['screenA'],
        activeOverlayIds: [],
        displayedOverlays: [],
        activeModalId: null,
        displayedModals: [],
      });
      expect(() => engine.focusSet('input1')).toThrow(
        /no keyboard layer found/,
      );
    });

    test('Given focusSet with unregistered id on a layer that exists, Then throws', () => {
      const engine = createEngine();
      setupScreen(engine);
      // Create a layer first by binding a key without focusId
      engine.boundKeyboard('x', () => {});
      expect(() => engine.focusSet('nonexistent')).toThrow(
        /focus target not found/,
      );
    });

    test('Given focusSet with unregistered id but registered default targets, Then throws listing available', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: 'real1' });
      engine.boundKeyboard('b', () => {}, { focusId: 'real2' });
      expect(() => engine.focusSet('nonexistent')).toThrow(
        /focus target not found/,
      );
      expect(() => engine.focusSet('nonexistent')).toThrow(/"real1"/);
    });
  });

  describe('focusNext / focusPrev', () => {
    test('Given focus targets exist, focusNext cycles through them', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: 'a' });
      engine.boundKeyboard('b', () => {}, { focusId: 'b' });
      engine.boundKeyboard('c', () => {}, { focusId: 'c' });
      // first registered focusId is auto-selected
      engine.focusNext();
      expect(engine.focusCurrent().result?.id).toBe('b');
      engine.focusNext();
      expect(engine.focusCurrent().result?.id).toBe('c');
      engine.focusNext();
      expect(engine.focusCurrent().result?.id).toBe('a');
    });

    test('Given focus targets, focusPrev cycles backward', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: 'a' });
      engine.boundKeyboard('b', () => {}, { focusId: 'b' });
      engine.boundKeyboard('c', () => {}, { focusId: 'c' });
      engine.focusPrev();
      expect(engine.focusCurrent().result?.id).toBe('c');
    });

    test('Given no focus targets, focusNext is safe (no-op)', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.focusNext();
      expect(engine.focusCurrent().noLayer).toBe(true);
    });

    test('Given no current owner, focusNext does not throw', () => {
      const engine = createEngine();
      engine.focusNext();
      expect(engine.focusCurrent().noOwner).toBe(true);
    });
  });

  describe('focusUnregister', () => {
    test('Given focusUnregister removes the active target, Then next target is auto-selected', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: 'a' });
      engine.boundKeyboard('b', () => {}, { focusId: 'b' });
      engine.focusUnregister('a');
      expect(engine.focusCurrent().result?.id).toBe('b');
    });

    test('Given focusUnregister removes the only target, Then currentFocusId becomes null', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('x', () => {}, { focusId: 'only' });
      engine.focusUnregister('only');
      expect(engine.focusCurrent().noFound).toBe(true);
    });
  });

  describe('subscribeFocus', () => {
    test('Given a subscriber registered, Then it is notified on focusSet', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('x', () => {}, { focusId: 'a' });
      engine.boundKeyboard('y', () => {}, { focusId: 'b' });
      const listener = vi.fn();
      engine.subscribeFocus(listener);
      engine.focusSet('b');
      expect(listener).toHaveBeenCalled();
    });

    test('Given unsubscribe is called, Then listener is no longer notified', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('x', () => {}, { focusId: 'a' });
      const listener = vi.fn();
      const unsubscribe = engine.subscribeFocus(listener);
      unsubscribe();
      engine.focusSet('a');
      expect(listener).not.toHaveBeenCalled();
    });

    test('Given boundKeyboard with focusId auto-selects first focus target, subscriber is notified', () => {
      const engine = createEngine();
      setupScreen(engine);
      const listener = vi.fn();
      engine.subscribeFocus(listener);
      // first focus target auto-select triggers notification
      engine.boundKeyboard('x', () => {}, { focusId: 'a' });
      expect(listener).toHaveBeenCalled();
    });
  });

  // Multi-focus system: group-scoped focus targets. Each group tracks its own
  // active focus independently of the default group and of other named groups,
  // so several focus targets can be active on one layer simultaneously.
  describe('group-scoped focus', () => {
    test('Given boundKeyboard with {group, focusId}, focusCurrent(group) returns that target', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: { group: 'row', focusId: 'r1' } });
      expect(engine.focusCurrent('row').result?.id).toBe('r1');
    });

    test('Given a group focus registered after a default one, the default group keeps focus and the named group stays inactive until focusSet', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: 'def1' });
      engine.boundKeyboard('b', () => {}, { focusId: { group: 'row', focusId: 'r1' } });
      // def1 auto-selected because currentFocusIds was empty; 'row' group was
      // NOT auto-activated because the default slot already filled the list.
      expect(engine.focusCurrent().result?.id).toBe('def1');
      expect(engine.focusCurrent('row').noFound).toBe(true);
      // Explicit activation is required for a group registered after the first.
      engine.focusSet('r1', 'row');
      expect(engine.focusCurrent('row').result?.id).toBe('r1');
    });

    test('Given two targets in the same group, focusSet switches the group active target', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: { group: 'row', focusId: 'r1' } });
      engine.boundKeyboard('b', () => {}, { focusId: { group: 'row', focusId: 'r2' } });
      expect(engine.focusCurrent('row').result?.id).toBe('r1');
      engine.focusSet('r2', 'row');
      expect(engine.focusCurrent('row').result?.id).toBe('r2');
    });

    test('Given focusSet on a group with only one slot, the previous active is replaced not duplicated', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: { group: 'row', focusId: 'r1' } });
      engine.boundKeyboard('b', () => {}, { focusId: { group: 'row', focusId: 'r2' } });
      engine.focusSet('r2', 'row');
      // Only one entry for the group should exist in currentFocusIds
      const layer = engine.readLayer('screenA');
      const groupEntries = layer!.currentFocusIds.filter((e) => e.fromGroup === 'row');
      expect(groupEntries).toHaveLength(1);
      expect(groupEntries[0].id).toBe('r2');
    });

    test('Given focusNext on a group, cycles within that group only', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: { group: 'row', focusId: 'r1' } });
      engine.boundKeyboard('b', () => {}, { focusId: { group: 'row', focusId: 'r2' } });
      engine.boundKeyboard('c', () => {}, { focusId: { group: 'row', focusId: 'r3' } });
      engine.focusNext('row');
      expect(engine.focusCurrent('row').result?.id).toBe('r2');
      engine.focusNext('row');
      expect(engine.focusCurrent('row').result?.id).toBe('r3');
      engine.focusNext('row');
      expect(engine.focusCurrent('row').result?.id).toBe('r1');
    });

    test('Given focusPrev on a group, cycles backward within that group only', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: { group: 'row', focusId: 'r1' } });
      engine.boundKeyboard('b', () => {}, { focusId: { group: 'row', focusId: 'r2' } });
      engine.boundKeyboard('c', () => {}, { focusId: { group: 'row', focusId: 'r3' } });
      engine.focusPrev('row');
      expect(engine.focusCurrent('row').result?.id).toBe('r3');
    });

    test('Given focusNext on default group does not disturb a named group', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: 'def1' });
      engine.boundKeyboard('b', () => {}, { focusId: 'def2' });
      engine.boundKeyboard('c', () => {}, { focusId: { group: 'row', focusId: 'r1' } });
      // Explicitly activate the 'row' group since it was registered after def1.
      engine.focusSet('r1', 'row');
      engine.focusNext();
      expect(engine.focusCurrent().result?.id).toBe('def2');
      expect(engine.focusCurrent('row').result?.id).toBe('r1');
    });

    test('Given focusSet on an unregistered group, throws', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: 'def1' });
      expect(() => engine.focusSet('x', 'nope')).toThrow(/not registered/);
    });

    test('Given focusNext on an unregistered group, throws', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: 'def1' });
      expect(() => engine.focusNext('nope')).toThrow(/not registered/);
    });

    test('Given focusPrev on an unregistered group, throws', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: 'def1' });
      expect(() => engine.focusPrev('nope')).toThrow(/not registered/);
    });

    test('Given focusNext on a registered group with no active focus, does not throw and does not activate', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: { group: 'row', focusId: 'r1' } });
      engine.boundKeyboard('b', () => {}, { focusId: { group: 'row', focusId: 'r2' } });
      // Clear the group's active focus by unregistering both targets.
      // The group entry remains in focusTargets (empty) but has no currentFocusIds slot.
      engine.focusUnregister('r1', 'row');
      engine.focusUnregister('r2', 'row');
      expect(() => engine.focusNext('row')).not.toThrow();
      expect(engine.focusCurrent('row').noFound).toBe(true);
    });

    test('Given focusPrev on a registered group with no active focus, does not throw', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: { group: 'row', focusId: 'r1' } });
      engine.focusUnregister('r1', 'row');
      expect(() => engine.focusPrev('row')).not.toThrow();
      expect(engine.focusCurrent('row').noFound).toBe(true);
    });

    test('Given focusSet with an unregistered focusId in a registered group, throws', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: { group: 'row', focusId: 'r1' } });
      expect(() => engine.focusSet('missing', 'row')).toThrow(/focus target not found/);
    });

    test('Given focusCurrent on an unregistered group, throws', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: 'def1' });
      expect(() => engine.focusCurrent('nope')).toThrow(/not registered/);
    });

    test('Given focusCurrent on a registered group with no active focus, returns noFound', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: { group: 'row', focusId: 'r1' } });
      engine.focusUnregister('r1', 'row');
      expect(engine.focusCurrent('row').noFound).toBe(true);
    });

    test('Given focusUnregister removes the active group target, the next target is auto-activated', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: { group: 'row', focusId: 'r1' } });
      engine.boundKeyboard('b', () => {}, { focusId: { group: 'row', focusId: 'r2' } });
      engine.focusSet('r1', 'row');
      engine.focusUnregister('r1', 'row');
      expect(engine.focusCurrent('row').result?.id).toBe('r2');
    });

    test('Given focusUnregister removes the only group target, the group focus slot is cleared', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: { group: 'row', focusId: 'r1' } });
      engine.focusUnregister('r1', 'row');
      expect(engine.focusCurrent('row').noFound).toBe(true);
    });

    test('Given focusUnregister on an unregistered group, does not throw', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: 'def1' });
      expect(() => engine.focusUnregister('x', 'nope')).not.toThrow();
    });

    test('Given focusUnregister on a focusId absent from the current layer, does not throw', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: { group: 'row', focusId: 'r1' } });
      expect(() => engine.focusUnregister('missing', 'row')).not.toThrow();
    });

    test('Given multiple groups, each maintains an independent active focus', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: { group: 'row', focusId: 'r1' } });
      engine.boundKeyboard('b', () => {}, { focusId: { group: 'row', focusId: 'r2' } });
      engine.boundKeyboard('c', () => {}, { focusId: { group: 'col', focusId: 'c1' } });
      engine.boundKeyboard('d', () => {}, { focusId: { group: 'col', focusId: 'c2' } });
      engine.focusSet('r2', 'row');
      engine.focusSet('c1', 'col');
      expect(engine.focusCurrent('row').result?.id).toBe('r2');
      expect(engine.focusCurrent('col').result?.id).toBe('c1');
      const layer = engine.readLayer('screenA');
      const active = layer!.currentFocusIds;
      expect(active).toHaveLength(2);
      expect(active.map((e) => e.id).sort()).toEqual(['c1', 'r2']);
    });

    test('Given a subscriber registered, focusSet on a named group notifies it', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: { group: 'row', focusId: 'r1' } });
      engine.boundKeyboard('b', () => {}, { focusId: { group: 'row', focusId: 'r2' } });
      const listener = vi.fn();
      engine.subscribeFocus(listener);
      engine.focusSet('r2', 'row');
      expect(listener).toHaveBeenCalled();
    });

    test('Given boundKeyboard auto-selects the first group target, subscriber is notified', () => {
      const engine = createEngine();
      setupScreen(engine);
      const listener = vi.fn();
      engine.subscribeFocus(listener);
      engine.boundKeyboard('a', () => {}, { focusId: { group: 'row', focusId: 'r1' } });
      expect(listener).toHaveBeenCalled();
    });
  });

  // During unmount, sync() advances state.path to the new screen BEFORE the
  // unmounting component's effect cleanup runs. focusUnregister must therefore
  // be a silent no-op when the focusId is absent from the current owner's
  // layer — cleanLayers() removes the whole stale layer shortly after.
  describe('focusUnregister across navigation', () => {
    test('Given focusId registered on screenA, after sync to screenB focusUnregister does not throw', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: 'def1' });
      // Navigate: path now points at screenB which has no layer / focusId
      engine.sync({
        path: ['screenB'],
        activeOverlayIds: [],
        displayedOverlays: [],
        activeModalId: null,
        displayedModals: [],
      });
      expect(() => engine.focusUnregister('def1')).not.toThrow();
    });

    test('Given group focusId registered on screenA, after sync to screenB focusUnregister does not throw', () => {
      const engine = createEngine();
      setupScreen(engine);
      engine.boundKeyboard('a', () => {}, { focusId: { group: 'row', focusId: 'r1' } });
      engine.sync({
        path: ['screenB'],
        activeOverlayIds: [],
        displayedOverlays: [],
        activeModalId: null,
        displayedModals: [],
      });
      expect(() => engine.focusUnregister('r1', 'row')).not.toThrow();
    });
  });
});
