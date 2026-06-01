import { ReactNode } from 'react';

/**
 * Props for the {@link LanguageProvider} component.
 *
 * Provide at least one of `resources` (inline translation object) or `path`
 * (directory of `{locale}.json` files).
 */
export interface LanguageProviderProps {
  /** Child React tree that receives i18n context. */
  children: ReactNode;

  /**
   * Inline translation resources keyed by locale code.
   *
   * @example
   * ```ts
   * resources={{ 'en-US': { hello: 'Hello' }, 'zh-CN': { hello: '你好' } }}
   * ```
   */
  resources?: Record<string, Record<string, string>>;

  /**
   * Path to a directory scanned synchronously for `{locale}.json` files.
   * Each file becomes one language resource.
   */
  path?: string;

  /** Initial language code. Defaults to the first available locale. */
  defaultLanguage?: string;

  /**
   * Fallback language to try when a key is missing in the current language.
   * If the key is also missing in the fallback, the key itself is returned.
   */
  fallbackLanguage?: string;
}

/**
 * Value provided by {@link LanguageProvider} via React context.
 * Accessed via the {@link useI18n} hook.
 */
export interface I18nContextValue {
  /**
   * Translate a key to the current language.
   *
   * Dot-separated nested keys are resolved via the flat key map
   * (e.g. `menu.title` find the key `"menu.title"` in the JSON).
   *
   * Interpolation: `t('welcome', { name: 'Alice' })` replaces `{name}`
   * in the translated template with the provided value.
   *
   * Missing keys resolve to the key string itself.
   */
  t: (key: string, params?: Record<string, string | number>) => string;

  /** Switch to a different language. Triggers re-render of all consumers. */
  setLanguage: (lang: string) => void;

  /** Returns all available locale codes. */
  getLanguages: () => string[];

  /** Currently active locale code. */
  currentLanguage: string;
}
