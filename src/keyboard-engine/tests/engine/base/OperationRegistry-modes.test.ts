import { describe, test, expect } from 'vitest';
import { createEngine } from '../../_helpers/factories.js';

describe('OperationRegistry — modes', () => {
  describe('addMode', () => {
    test('Given a new mode name, Then returns true', () => {
      const engine = createEngine();
      expect(engine.addMode('insert')).toBe(true);
    });

    test('Given a duplicate mode name, Then returns false', () => {
      const engine = createEngine(['normal']);
      expect(engine.addMode('normal')).toBe(false);
    });
  });

  describe('removeMode', () => {
    test('Given an existing mode, Then removes it and returns true', () => {
      const engine = createEngine(['normal']);
      expect(engine.removeMode('normal')).toBe(true);
    });

    test('Given a non-existent mode, Then returns false', () => {
      const engine = createEngine();
      expect(engine.removeMode('nonexistent')).toBe(false);
    });
  });

  describe('setMode', () => {
    test('Given a registered mode, Then sets it and returns true', () => {
      const engine = createEngine(['normal', 'insert']);
      expect(engine.setMode('insert')).toBe(true);
      expect(engine.getCurrentMode()).toBe('insert');
    });

    test('Given an unregistered mode, Then returns false', () => {
      const engine = createEngine(['normal']);
      expect(engine.setMode('unknown')).toBe(false);
    });

    test('Given null, Then exits all modes', () => {
      const engine = createEngine(['normal'], 'normal');
      expect(engine.setMode(null)).toBe(true);
      expect(engine.getCurrentMode()).toBeNull();
    });
  });

  describe('nextMode / prevMode', () => {
    test('Given currentMode is first, nextMode cycles to second', () => {
      const engine = createEngine(['normal', 'insert'], 'normal');
      engine.nextMode();
      expect(engine.getCurrentMode()).toBe('insert');
    });

    test('Given currentMode is last, nextMode wraps to first', () => {
      const engine = createEngine(['normal', 'insert'], 'insert');
      engine.nextMode();
      expect(engine.getCurrentMode()).toBe('normal');
    });

    test('Given currentMode is first, prevMode wraps to last', () => {
      const engine = createEngine(['normal', 'insert'], 'normal');
      engine.prevMode();
      expect(engine.getCurrentMode()).toBe('insert');
    });

    test('Given currentMode is null, nextMode sets to first', () => {
      const engine = createEngine(['normal', 'insert']);
      engine.nextMode();
      expect(engine.getCurrentMode()).toBe('normal');
    });

    test('Given no modes registered, nextMode is safe (no-op)', () => {
      const engine = createEngine();
      engine.nextMode();
      expect(engine.getCurrentMode()).toBeNull();
    });

    test('Given no modes registered, prevMode is safe (no-op)', () => {
      const engine = createEngine();
      engine.prevMode();
      expect(engine.getCurrentMode()).toBeNull();
    });
  });

  describe('setMode edge cases', () => {
    test('Given setMode with unregistered non-null mode, Then returns false', () => {
      const engine = createEngine(['normal']);
      expect(engine.setMode('unregistered')).toBe(false);
    });
  });

  describe('getCurrentMode', () => {
    test('Given no mode set, Then returns null', () => {
      const engine = createEngine(['normal']);
      expect(engine.getCurrentMode()).toBeNull();
    });

    test('Given a mode is set, Then returns that mode', () => {
      const engine = createEngine(['normal'], 'normal');
      expect(engine.getCurrentMode()).toBe('normal');
    });
  });
});
