import { createContext } from 'react';
import type { I18nContextValue } from './types.js';

/**
 * Internal React context for the i18n system.
 * Consumers should use the {@link useI18n} hook instead of accessing this
 * context directly.
 */
export const LanguageContext = createContext<I18nContextValue | null>(null);
