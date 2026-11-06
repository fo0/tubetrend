import { safeReadRecord, safeWrite } from "@/src/shared/lib/storage";

/**
 * A localStorage-backed map whose entries expire `ttlMs` after they were
 * written. Each entry is stored as `{ [field]: value, timestamp }`, so the
 * persisted shape of an existing cache stays exactly what it was before this
 * helper existed (`{ info, timestamp }` for channels, `{ results, timestamp }`
 * for autocomplete).
 *
 * The stored map is shape-checked, not only parsed (`safeReadRecord`): a stored
 * `null` used to throw on the first lookup, so every channel search and
 * favorite refresh failed in findChannelInfo, and a stored number let the
 * lookup through but threw on the write — after the paid requests had already
 * spent their quota.
 */
export function createTtlCache<F extends string, V>(storageKey: string, ttlMs: number, field: F) {
  type Entry = Record<F, V> & { timestamp: number };

  // An entry without a usable timestamp makes the age NaN, and every NaN
  // comparison is false — so treat a non-finite age as expired rather than as
  // fresh, which would pin a malformed entry in the cache forever.
  const isExpired = (age: number): boolean => !Number.isFinite(age) || age > ttlMs;

  return {
    /**
     * The stored `field` of the entry under `key`, or null when there is no
     * fresh entry. The value itself is returned as stored, not re-validated.
     */
    get(key: string): V | null {
      const entry = safeReadRecord<Entry>(storageKey)[key];
      if (!entry) return null;
      if (isExpired(Date.now() - entry.timestamp)) return null;
      return entry[field];
    },

    /** Store `value` under `key`, dropping every expired entry on the way. */
    set(key: string, value: V): void {
      const cache = safeReadRecord<Entry>(storageKey);
      const now = Date.now();

      // The optional chain keeps a corrupt value (a bare `null` under a key)
      // from throwing here: it yields NaN, which isExpired classifies as
      // expired, so the junk entry is dropped instead of aborting the write.
      // Without it, for the autocomplete cache, the TypeError propagated into
      // searchChannels' own catch, which swallowed the freshly fetched
      // suggestions and returned [] — after the 100 quota units for the search
      // had been spent.
      Object.keys(cache).forEach((cachedKey) => {
        if (isExpired(now - cache[cachedKey]?.timestamp)) {
          delete cache[cachedKey];
        }
      });

      cache[key] = { [field]: value, timestamp: now } as Entry;
      safeWrite(storageKey, cache);
    },
  };
}
