import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ThemeProvider } from '../../../src/theme/provider.js';
import { useTheme } from '../../../src/theme/hook.js';

describe('ThemeProvider — inline themes', () => {
  it('loads inline themes and returns current theme values', () => {
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

  it('uses first theme when defaultTheme is not specified', () => {
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

  it('color() returns undefined for non-existent key', () => {
    const themes = [{ id: 'only', name: 'only-theme' }];

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, { themes }, children),
    });

    expect(result.current.color('missing')).toBeUndefined();
  });

  it('empty themes array uses default behaviour (empty themeId)', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, { themes: [] }, children),
    });

    expect(result.current.themeId).toBeDefined();
    expect(result.current.color('anything')).toBeUndefined();
  });
});

describe('setTheme', () => {
  it('switches theme and returns new values after rerender', () => {
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

    result.current.setTheme('light');
    rerender();

    expect(result.current.themeId).toBe('light');
    expect(result.current.color('primary')).toBe('yellow');
  });

  it('throws when switching to a non-existent theme', () => {
    const themes = [{ id: 'only', primary: 'green' }];

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, { themes }, children),
    });

    expect(() => result.current.setTheme('nonexistent')).toThrow(/nonexistent/);
  });
});

describe('style()', () => {
  it('returns boolean values for boolean-type keys', () => {
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

  it('returns undefined for string-type keys', () => {
    const themes = [{ id: 't', primary: 'blue' }];

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, { themes }, children),
    });

    expect(result.current.style('primary')).toBeUndefined();
  });

  it('returns undefined for non-existent keys', () => {
    const themes = [{ id: 't' }];

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, { themes }, children),
    });

    expect(result.current.style('nope')).toBeUndefined();
  });

  it('color() returns undefined for boolean-type keys', () => {
    const themes = [{ id: 't', isDark: true }];

    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, { themes }, children),
    });

    expect(result.current.color('isDark')).toBeUndefined();
  });

  it('color() and style() coexist without interference', () => {
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
  it('loads {id}.json files from a directory', () => {
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

  it('empty directory results in empty themes list', () => {
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
  it('does not throw when all themes have identical keys', () => {
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

  it('throws when a theme is missing a key', () => {
    const themes = [
      { id: 'a', primary: 'red', bg: 'black', accent: 'green' },
      { id: 'b', primary: 'blue', bg: 'white' },
    ];

    expect(() => {
      renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { themes }, children),
      });
    }).toThrow(/missing from "b": accent/);
  });

  it('throws when a theme has an extra key', () => {
    const themes = [
      { id: 'a', primary: 'red', bg: 'black' },
      { id: 'b', primary: 'blue', bg: 'white', extra: 'pink' },
    ];

    expect(() => {
      renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { themes }, children),
      });
    }).toThrow(/extra in "b": extra/);
  });

  it('does not throw for a single theme', () => {
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
  it('overrides existing theme values without creating new themes', () => {
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

      result.current.mergeTheme([dir2]);
      rerender();

      expect(result.current.color('primary')).toBe('yellow');
      expect(result.current.color('bg')).toBe('black');
      expect(result.current.themes).toEqual(['dark']);
    } finally {
      fs.rmSync(dir1, { recursive: true, force: true });
      fs.rmSync(dir2, { recursive: true, force: true });
    }
  });

  it('later paths override earlier ones for the same key', () => {
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

      expect(result.current.color('color')).toBe('blue');
      expect(result.current.color('size')).toBe('large');
    } finally {
      fs.rmSync(dir1, { recursive: true, force: true });
      fs.rmSync(dir2, { recursive: true, force: true });
      fs.rmSync(dir3, { recursive: true, force: true });
    }
  });

  it('throws for non-existent directory', () => {
    const themes = [{ id: 't', primary: 'red' }];
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, { themes }, children),
    });

    expect(() => result.current.mergeTheme(['/nonexistent/path/xyz'])).toThrow();
  });
});

