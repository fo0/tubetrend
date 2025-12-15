import { FavoriteCacheEntry, FavoriteConfig, TimeFrame, VideoData } from "../types";

const FAVORITES_KEY = 'tt.favorites.v1';
const FAVORITES_CACHE_KEY = 'tt.favorites.cache.v1';

// TTL für Cache (Millisekunden) – 30 Minuten
const DEFAULT_CACHE_TTL = 30 * 60 * 1000;

const safeRead = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
};

const safeWrite = (key: string, value: any) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
};

const makeId = (query: string, timeFrame: TimeFrame, maxResults: number) => {
  // deterministischer Schlüssel zur einfachen Deduplizierung
  return `${query.trim().toLowerCase()}|${timeFrame}|${maxResults}`;
};

export const favoritesService = {
  list(): FavoriteConfig[] {
    return safeRead<FavoriteConfig[]>(FAVORITES_KEY, []).sort((a, b) => b.createdAt - a.createdAt);
  },

  /** Prüft, ob eine Favoriten-Konfiguration bereits existiert. */
  exists(query: string, timeFrame: TimeFrame, maxResults: number): boolean {
    const id = makeId(query, timeFrame, maxResults);
    const list = safeRead<FavoriteConfig[]>(FAVORITES_KEY, []);
    return list.some(f => f.id === id);
  },

  add(input: { query: string; timeFrame: TimeFrame; maxResults: number; label?: string }): FavoriteConfig {
    const id = makeId(input.query, input.timeFrame, input.maxResults);
    const now = Date.now();
    const next: FavoriteConfig = {
      id,
      query: input.query.trim(),
      timeFrame: input.timeFrame,
      maxResults: input.maxResults,
      createdAt: now,
      label: input.label?.trim() || undefined,
    };

    const list = this.list();
    const existsIdx = list.findIndex(f => f.id === id);
    if (existsIdx >= 0) {
      // Aktualisiere createdAt, Label ggf. übernehmen
      list[existsIdx] = { ...list[existsIdx], createdAt: now, label: next.label ?? list[existsIdx].label };
      safeWrite(FAVORITES_KEY, list);
      return list[existsIdx];
    }
    const updated = [next, ...list];
    safeWrite(FAVORITES_KEY, updated);
    return next;
  },

  /**
   * Aktualisiert einen bestehenden Favoriten. Darf timeFrame und/oder maxResults (und optional label) ändern.
   * Wenn sich durch die Änderung der zusammengesetzte Schlüssel (id) ändert, wird der Eintrag unter neuer id gespeichert
   * und der alte entfernt. Optional vorhandener Cache wird invalidiert.
   */
  update(id: string, patch: Partial<Pick<FavoriteConfig, 'timeFrame' | 'maxResults' | 'label'>>): FavoriteConfig | null {
    const list = this.list();
    const idx = list.findIndex(f => f.id === id);
    if (idx < 0) return null;

    const base = list[idx];
    const nextTimeFrame = patch.timeFrame ?? base.timeFrame;
    const nextMax = typeof patch.maxResults === 'number' ? patch.maxResults : base.maxResults;
    const nextLabel = patch.label !== undefined ? (patch.label?.trim() || undefined) : base.label;

    const newId = makeId(base.query, nextTimeFrame, nextMax);

    // Wenn bereits ein Eintrag mit neuer id existiert, ersetzen wir diesen durch die aktualisierte Version (kein Duplikat)
    const existingIdx = list.findIndex(f => f.id === newId);

    const updatedFav: FavoriteConfig = {
      id: newId,
      query: base.query,
      timeFrame: nextTimeFrame,
      maxResults: nextMax,
      createdAt: Date.now(),
      label: nextLabel
    };

    let nextList = list.filter(f => f.id !== id);
    if (existingIdx >= 0) {
      nextList = nextList.filter(f => f.id !== newId);
    }
    nextList = [updatedFav, ...nextList];
    safeWrite(FAVORITES_KEY, nextList);

    // Cache invalidieren: alter und ggf. neuer Schlüssel entfernen
    const cache = safeRead<Record<string, FavoriteCacheEntry & { ttl?: number }>>(FAVORITES_CACHE_KEY, {});
    if (cache[id]) delete cache[id];
    if (cache[newId]) delete cache[newId];
    safeWrite(FAVORITES_CACHE_KEY, cache);

    return updatedFav;
  },

  remove(id: string) {
    const list = this.list().filter(f => f.id !== id);
    safeWrite(FAVORITES_KEY, list);
    // Optional: Cache für diesen Favoriten ebenfalls entfernen
    const cache = safeRead<Record<string, FavoriteCacheEntry & { ttl?: number }>>(FAVORITES_CACHE_KEY, {});
    if (cache[id]) {
      delete cache[id];
      safeWrite(FAVORITES_CACHE_KEY, cache);
    }
  },

  clearAll() {
    safeWrite(FAVORITES_KEY, []);
    safeWrite(FAVORITES_CACHE_KEY, {});
  },

  getCache(id: string): FavoriteCacheEntry | null {
    const cache = safeRead<Record<string, FavoriteCacheEntry & { ttl?: number }>>(FAVORITES_CACHE_KEY, {});
    const entry = cache[id];
    if (!entry) return null;
    return entry;
  },

  setCache(id: string, videos: VideoData[], ttlMs: number = DEFAULT_CACHE_TTL) {
    // Nur Top6 speichern, um Speicher zu sparen
    const top6 = [...videos].sort((a, b) => b.trendingScore - a.trendingScore).slice(0, 6);
    const cache = safeRead<Record<string, FavoriteCacheEntry & { ttl?: number }>>(FAVORITES_CACHE_KEY, {});
    cache[id] = { videos: top6, fetchedAt: Date.now() };
    safeWrite(FAVORITES_CACHE_KEY, cache);
  },

  isCacheValid(id: string, ttlMs: number = DEFAULT_CACHE_TTL): boolean {
    const entry = this.getCache(id);
    if (!entry) return false;
    return (Date.now() - entry.fetchedAt) < ttlMs;
  }
};

export type { FavoriteConfig as Favorite };
