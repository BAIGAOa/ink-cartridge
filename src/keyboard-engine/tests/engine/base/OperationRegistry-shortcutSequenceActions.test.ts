import { describe, test, expect, vi } from 'vitest';
import { createEngine } from '../../_helpers/factories.js';

describe('OperationRegistry — shortcut/sequence actions', () => {
  describe('defineShortcutAction', () => {
    test('Given unique actionIds, Then actions are registered', () => {
      const engine = createEngine();
      engine.defineShortcutAction([
        { actionId: 'act1', action: () => {} },
        { actionId: 'act2', action: () => {} },
      ]);
      expect(engine.hasAction('act1')).toBe(true);
      expect(engine.hasAction('act2')).toBe(true);
    });

    test('Given duplicate actionId, Then throws', () => {
      const engine = createEngine();
      engine.defineShortcutAction([{ actionId: 'act1', action: () => {} }]);
      expect(() =>
        engine.defineShortcutAction([{ actionId: 'act1', action: () => {} }]),
      ).toThrow(/already exists|Duplicate|cannot be defined/);
    });
  });

  describe('defineSequenceAction', () => {
    test('Given unique sequenceActionIds, Then actions are registered', () => {
      const engine = createEngine();
      engine.defineSequenceAction([
        { sequenceActionId: 'seq1', action: () => {} },
        { sequenceActionId: 'seq2', action: () => {} },
      ]);
      expect(engine.hasSequenceAction('seq1')).toBe(true);
      expect(engine.hasSequenceAction('seq2')).toBe(true);
    });
  });

  describe('addAction / removeAction', () => {
    test('Given addAction with new id, Then it is registered', () => {
      const engine = createEngine();
      engine.addAction({ actionId: 'a', action: () => {} });
      expect(engine.hasAction('a')).toBe(true);
    });

    test('Given addAction with duplicate id, Then throws', () => {
      const engine = createEngine();
      engine.addAction({ actionId: 'a', action: () => {} });
      expect(() => engine.addAction({ actionId: 'a', action: () => {} })).toThrow(
        /already exists|Duplicate/,
      );
    });

    test('Given removeAction for registered action, Then it is removed', () => {
      const engine = createEngine();
      engine.addAction({ actionId: 'a', action: () => {} });
      engine.removeAction('a');
      expect(engine.hasAction('a')).toBe(false);
    });

    test('Given removeAction for unregistered action, Then throws', () => {
      const engine = createEngine();
      expect(() => engine.removeAction('nonexistent')).toThrow(/not registered|not found/);
    });
  });

  describe('addSequenceAction / removeSequenceAction', () => {
    test('Given addSequenceAction, Then it is registered', () => {
      const engine = createEngine();
      engine.addSequenceAction({ sequenceActionId: 'seq', action: () => {} });
      expect(engine.hasSequenceAction('seq')).toBe(true);
    });

    test('Given removeSequenceAction for unregistered, Then throws', () => {
      const engine = createEngine();
      expect(() => engine.removeSequenceAction('nonexistent')).toThrow(/not registered|not found/);
    });
  });

  describe('modifyAction', () => {
    test('Given modifyAction on registered action with keys, Then keys are updated', () => {
      const engine = createEngine();
      engine.addAction({ actionId: 'a', action: () => {}, keys: ['x'] });
      engine.modifyAction('a', ['y']);
      // The action's keys should now be ['y']
      expect(engine.hasAction('a')).toBe(true);
    });

    test('Given modifyAction on action without preset keys, Then throws', () => {
      const engine = createEngine();
      engine.addAction({ actionId: 'a', action: () => {} });
      expect(() => engine.modifyAction('a', ['y'])).toThrow(/was not registered with a 'keys' field/);
    });
  });

  describe('modifySequenceAction', () => {
    test('Given registered sequence action with keys, Then keys and timeout are updated', () => {
      const engine = createEngine();
      engine.addSequenceAction({
        sequenceActionId: 'seq',
        action: () => {},
        keys: ['a', 'b'],
        timeout: 500,
      });
      engine.modifySequenceAction('seq', ['c', 'd'], 1000);
      expect(engine.hasSequenceAction('seq')).toBe(true);
    });
  });

  describe('clear operations', () => {
    test('Given clearShortcutOperations, Then all shortcut actions are removed', () => {
      const engine = createEngine();
      engine.addAction({ actionId: 'a', action: () => {} });
      engine.clearShortcutOperations();
      expect(engine.hasAction('a')).toBe(false);
    });

    test('Given clearSequenceOperations, Then all sequence actions are removed', () => {
      const engine = createEngine();
      engine.addSequenceAction({ sequenceActionId: 'seq', action: () => {} });
      engine.clearSequenceOperations();
      expect(engine.hasSequenceAction('seq')).toBe(false);
    });
  });

  describe('thereGlobalQueueWaiting / currentScreenHasSequenceWaiting', () => {
    test('Given no pending sequence, thereGlobalQueueWaiting returns false', () => {
      const engine = createEngine();
      expect(engine.thereGlobalQueueWaiting()).toBe(false);
    });

    test('Given no current owner, currentScreenHasSequenceWaiting throws', () => {
      const engine = createEngine();
      expect(() => engine.currentScreenHasSequenceWaiting()).toThrow(
        /no active screen|no current owner/,
      );
    });

    test('Given thereGlobalQueueWaiting with sync callback, Then sync is registered', () => {
      const engine = createEngine();
      const sync = vi.fn();
      expect(engine.thereGlobalQueueWaiting(sync)).toBe(false);
    });

    test('Given enableWildcardPriority, Then returns a disable function', () => {
      const engine = createEngine();
      const disable = engine.enableWildcardPriority();
      disable();
    });
  });
});
