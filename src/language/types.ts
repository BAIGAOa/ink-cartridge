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

  /**
   * Default context applied to every `t()` call unless an explicit `context`
   * option is passed.
   *
   * When set, `t('greeting')` behaves as if every call were
   * `t('greeting', { context: defaultContext })` — it first tries
   * `key.<defaultContext>`, then falls back to `key`, then to the key itself.
   *
   * Can be changed dynamically via the `setDefaultContext` API returned by
   * `useI18n()`.
   *
   * @example
   * ```tsx
   * <LanguageProvider defaultContext="male" ...>
   *   // t('greeting') → looks up 'greeting.male' first
   * </LanguageProvider>
   * ```
   */
  defaultContext?: string;
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
   * (e.g. `menu.title` finds the key `"menu.title"` in the JSON).
   *
   * @example
   * // Simple key
   * t('hello')  →  'Hello'
   *
   * // Parameter interpolation
   * t('welcome', { params: { name: 'Alice' } })  →  'Welcome, Alice'
   *
   * // Context-based lookup (e.g. gendered forms)
   * // Resources: { 'greeting': 'Hello', 'greeting.female': 'Hello, madam' }
   * t('greeting', { context: 'female' })        →  'Hello, madam'
   * t('greeting', { context: 'unknown' })        →  'Hello'  (fallback)
   *
   * // Context + interpolation
   * // Resources: { 'welcome.female': 'Welcome, Ms. {name}' }
   * t('welcome', { context: 'female', params: { name: 'Alice' } })  →  'Welcome, Ms. Alice'
   *
   * Missing keys resolve to the key string itself.
   */
  t: (key: string, options?: { params?: Record<string, string | number>; context?: string }) => string;

  /**
   * Switch to a different language. Triggers re-render of all consumers.
   *
   * @throws {Error} If the requested language is not available, throws
   *   with a message listing available languages.
   */
  setLanguage: (lang: string) => void;

  /** Returns all available locale codes. */
  getLanguages: () => string[];

  /**
   * Merge translation files from one or more directory paths into the
   * current resources. Later paths override earlier paths when the same
   * key exists in multiple sources. Triggers re-render of all consumers.
   *
   * Only merges languages whose JSON files exist in the provided paths;
   * other languages are unaffected.
   *
   * @param paths  Array of directory paths, each containing `{locale}.json` files.
   *               Applied in order: later paths win on key conflicts.
   */
  mergeLanguage: (paths: string[]) => void;

  /**
   * Dynamically update the default context for all `t()` calls.
   *
   * Pass `undefined` to clear the default context, restoring the original
   * behaviour where only the bare key is looked up.
   *
   * @example
   * ```tsx
   * setDefaultContext('female');
   * // All subsequent t() calls now prefer key.<female> first.
   *
   * setDefaultContext(undefined);
   * // Back to bare-key-only lookup.
   * ```
   */
  setDefaultContext: (context?: string) => void;

  /** Currently active locale code. */
  currentLanguage: string;
}
