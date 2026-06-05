import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '../../theme/provider.js';
import { useTheme } from '../../theme/hook.js';

function wrapper(children: React.ReactNode, props: any = {}) {
  // Need to return a wrapper component for renderHook
  return ({ children: inner }: { children: React.ReactNode }) =>
    React.createElement(ThemeProvider, { ...props }, inner);
}

describe('ThemeProvider — inline themes', () => {
  it('加载 inline themes 后 color() 返回当前主题的值', () => {
    const themes = [
      { id: 'dark', primary: 'cyan', bg: 'black' },
      { id: 'light', primary: 'blue', bg: 'white' },
    ];

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, { themes, defaultTheme: 'dark' }, children),
    });

    expect(result.current.themeId).toBe('dark');
    expect(result.current.color('primary')).toBe('cyan');
    expect(result.current.color('bg')).toBe('black');
    expect(result.current.themes).toEqual(['dark', 'light']);
  });

  it('未指定 defaultTheme 时使用第一个主题', () => {
    const themes = [
      { id: 'a', x: 'red' },
      { id: 'b', x: 'green' },
    ];

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, { themes }, children),
    });

    expect(result.current.themeId).toBe('a');
    expect(result.current.color('x')).toBe('red');
  });

  it('color() 查询不存在的键返回 undefined', () => {
    const themes = [{ id: 'only', name: 'only-theme' }];

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, { themes }, children),
    });

    expect(result.current.color('missing')).toBeUndefined();
  });

  it('themes 为空时使用默认行为（空 themeId）', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, { themes: [] }, children),
    });

    expect(result.current.themeId).toBeDefined();
    expect(result.current.color('anything')).toBeUndefined();
  });
});

describe('setTheme', () => {
  it('setTheme 切换到指定主题后 color() 返回新值，所有消费者 re-render', () => {
    const themes = [
      { id: 'dark', primary: 'cyan' },
      { id: 'light', primary: 'yellow' },
    ];

    const { result, rerender } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, { themes, defaultTheme: 'dark' }, children),
    });

    expect(result.current.themeId).toBe('dark');
    expect(result.current.color('primary')).toBe('cyan');

    // Switch theme
    result.current.setTheme('light');

    // Re-render to pick up the new state
    rerender();

    expect(result.current.themeId).toBe('light');
    expect(result.current.color('primary')).toBe('yellow');
  });

  it('setTheme 切换到不存在的主题抛错', () => {
    const themes = [{ id: 'only', primary: 'green' }];

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, { themes }, children),
    });

    expect(() => result.current.setTheme('nonexistent')).toThrow(/nonexistent/);
  });
});

describe('style()', () => {
  it('style() 返回 boolean 类型键的值', () => {
    const themes = [
      { id: 'bold', titleBold: true, cardBold: false },
    ];

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, { themes }, children),
    });

    expect(result.current.style('titleBold')).toBe(true);
    expect(result.current.style('cardBold')).toBe(false);
  });

  it('style() 对 string 类型的键返回 undefined（不是 boolean）', () => {
    const themes = [{ id: 't', primary: 'blue' }];

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, { themes }, children),
    });

    expect(result.current.style('primary')).toBeUndefined();
  });

  it('style() 对不存在的键返回 undefined', () => {
    const themes = [{ id: 't' }];

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, { themes }, children),
    });

    expect(result.current.style('nope')).toBeUndefined();
  });

  it('color() 对 boolean 类型的键返回 undefined（不是 string）', () => {
    const themes = [{ id: 't', isDark: true }];

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, { themes }, children),
    });

    expect(result.current.color('isDark')).toBeUndefined();
  });

  it('color() 和 style() 在同一主题中各自取值互不干扰', () => {
    const themes = [
      { id: 't', primary: 'green', titleBold: true, muted: 'gray', dimText: false },
    ];

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, { themes }, children),
    });

    expect(result.current.color('primary')).toBe('green');
    expect(result.current.color('muted')).toBe('gray');
    expect(result.current.style('titleBold')).toBe(true);
    expect(result.current.style('dimText')).toBe(false);
  });
});

