import { describe, test, expect, vi } from 'vitest';
import { handleTabNavigation } from '../../../src/layerHandler.js';
import { fakeLayer } from '../../_helpers/factories.js';

describe('handleTabNavigation', () => {
  describe('basic scenarios', () => {
    test('Given eventNames does not include "tab", Then returns false', () => {
      const layer = fakeLayer();
      expect(
        handleTabNavigation(layer, ['a'], false, () => {}),
      ).toBe(false);
    });

    test('Given eventNames includes "tab" but focusOrder is empty, Then returns false', () => {
      const layer = fakeLayer();
      expect(
        handleTabNavigation(layer, ['tab'], false, () => {}),
      ).toBe(false);
    });
  });

  describe('Tab forward navigation', () => {
    test('Given currentFocusId=null and focusOrder=[a,b], pressing Tab sets currentFocusId to a', () => {
      const layer = fakeLayer({
        focusOrder: ['a', 'b'],
        currentFocusId: null,
      });
      const notify = vi.fn();

      const result = handleTabNavigation(layer, ['tab'], false, notify);

      expect(result).toBe(true);
      expect(layer.currentFocusId).toBe('a');
      expect(notify).toHaveBeenCalledOnce();
    });

    test('Given currentFocusId=a and focusOrder=[a,b], pressing Tab sets currentFocusId to b', () => {
      const layer = fakeLayer({
        focusOrder: ['a', 'b'],
        currentFocusId: 'a',
      });
      const result = handleTabNavigation(layer, ['tab'], false, () => {});
      expect(result).toBe(true);
      expect(layer.currentFocusId).toBe('b');
    });

    test('Given currentFocusId is last, pressing Tab wraps around to first', () => {
      const layer = fakeLayer({
        focusOrder: ['a', 'b', 'c'],
        currentFocusId: 'c',
      });
      handleTabNavigation(layer, ['tab'], false, () => {});
      expect(layer.currentFocusId).toBe('a');
    });
  });

  describe('Shift+Tab backward navigation', () => {
    test('Given currentFocusId=null and focusOrder=[a,b], Shift+Tab sets currentFocusId to b (starts from end)', () => {
      const layer = fakeLayer({
        focusOrder: ['a', 'b'],
        currentFocusId: null,
      });
      handleTabNavigation(layer, ['shift+tab', 'tab'], true, () => {});
      expect(layer.currentFocusId).toBe('b');
    });

    test('Given currentFocusId is first, Shift+Tab wraps around to last', () => {
      const layer = fakeLayer({
        focusOrder: ['a', 'b', 'c'],
        currentFocusId: 'a',
      });
      handleTabNavigation(layer, ['shift+tab', 'tab'], true, () => {});
      expect(layer.currentFocusId).toBe('c');
    });

    test('Given currentFocusId=b and focusOrder=[a,b,c], Shift+Tab sets currentFocusId to a', () => {
      const layer = fakeLayer({
        focusOrder: ['a', 'b', 'c'],
        currentFocusId: 'b',
      });
      handleTabNavigation(layer, ['shift+tab', 'tab'], true, () => {});
      expect(layer.currentFocusId).toBe('a');
    });
  });

  describe('shift detection', () => {
    test('Given eventNames contains a "shift+" prefixed name, shift param is true', () => {
      const layer = fakeLayer({
        focusOrder: ['a', 'b'],
        currentFocusId: 'a',
      });
      handleTabNavigation(layer, ['shift+tab', 'tab'], true, () => {});
      expect(layer.currentFocusId).toBe('b');
    });
  });
});
