/**
 * Type-safe localStorage abstraction
 */

export interface StorageAdapter {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}

export const localStorageAdapter: StorageAdapter = {
  get<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },

  set<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage quota errors
    }
  },

  remove(key: string): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },

  clear(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.clear();
    } catch {
      // Ignore
    }
  },
};

/**
 * Safe read from localStorage with fallback
 */
export function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safe read of a keyed record (a cache map) from localStorage.
 *
 * `safeRead` only guards the parse: a stored `null`, array or primitive comes
 * back as-is under the declared type. On `null` the first `cache[key]` read
 * throws a TypeError, on a number or string the first write does (strict
 * mode), and on an array the write succeeds but `JSON.stringify` drops the
 * string key, so nothing is ever cached. Anything that is not a plain object
 * reads as an empty record — the same state a missing key yields — so the next
 * write replaces it with a clean one. Records this app wrote read exactly as
 * before.
 */
export function safeReadRecord<T>(key: string): Record<string, T> {
  const value = safeRead<unknown>(key, {});
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, T>)
    : {};
}

/**
 * Safe write to localStorage
 */
export function safeWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Safe remove from localStorage
 */
export function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}
