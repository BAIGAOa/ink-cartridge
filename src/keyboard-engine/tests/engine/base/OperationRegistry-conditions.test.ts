import { describe, test, expect } from 'vitest';
import { createEngine } from '../../_helpers/factories.js';

describe('OperationRegistry — conditions', () => {
  describe('addCondition', () => {
    test('Given a new condition id, Then returns true', () => {
      const engine = createEngine();
      expect(engine.addCondition('editing', true)).toBe(true);
    });

    test('Given a duplicate condition id, Then returns false', () => {
      const engine = createEngine();
      engine.addCondition('editing', true);
      expect(engine.addCondition('editing', false)).toBe(false);
    });
  });

  describe('setCondition', () => {
    test('Given a registered condition, updating its value returns true', () => {
      const engine = createEngine();
      engine.addCondition('editing', true);
      expect(engine.setCondition('editing', false)).toBe(true);
    });

    test('Given an unregistered condition, Then returns false', () => {
      const engine = createEngine();
      expect(engine.setCondition('unknown', true)).toBe(false);
    });
  });

  describe('removeCondition', () => {
    test('Given a registered condition, Then removes it and returns true', () => {
      const engine = createEngine();
      engine.addCondition('editing', true);
      expect(engine.removeCondition('editing')).toBe(true);
    });

    test('Given an unregistered condition, Then returns false', () => {
      const engine = createEngine();
      expect(engine.removeCondition('unknown')).toBe(false);
    });
  });
});