describe('path loading', () => {
  it('从目录加载 {id}.json 文件，color() 可正常取值', () => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-theme-test-'));
    try {
      fs.writeFileSync(
        path.join(dir, 'dark.json'),
        JSON.stringify({ id: 'dark', primary: 'cyan', bg: 'black' }),
      );
      fs.writeFileSync(
        path.join(dir, 'light.json'),
        JSON.stringify({ id: 'light', primary: 'yellow', bg: 'white' }),
      );

      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { path: dir, defaultTheme: 'dark' }, children),
      });

      expect(result.current.themeId).toBe('dark');
      expect(result.current.themes).toEqual(['dark', 'light']);
      expect(result.current.color('primary')).toBe('cyan');
      expect(result.current.color('bg')).toBe('black');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('path 加载没有 JSON 文件的目录时 themes 为空', () => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-theme-empty-'));
    try {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { path: dir }, children),
      });

      expect(result.current.themes).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('key consistency validation', () => {
  it('所有主题键名完全一致时不抛错', () => {
    const themes = [
      { id: 'a', primary: 'red', bg: 'black' },
      { id: 'b', primary: 'blue', bg: 'white' },
    ];

    expect(() => {
      renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { themes }, children),
      });
    }).not.toThrow();
  });

  it('主题键名不一致时抛错（缺少键）', () => {
    const themes = [
      { id: 'a', primary: 'red', bg: 'black', accent: 'green' },
      { id: 'b', primary: 'blue', bg: 'white' }, // missing 'accent'
    ];

    expect(() => {
      renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { themes }, children),
      });
    }).toThrow(/missing from "b": accent/);
  });

  it('主题键名不一致时抛错（多余的键）', () => {
    const themes = [
      { id: 'a', primary: 'red', bg: 'black' },
      { id: 'b', primary: 'blue', bg: 'white', extra: 'pink' }, // extra key
    ];

    expect(() => {
      renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { themes }, children),
      });
    }).toThrow(/extra in "b": extra/);
  });

  it('单个主题不抛错', () => {
    const themes = [{ id: 'only', primary: 'red' }];

    expect(() => {
      renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { themes }, children),
      });
    }).not.toThrow();
  });
});

describe('mergeTheme', () => {
  it('mergeTheme 覆盖已有主题的键值，不创建新主题', () => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const dir1 = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-theme-base-'));
    const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-theme-overlay-'));
    try {
      fs.writeFileSync(
        path.join(dir1, 'dark.json'),
        JSON.stringify({ id: 'dark', primary: 'cyan', bg: 'black' }),
      );
      fs.writeFileSync(
        path.join(dir2, 'dark.json'),
        JSON.stringify({ id: 'dark', primary: 'yellow' }),
      );
      // dir2 also has a theme not in dir1 — should be ignored
      fs.writeFileSync(
        path.join(dir2, 'extra.json'),
        JSON.stringify({ id: 'extra', primary: 'red' }),
      );

      const { result, rerender } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { path: dir1, defaultTheme: 'dark' }, children),
      });

      expect(result.current.color('primary')).toBe('cyan');
      expect(result.current.themes).toEqual(['dark']);

      // Merge overlay — 'extra' from dir2 should be ignored (not in base)
      result.current.mergeTheme([dir2]);
      rerender();

      // After merge, primary should be overridden by dir2
      expect(result.current.color('primary')).toBe('yellow');
      // bg was not in dir2's dark.json, should remain from base
      expect(result.current.color('bg')).toBe('black');
      // extra theme should NOT appear
      expect(result.current.themes).toEqual(['dark']);
    } finally {
      fs.rmSync(dir1, { recursive: true, force: true });
      fs.rmSync(dir2, { recursive: true, force: true });
    }
  });

  it('mergeTheme 多个路径依次覆盖', () => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const dir1 = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-theme-a-'));
    const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-theme-b-'));
    const dir3 = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-theme-c-'));
    try {
      fs.writeFileSync(path.join(dir1, 't.json'), JSON.stringify({ id: 't', color: 'red', size: 'small' }));
      fs.writeFileSync(path.join(dir2, 't.json'), JSON.stringify({ id: 't', color: 'green' }));
      fs.writeFileSync(path.join(dir3, 't.json'), JSON.stringify({ id: 't', color: 'blue', size: 'large' }));

      const { result, rerender } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { path: dir1 }, children),
      });

      expect(result.current.color('color')).toBe('red');
      expect(result.current.color('size')).toBe('small');

      result.current.mergeTheme([dir2, dir3]);
      rerender();

      // dir3 is last, so color='blue' wins
      expect(result.current.color('color')).toBe('blue');
      // size was overridden in dir3 too
      expect(result.current.color('size')).toBe('large');
    } finally {
      fs.rmSync(dir1, { recursive: true, force: true });
      fs.rmSync(dir2, { recursive: true, force: true });
      fs.rmSync(dir3, { recursive: true, force: true });
    }
  });

  it('mergeTheme 对不存在的目录抛错', () => {
    const themes = [{ id: 't', primary: 'red' }];
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, { themes }, children),
    });

    expect(() => result.current.mergeTheme(['/nonexistent/path/xyz'])).toThrow();
  });
});
