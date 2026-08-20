import { createContext } from 'react';
import type { ThemeContextValue } from './types.js';

/**
 * Internal React context for the theme system.
 * Consumers should use the {@link useTheme} hook instead of accessing this
 * context directly.
 */
export const ThemeContext = createContext<ThemeContextValue | null>(null);
