import { describe, test, expect, vi } from 'vitest';
import { handleTabNavigation } from '../../../src/layerHandler.js';
import { fakeLayer } from '../../_helpers/factories.js';
import { defaultTargetsSymbol } from '../../../src/types.js';

const defSym: typeof defaultTargetsSymbol = defaultTargetsSymbol;

describe('handleTabNavigation', () => {
  describe('basic scenarios', () => {
    test('Given eventNames does not include "tab", Then returns false', () => {
      const layer = fakeLayer();
      expect(
        handleTabNavigation(layer, ['a'], false, () => {}),
      ).toBe(false);
    });

    test('Given eventNames includes "tab" but defaultFocusOrder is empty, Then returns false', () => {
      const layer = fakeLayer();
      expect(
        handleTabNavigation(layer, ['tab'], false, () => {}),
      ).toBe(false);
    });
  });

  describe('Tab forward navigation', () => {
    test('Given currentFocusId=null and defaultFocusOrder=[a,b], pressing Tab sets currentFocusId to a', () => {
      const layer = fakeLayer({
        defaultFocusOrder: ['a', 'b'],
      });
      const notify = vi.fn();

      const result = handleTabNavigation(layer, ['tab'], false, notify);

      expect(result).toBe(true);
      expect(layer.currentFocusIds[0]?.id ?? null).toBe('a');
      expect(notify).toHaveBeenCalledOnce();
    });

    test('Given currentFocusId=a and defaultFocusOrder=[a,b], pressing Tab sets currentFocusId to b', () => {
      const layer = fakeLayer({
        defaultFocusOrder: ['a', 'b'],
        currentFocusIds: [{ id: 'a', fromGroup: defSym }],
      });
      const result = handleTabNavigation(layer, ['tab'], false, () => {});
      expect(result).toBe(true);
      expect(layer.currentFocusIds[0]?.id ?? null).toBe('b');
    });

    test('Given currentFocusId is last, pressing Tab wraps around to first', () => {
      const layer = fakeLayer({
        defaultFocusOrder: ['a', 'b', 'c'],
        currentFocusIds: [{ id: 'c', fromGroup: defSym }],
      });
      handleTabNavigation(layer, ['tab'], false, () => {});
      expect(layer.currentFocusIds[0]?.id ?? null).toBe('a');
    });
  });

  describe('Shift+Tab backward navigation', () => {
    test('Given currentFocusId=null and defaultFocusOrder=[a,b], Shift+Tab sets currentFocusId to b (starts from end)', () => {
      const layer = fakeLayer({
        defaultFocusOrder: ['a', 'b'],
      });
      handleTabNavigation(layer, ['shift+tab', 'tab'], true, () => {});
      expect(layer.currentFocusIds[0]?.id ?? null).toBe('b');
    });

    test('Given currentFocusId is first, Shift+Tab wraps around to last', () => {
      const layer = fakeLayer({
        defaultFocusOrder: ['a', 'b', 'c'],
        currentFocusIds: [{ id: 'a', fromGroup: defSym }],
      });
      handleTabNavigation(layer, ['shift+tab', 'tab'], true, () => {});
      expect(layer.currentFocusIds[0]?.id ?? null).toBe('c');
    });

    test('Given currentFocusId=b and defaultFocusOrder=[a,b,c], Shift+Tab sets currentFocusId to a', () => {
      const layer = fakeLayer({
        defaultFocusOrder: ['a', 'b', 'c'],
        currentFocusIds: [{ id: 'b', fromGroup: defSym }],
      });
      handleTabNavigation(layer, ['shift+tab', 'tab'], true, () => {});
      expect(layer.currentFocusIds[0]?.id ?? null).toBe('a');
    });
  });

  describe('shift detection', () => {
    test('Given eventNames contains a "shift+" prefixed name, shift param is true', () => {
      const layer = fakeLayer({
        defaultFocusOrder: ['a', 'b'],
        currentFocusIds: [{ id: 'a', fromGroup: defSym }],
      });
      handleTabNavigation(layer, ['shift+tab', 'tab'], true, () => {});
      expect(layer.currentFocusIds[0]?.id ?? null).toBe('b');
    });
  });
});
