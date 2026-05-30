import { useCallback, useRef, useState } from "react";
import { useEventListener } from "./useEventListener";

interface UseLocalStorageOptions<T> {
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
}

/**
 * Type-safe hook for localStorage with automatic sync
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: UseLocalStorageOptions<T>,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const serialize = options?.serialize ?? JSON.stringify;
  const deserialize = options?.deserialize ?? JSON.parse;

  // Stable ref for initialValue to avoid re-creating the remove callback when
  // the caller passes a new object/array reference on each render.
  const initialValueRef = useRef(initialValue);

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = localStorage.getItem(key);
      return item ? deserialize(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        try {
          localStorage.setItem(key, serialize(next));
        } catch {
          // Ignore quota errors
        }
        return next;
      });
    },
    [key, serialize],
  );

  const remove = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setStoredValue(initialValueRef.current);
    } catch {
      // Ignore
    }
  }, [key]);

  // Listen for storage changes from other tabs
  useEventListener("storage", (e: StorageEvent) => {
    if (e.key === key && e.newValue !== null) {
      try {
        setStoredValue(deserialize(e.newValue));
      } catch {
        // Ignore parse errors
      }
    }
  });

  return [storedValue, setValue, remove];
}
