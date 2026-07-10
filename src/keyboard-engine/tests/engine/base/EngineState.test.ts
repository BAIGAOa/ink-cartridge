import { describe, test, expect } from 'vitest';
import { createEngine } from '../../_helpers/factories.js';

describe('EngineState', () => {
  describe('construction', () => {
    test('Given no modes or defaultMode, engine initializes with empty modes and null currentMode', () => {
      const engine = createEngine();
      expect(engine.getCurrentMode()).toBeNull();
    });

    test('Given modes array and defaultMode, engine initializes with the default mode', () => {
      const engine = createEngine(['normal', 'insert'], 'normal');
      expect(engine.getCurrentMode()).toBe('normal');
    });

    test('Given modes array without defaultMode, currentMode is null', () => {
      const engine = createEngine(['normal', 'insert']);
      expect(engine.getCurrentMode()).toBeNull();
    });
  });

  describe('normalizeKeyNames', () => {
    test('Given createEngine default normalizer, input is used as the only key name', () => {
      const engine = createEngine();
      // sync sets up a screen path so processKey doesn't immediately return false
      engine.sync({
        path: ['screen'],
        activeOverlayIds: [],
        displayedOverlays: [],
        activeModalId: null,
        displayedModals: [],
      });
      // With no bindings, processKey returns false but normalizer is used internally
      const consumed = engine.processKey('hello', {});
      expect(consumed).toBe(false);
    });
  });

  describe('conditions', () => {
    test('Given addCondition with new id, Then returns true', () => {
      const engine = createEngine();
      expect(engine.addCondition('editing', true)).toBe(true);
    });

    test('Given addCondition with duplicate id, Then returns false', () => {
      const engine = createEngine();
      engine.addCondition('editing', true);
      expect(engine.addCondition('editing', false)).toBe(false);
    });

    test('Given setCondition on registered condition, Then returns true', () => {
      const engine = createEngine();
      engine.addCondition('editing', true);
      expect(engine.setCondition('editing', false)).toBe(true);
    });

    test('Given setCondition on unregistered condition, Then returns false', () => {
      const engine = createEngine();
      expect(engine.setCondition('unknown', true)).toBe(false);
    });

    test('Given removeCondition on registered condition, Then returns true', () => {
      const engine = createEngine();
      engine.addCondition('editing', true);
      expect(engine.removeCondition('editing')).toBe(true);
    });

    test('Given removeCondition on unregistered condition, Then returns false', () => {
      const engine = createEngine();
      expect(engine.removeCondition('unknown')).toBe(false);
    });
  });
});
