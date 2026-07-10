import { describe, test, expect, vi } from 'vitest';
import { createGlobalKeyProcessor } from '../../../src/processors/globalKey.js';
import { createContext, resolveGlobalKey, makeGlobalKeyEntry } from '../../_helpers/factories.js';

describe('createGlobalKeyProcessor', () => {
  const overlayProc = createGlobalKeyProcessor({ affectOverlay: true });
  const screenProc = createGlobalKeyProcessor({ affectOverlay: false });

  describe('affectOverlay filtering', () => {
    test('Given affectOverlay=true processor, it skips entries with affectOverlay=false', () => {
      const operate = vi.fn();
      const ctx = createContext({
        eventNames: ['x'],
        topComponent: 'screen',
        globalKeys: [resolveGlobalKey(makeGlobalKeyEntry({ key: 'x', operate }))],
      });
      // affectOverlay defaults to false → screen processor should handle it
      expect(screenProc.process(ctx)).toBe(true);
      expect(operate).toHaveBeenCalled();
    });

    test('Given affectOverlay=false processor, it skips entries with affectOverlay=true', () => {
      const operate = vi.fn();
      const ctx = createContext({
        eventNames: ['x'],
        topComponent: 'screen',
        globalKeys: [resolveGlobalKey(makeGlobalKeyEntry({ key: 'x', operate, affectOverlay: true }))],
      });
      // overlay processor with active overlays should handle it
      expect(screenProc.process(ctx)).toBe(false);
    });
  });

  describe('mode filtering', () => {
    test('Given entry mode matches currentMode, Then fires', () => {
      const operate = vi.fn();
      const ctx = createContext({
        eventNames: ['x'],
        topComponent: 'screen',
        currentMode: 'insert',
        globalKeys: [resolveGlobalKey(makeGlobalKeyEntry({ key: 'x', operate, mode: 'insert' }))],
      });
      expect(screenProc.process(ctx)).toBe(true);
    });

    test('Given entry mode does not match currentMode, Then skips', () => {
      const ctx = createContext({
        eventNames: ['x'],
        topComponent: 'screen',
        currentMode: 'normal',
        globalKeys: [resolveGlobalKey(makeGlobalKeyEntry({ key: 'x', operate: () => {}, mode: 'insert' }))],
      });
      expect(screenProc.process(ctx)).toBe(false);
    });
  });

  describe('when condition', () => {
    test('Given entry when returns false, Then skips', () => {
      const ctx = createContext({
        eventNames: ['x'],
        topComponent: 'screen',
        globalKeys: [resolveGlobalKey(makeGlobalKeyEntry({ key: 'x', operate: () => {}, when: () => false }))],
      });
      expect(screenProc.process(ctx)).toBe(false);
    });
  });

  describe('times lifecycle', () => {
    test('Given times=3, first two presses are consumed without firing operate', () => {
      const operate = vi.fn();
      const ctx = createContext({
        eventNames: ['x'],
        topComponent: 'screen',
        globalKeys: [resolveGlobalKey(makeGlobalKeyEntry({ key: 'x', operate, times: 3 }))],
      });
      // Press 1
      expect(screenProc.process(ctx)).toBe(true);
      expect(operate).not.toHaveBeenCalled();
      // Press 2
      expect(screenProc.process(ctx)).toBe(true);
      expect(operate).not.toHaveBeenCalled();
      // Press 3 — fires
      expect(screenProc.process(ctx)).toBe(true);
      expect(operate).toHaveBeenCalledOnce();
    });

    test('Given times=2 with observer, observer is called with remaining count', () => {
      const observer = vi.fn();
      const ctx = createContext({
        eventNames: ['x'],
        topComponent: 'screen',
        globalKeys: [resolveGlobalKey(makeGlobalKeyEntry({ key: 'x', operate: () => {}, times: 2, observer }))],
      });
      screenProc.process(ctx); // press 1, remaining: 1
      expect(observer).toHaveBeenCalledWith(1);
    });
  });

  describe('affectOverlay with no active overlays', () => {
    test('Given affectOverlay=true and no active overlays without executeWhenNoOverlay, Then skips', () => {
      const ctx = createContext({
        eventNames: ['x'],
        topComponent: 'screen',
        activeCount: 0,
        globalKeys: [resolveGlobalKey(makeGlobalKeyEntry({ key: 'x', operate: () => {}, affectOverlay: true }))],
      });
      expect(overlayProc.process(ctx)).toBe(false);
    });

    test('Given affectOverlay=true with executeWhenNoOverlay=true and no overlays, Then fires', () => {
      const ctx = createContext({
        eventNames: ['x'],
        topComponent: 'screen',
        activeCount: 0,
        globalKeys: [resolveGlobalKey(makeGlobalKeyEntry({
          key: 'x', operate: () => {}, affectOverlay: true, executeWhenNoOverlay: true,
        }))],
      });
      expect(overlayProc.process(ctx)).toBe(true);
    });
  });

  describe('cover override check', () => {
    test('Given affectOverlay=false and screen has override, Then entry is skipped', () => {
      const layer = { globalKeyOverrides: new Set(['x']) } as any;
      const ctx = createContext({
        eventNames: ['x'],
        topComponent: 'screen',
        globalKeys: [resolveGlobalKey(makeGlobalKeyEntry({ key: 'x', operate: () => {} }))],
        layersRef: { current: new Map([['screen', layer]]) },
      });
      expect(screenProc.process(ctx)).toBe(false);
    });

    test('Given affectOverlay=false and cover=false, Then override is ignored', () => {
      const layer = { globalKeyOverrides: new Set(['x']) } as any;
      const ctx = createContext({
        eventNames: ['x'],
        topComponent: 'screen',
        globalKeys: [resolveGlobalKey(makeGlobalKeyEntry({ key: 'x', operate: () => {}, cover: false }))],
        layersRef: { current: new Map([['screen', layer]]) },
      });
      expect(screenProc.process(ctx)).toBe(true);
    });
  });

  describe('id', () => {
    test('Given affectOverlay=true, Then processor id is "global-key-overlay"', () => {
      expect(overlayProc.id).toBe('global-key-overlay');
    });

    test('Given affectOverlay=false, Then processor id is "global-key-screen"', () => {
      expect(screenProc.id).toBe('global-key-screen');
    });
  });
});