describe('addThemes', () => {
  it('adds a single new theme and returns updated list', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-base-'));
    const newDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-new-'));
    try {
      fs.writeFileSync(
        path.join(baseDir, 'dark.json'),
        JSON.stringify({ id: 'dark', primary: 'cyan', bg: 'black' }),
      );
      fs.writeFileSync(
        path.join(newDir, 'light.json'),
        JSON.stringify({ id: 'light', primary: 'yellow', bg: 'white' }),
      );

      const { result, rerender } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { path: baseDir, defaultTheme: 'dark' }, children),
      });

      expect(result.current.themes).toEqual(['dark']);

      result.current.addThemes([newDir]);
      rerender();

      expect(result.current.themes).toEqual(['dark', 'light']);
      result.current.setTheme('light');
      rerender();
      expect(result.current.themeId).toBe('light');
      expect(result.current.color('primary')).toBe('yellow');
      expect(result.current.color('bg')).toBe('white');
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
      fs.rmSync(newDir, { recursive: true, force: true });
    }
  });

  it('adds multiple new themes in one call', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-multi-'));
    const modDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-mod-'));
    try {
      fs.writeFileSync(
        path.join(baseDir, 'dark.json'),
        JSON.stringify({ id: 'dark', primary: 'cyan' }),
      );
      fs.writeFileSync(
        path.join(modDir, 'light.json'),
        JSON.stringify({ id: 'light', primary: 'yellow' }),
      );
      fs.writeFileSync(
        path.join(modDir, 'retro.json'),
        JSON.stringify({ id: 'retro', primary: 'green' }),
      );

      const { result, rerender } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { path: baseDir }, children),
      });

      expect(result.current.themes).toEqual(['dark']);

      result.current.addThemes([modDir]);
      rerender();

      expect(result.current.themes).toEqual(['dark', 'light', 'retro']);
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
      fs.rmSync(modDir, { recursive: true, force: true });
    }
  });

  it('accumulates themes across multiple addThemes calls', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-seq-'));
    const dirA = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-a-'));
    const dirB = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-b-'));
    try {
      fs.writeFileSync(
        path.join(baseDir, 't1.json'),
        JSON.stringify({ id: 't1', color: 'red' }),
      );
      fs.writeFileSync(
        path.join(dirA, 't2.json'),
        JSON.stringify({ id: 't2', color: 'green' }),
      );
      fs.writeFileSync(
        path.join(dirB, 't3.json'),
        JSON.stringify({ id: 't3', color: 'blue' }),
      );

      const { result, rerender } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { path: baseDir }, children),
      });

      result.current.addThemes([dirA]);
      rerender();
      expect(result.current.themes).toEqual(['t1', 't2']);

      result.current.addThemes([dirB]);
      rerender();
      expect(result.current.themes).toEqual(['t1', 't2', 't3']);
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
      fs.rmSync(dirA, { recursive: true, force: true });
      fs.rmSync(dirB, { recursive: true, force: true });
    }
  });

  it('later paths override same filename across paths', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-override-'));
    const dirA = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-oa-'));
    const dirB = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-ob-'));
    try {
      fs.writeFileSync(
        path.join(baseDir, 't1.json'),
        JSON.stringify({ id: 't1', color: 'red', size: 'small' }),
      );
      fs.writeFileSync(
        path.join(dirA, 't2.json'),
        JSON.stringify({ id: 't2a', color: 'green', size: 'medium' }),
      );
      fs.writeFileSync(
        path.join(dirB, 't2.json'),
        JSON.stringify({ id: 't2b', color: 'blue', size: 'large' }),
      );

      const { result, rerender } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { path: baseDir }, children),
      });

      result.current.addThemes([dirA, dirB]);
      rerender();

      expect(result.current.themes).toEqual(['t1', 't2b']);
      result.current.setTheme('t2b');
      rerender();
      expect(result.current.color('color')).toBe('blue');
      expect(result.current.color('size')).toBe('large');
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
      fs.rmSync(dirA, { recursive: true, force: true });
      fs.rmSync(dirB, { recursive: true, force: true });
    }
  });

  it('throws when id already exists in base themes', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-dup-'));
    try {
      fs.writeFileSync(
        path.join(baseDir, 'dark.json'),
        JSON.stringify({ id: 'dark', primary: 'cyan' }),
      );

      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { path: baseDir }, children),
      });

      const newDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-conflict-'));
      try {
        fs.writeFileSync(
          path.join(newDir, 'another.json'),
          JSON.stringify({ id: 'dark', primary: 'yellow' }),
        );
        expect(() => result.current.addThemes([newDir])).toThrow(/dark/);
      } finally {
        fs.rmSync(newDir, { recursive: true, force: true });
      }
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
  });

  it('throws when same id appears in different filenames within one batch', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-dup2-'));
    const modDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-mod2-'));
    try {
      fs.writeFileSync(
        path.join(baseDir, 't1.json'),
        JSON.stringify({ id: 't1', color: 'red' }),
      );
      fs.writeFileSync(
        path.join(modDir, 'style-a.json'),
        JSON.stringify({ id: 'clash', color: 'green' }),
      );
      fs.writeFileSync(
        path.join(modDir, 'style-b.json'),
        JSON.stringify({ id: 'clash', color: 'blue' }),
      );

      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { path: baseDir }, children),
      });

      expect(() => result.current.addThemes([modDir])).toThrow(/clash/);
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
      fs.rmSync(modDir, { recursive: true, force: true });
    }
  });

  it('throws when new theme is missing keys vs base', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-miss-'));
    const modDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-mod3-'));
    try {
      fs.writeFileSync(
        path.join(baseDir, 'dark.json'),
        JSON.stringify({ id: 'dark', primary: 'cyan', bg: 'black', accent: 'green' }),
      );
      fs.writeFileSync(
        path.join(modDir, 'light.json'),
        JSON.stringify({ id: 'light', primary: 'yellow', bg: 'white' }),
      );

      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { path: baseDir }, children),
      });

      expect(() => result.current.addThemes([modDir])).toThrow(/missing.*accent/);
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
      fs.rmSync(modDir, { recursive: true, force: true });
    }
  });

  it('throws when new theme has extra keys vs base', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-extra-'));
    const modDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-mod4-'));
    try {
      fs.writeFileSync(
        path.join(baseDir, 'dark.json'),
        JSON.stringify({ id: 'dark', primary: 'cyan', bg: 'black' }),
      );
      fs.writeFileSync(
        path.join(modDir, 'light.json'),
        JSON.stringify({ id: 'light', primary: 'yellow', bg: 'white', accent: 'pink' }),
      );

      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { path: baseDir }, children),
      });

      expect(() => result.current.addThemes([modDir])).toThrow(/extra.*accent/);
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
      fs.rmSync(modDir, { recursive: true, force: true });
    }
  });

  it('reports both missing and extra keys in one error', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-both-'));
    const modDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-mod5-'));
    try {
      fs.writeFileSync(
        path.join(baseDir, 'dark.json'),
        JSON.stringify({ id: 'dark', primary: 'cyan', bg: 'black', accent: 'green' }),
      );
      fs.writeFileSync(
        path.join(modDir, 'light.json'),
        JSON.stringify({ id: 'light', primary: 'yellow', bg: 'white', border: 'red' }),
      );

      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { path: baseDir }, children),
      });

      expect(() => result.current.addThemes([modDir])).toThrow(/missing.*accent/);
      expect(() => result.current.addThemes([modDir])).toThrow(/extra.*border/);
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
      fs.rmSync(modDir, { recursive: true, force: true });
    }
  });

  it('throws for non-existent directory', () => {
    const themes = [{ id: 't', primary: 'red' }];
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(ThemeProvider, { themes }, children),
    });

    expect(() => result.current.addThemes(['/nonexistent/path/add'])).toThrow();
  });

  it('accepts any keys when base is empty', () => {
    const modDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-empty-'));
    try {
      fs.writeFileSync(
        path.join(modDir, 'first.json'),
        JSON.stringify({ id: 'first', color: 'red', size: 'small' }),
      );

      const { result, rerender } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { themes: [] }, children),
      });

      result.current.addThemes([modDir]);
      rerender();

      expect(result.current.themes).toEqual(['first']);
      result.current.setTheme('first');
      rerender();
      expect(result.current.color('color')).toBe('red');
      expect(result.current.color('size')).toBe('small');
    } finally {
      fs.rmSync(modDir, { recursive: true, force: true });
    }
  });

  it('addThemes then mergeTheme combined', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-addmerge-'));
    const addDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-addmerge2-'));
    const mergeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-addmerge3-'));
    try {
      fs.writeFileSync(
        path.join(baseDir, 'dark.json'),
        JSON.stringify({ id: 'dark', primary: 'cyan', bg: 'black' }),
      );
      fs.writeFileSync(
        path.join(addDir, 'light.json'),
        JSON.stringify({ id: 'light', primary: 'yellow', bg: 'white' }),
      );

      const { result, rerender } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { path: baseDir, defaultTheme: 'dark' }, children),
      });

      result.current.addThemes([addDir]);
      rerender();
      expect(result.current.themes).toEqual(['dark', 'light']);

      fs.writeFileSync(
        path.join(mergeDir, 'light.json'),
        JSON.stringify({ id: 'light', primary: 'magenta' }),
      );
      result.current.mergeTheme([mergeDir]);
      rerender();

      result.current.setTheme('light');
      rerender();
      expect(result.current.color('primary')).toBe('magenta');
      expect(result.current.color('bg')).toBe('white');
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
      fs.rmSync(addDir, { recursive: true, force: true });
      fs.rmSync(mergeDir, { recursive: true, force: true });
    }
  });

  it('style() works for boolean keys on newly added themes', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-style-'));
    const modDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-mod6-'));
    try {
      fs.writeFileSync(
        path.join(baseDir, 'dark.json'),
        JSON.stringify({ id: 'dark', primary: 'cyan', titleBold: true }),
      );
      fs.writeFileSync(
        path.join(modDir, 'light.json'),
        JSON.stringify({ id: 'light', primary: 'yellow', titleBold: false }),
      );

      const { result, rerender } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { path: baseDir, defaultTheme: 'dark' }, children),
      });

      result.current.addThemes([modDir]);
      rerender();

      result.current.setTheme('light');
      rerender();
      expect(result.current.style('titleBold')).toBe(false);

      result.current.setTheme('dark');
      rerender();
      expect(result.current.style('titleBold')).toBe(true);
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
      fs.rmSync(modDir, { recursive: true, force: true });
    }
  });

  it('addThemes works with inline themes mode', () => {
    const modDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ink-add-inline-'));
    try {
      fs.writeFileSync(
        path.join(modDir, 'retro.json'),
        JSON.stringify({ id: 'retro', primary: 'magenta', bg: '#1a0033' }),
      );

      const themes = [
        { id: 'dark', primary: 'cyan', bg: 'black' },
        { id: 'light', primary: 'yellow', bg: 'white' },
      ];
      const { result, rerender } = renderHook(() => useTheme(), {
        wrapper: ({ children }: { children: React.ReactNode }) =>
          React.createElement(ThemeProvider, { themes, defaultTheme: 'dark' }, children),
      });

      result.current.addThemes([modDir]);
      rerender();

      expect(result.current.themes).toEqual(['dark', 'light', 'retro']);
      result.current.setTheme('retro');
      rerender();
      expect(result.current.color('primary')).toBe('magenta');
      expect(result.current.color('bg')).toBe('#1a0033');
    } finally {
      fs.rmSync(modDir, { recursive: true, force: true });
    }
  });
});
