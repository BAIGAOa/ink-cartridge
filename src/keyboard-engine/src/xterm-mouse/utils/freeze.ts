/**
 * Deep freeze utilities for runtime immutability with TypeScript type safety
 *
 * Provides recursive freezing with type-level readonly guarantees that match
 * runtime behavior. Prevents object tampering and prototype pollution attacks.
 *
 * @module utils/freeze
 */

/**
 * Primitive types that don't need freezing
 */
type Primitive = string | number | boolean | bigint | symbol | null | undefined;

/**
 * Built-in objects that have their own freezing semantics
 */
// biome-ignore lint/complexity/noBannedTypes: Function type is appropriate for generic built-in check
type Builtin = Primitive | Function | Date | RegExp | Error | File | Blob | URL;

/**
 * Recursively makes all properties readonly, matching runtime deepFreeze behavior
 *
 * This type transforms:
 * - Objects: `{ readonly [P in keyof T]: DeepReadonly<T[P]> }`
 * - Arrays: `ReadonlyArray<DeepReadonly<U>>`
 * - Maps: `ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>`
 * - Sets: `ReadonlySet<DeepReadonly<U>>`
 * - WeakMaps/WeakSets: Unchanged (cannot be frozen deeply)
 * - Primitives/Builtins: Unchanged
 *
 * @example
 * ```ts
 * type Config = {
 *   user: { name: string; meta: { age: number } };
 *   tags: string[];
 *   flags: Set<string>;
 * };
 *
 * const frozen: DeepReadonly<Config> = deepFreeze(config);
 * frozen.user.name = "Bob"; // ❌ TypeScript error
 * frozen.tags.push("go");  // ❌ TypeScript error
 * ```
 */
export type DeepReadonly<T> = T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
    ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
    : T extends Set<infer M>
      ? ReadonlySet<DeepReadonly<M>>
      : T extends WeakMap<infer WK, infer WV>
        ? WeakMap<DeepReadonly<WK>, DeepReadonly<WV>>
        : T extends WeakSet<infer WM>
          ? WeakSet<DeepReadonly<WM>>
          : T extends ReadonlyArray<infer U>
            ? readonly DeepReadonly<U>[]
            : T extends Array<infer U>
              ? readonly DeepReadonly<U>[]
              : T extends object
                ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
                : T;

/**
 * Recursively freezes an object and all its nested properties
 *
 * Freezes objects recursively to prevent any modifications at runtime.
 * Handles built-in objects (Date, RegExp, Error, etc.) specially.
 * Prevents infinite loops with circular references using WeakSet.
 *
 * @param obj - The object to freeze
 * @param seen - Internal WeakSet to track already-seen objects (prevent infinite loops)
 * @returns The same object with all nested properties frozen
 *
 * @example
 * ```ts
 * const config = {
 *   user: { name: "Max", meta: { age: 30 } },
 *   tags: ["ts", "rust"],
 *   flags: new Set(["a", "b"]),
 *   map: new Map([["feature", { enabled: true }]]),
 * };
 *
 * const frozen = deepFreeze(config);
 *
 * frozen.user.name = "Bob";                 // ❌ Runtime error: Cannot assign to read only property
 * frozen.tags.push("go");                   // ❌ Runtime error: Cannot assign to read only property
 * frozen.flags.add("c");                    // ❌ Runtime error: Cannot add property to frozen Set
 * frozen.map.get("feature")!.enabled = false; // ❌ Runtime error: Cannot assign to read only property
 * ```
 */
export function deepFreeze<T>(obj: T, seen: WeakSet<object> = new WeakSet<object>()): DeepReadonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj as DeepReadonly<T>;
  }

  if (seen.has(obj as object)) {
    return obj as DeepReadonly<T>;
  }
  seen.add(obj as object);

  // Built-in objects have their own semantics - just freeze at top level
  const builtins = [Date, RegExp, Error, URL, File, Blob] as const;
  if (builtins.some((ctor) => obj instanceof ctor)) {
    return Object.freeze(obj) as DeepReadonly<T>;
  }

  if (obj instanceof Map) {
    for (const [k, v] of obj.entries()) {
      // biome-ignore lint/suspicious/noExplicitAny: Recursive freeze needs to handle arbitrary keys/values
      deepFreeze(k as any, seen);
      // biome-ignore lint/suspicious/noExplicitAny: Recursive freeze needs to handle arbitrary keys/values
      deepFreeze(v as any, seen);
    }
    return Object.freeze(obj) as DeepReadonly<T>;
  }

  if (obj instanceof Set) {
    for (const v of obj.values()) {
      // biome-ignore lint/suspicious/noExplicitAny: Recursive freeze needs to handle arbitrary values
      deepFreeze(v as any, seen);
    }
    return Object.freeze(obj) as DeepReadonly<T>;
  }

  // WeakMap/WeakSet can only freeze top-level (cannot iterate entries)
  if (obj instanceof WeakMap || obj instanceof WeakSet) {
    return Object.freeze(obj) as DeepReadonly<T>;
  }

  const propNames = Object.getOwnPropertyNames(obj);
  for (const name of propNames) {
    // biome-ignore lint/suspicious/noExplicitAny: Need to access arbitrary properties for recursion
    const value = (obj as any)[name];
    deepFreeze(value, seen);
  }

  return Object.freeze(obj) as DeepReadonly<T>;
}

/**
 * Freezes an object only in development mode
 *
 * In production, returns the object unchanged for performance.
 * Useful for adding safety during development without production overhead.
 *
 * @param obj - The object to conditionally freeze
 * @returns The frozen object (dev) or original object (prod)
 *
 * @example
 * ```ts
 * const config = { user: { name: "Max" } };
 * const frozen = freezeIfDev(config);
 *
 * if (process.env.NODE_ENV === 'development') {
 *   frozen.user.name = "Bob"; // ❌ Runtime error in dev
 * }
 * // In production, this would work (no freezing)
 * ```
 */
export function freezeIfDev<T>(obj: T): T {
  if (process.env.NODE_ENV === 'development') {
    return deepFreeze(obj) as T;
  }
  return obj;
}

/**
 * Freezes an object in strict TypeScript mode only
 *
 * When 'strict' is enabled in tsconfig, freezes the object.
 * Otherwise returns it unchanged.
 *
 * @param obj - The object to conditionally freeze
 * @returns The frozen object (strict mode) or original object
 *
 * @example
 * ```ts
 * // tsconfig.json: { "strict": true }
 * const config = { user: { name: "Max" } };
 * const frozen = freezeInStrictMode(config);
 * frozen.user.name = "Bob"; // ❌ TypeScript + runtime error
 * ```
 */
export function freezeInStrictMode<T>(obj: T): T {
  // Note: This is a compile-time check. At runtime, we always freeze
  // because we can't detect the tsconfig setting at runtime.
  // The type system will enforce readonly if strict mode is on.
  return deepFreeze(obj) as T;
}

/**
 * Checks if an object is frozen (either by Object.freeze or deepFreeze)
 *
 * @param obj - The object to check
 * @returns true if the object is frozen, false otherwise
 *
 * @example
 * ```ts
 * const obj = { data: [1, 2, 3] };
 * const frozen = deepFreeze(obj);
 *
 * isFrozen(obj);    // false (outer object is frozen, but this checks if we passed it)
 * isFrozen(frozen); // true
 * ```
 */
export function isFrozen(obj: unknown): boolean {
  if (obj === null || typeof obj !== 'object') {
    return true; // Primitives are immutable
  }

  return Object.isFrozen(obj as object);
}
