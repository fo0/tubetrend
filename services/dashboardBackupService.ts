import { coerceTimeFrame, coerceSearchType, FavoriteCacheEntry, FavoriteConfig, TimeFrame, SearchType } from "../types";

const BACKUP_SCHEMA = "tt.dashboard.backup";
const BACKUP_VERSION = 1 as const;

const FAVORITES_KEY = "tt.favorites.v1";
const FAVORITES_CACHE_KEY = "tt.favorites.cache.v1";

export type DashboardSortMode = "alpha" | "velocity";
export type SortOrder = "asc" | "desc";

export interface DashboardBackupPayload {
  schema: typeof BACKUP_SCHEMA;
  version: typeof BACKUP_VERSION;
  exportedAt: number;
  data: {
    favorites: FavoriteConfig[];
    favoritesCache: Record<string, FavoriteCacheEntry>;
    dashboard: {
      sortMode: DashboardSortMode;
      sortOrder: SortOrder;
    };
  };
}

const safeReadJson = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const makeId = (query: string, timeFrame: TimeFrame, maxResults: number, searchType: SearchType = SearchType.CHANNEL) => {
  return `${query.trim().toLowerCase()}|${timeFrame}|${maxResults}|${searchType}`;
};

const coerceSortMode = (value: unknown, fallback: DashboardSortMode = "alpha"): DashboardSortMode => {
  return value === "velocity" ? "velocity" : fallback;
};

const coerceSortOrder = (value: unknown, fallback: SortOrder = "asc"): SortOrder => {
  return value === "desc" ? "desc" : fallback;
};

const normalizeFavorites = (raw: any[]): { favorites: FavoriteConfig[]; idMap: Map<string, string> } => {
  const byId = new Map<string, FavoriteConfig>();
  const idMap = new Map<string, string>();

  for (const item of raw) {
    const query = typeof item?.query === "string" ? item.query.trim() : "";
    if (!query) continue;

    const timeFrame = coerceTimeFrame(item?.timeFrame);
    const maxResults = typeof item?.maxResults === "number"
      ? item.maxResults
      : (typeof item?.maxResults === "string" ? parseInt(item.maxResults, 10) : 1000);
    const createdAt = typeof item?.createdAt === "number" ? item.createdAt : Date.now();
    const label = typeof item?.label === "string" ? (item.label.trim() || undefined) : undefined;
    const searchType = coerceSearchType(item?.searchType, SearchType.CHANNEL);

    const nextId = makeId(query, timeFrame, Number.isFinite(maxResults) ? maxResults : 1000, searchType);
    const next: FavoriteConfig = {
      id: nextId,
      query,
      timeFrame,
      maxResults: Number.isFinite(maxResults) ? maxResults : 1000,
      searchType,
      createdAt,
      label,
    };

    if (typeof item?.id === "string" && item.id && item.id !== nextId) {
      idMap.set(item.id, nextId);
    }

    const existing = byId.get(nextId);
    if (!existing || existing.createdAt < createdAt) {
      byId.set(nextId, next);
    }
  }

  const favorites = Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);
  return { favorites, idMap };
};

export const dashboardBackupService = {
  createBackup(input: { dashboardSortMode: DashboardSortMode; dashboardSortOrder: SortOrder }): DashboardBackupPayload {
    const rawFavorites = safeReadJson<any[]>(FAVORITES_KEY, []);
    const rawCache = safeReadJson<Record<string, FavoriteCacheEntry>>(FAVORITES_CACHE_KEY, {});

    const { favorites, idMap } = normalizeFavorites(rawFavorites);

    // Cache best-effort an neue IDs mappen (ohne Storage zu verändern)
    const favoritesCache: Record<string, FavoriteCacheEntry> = {};

    for (const fav of favorites) {
      const direct = rawCache[fav.id];
      if (direct) {
        favoritesCache[fav.id] = direct;
        continue;
      }
      // Falls ältere ID existiert, versuchen zu mappen
      for (const [oldId, newId] of idMap.entries()) {
        if (newId === fav.id && rawCache[oldId]) {
          favoritesCache[fav.id] = rawCache[oldId];
          break;
        }
      }
    }

    return {
      schema: BACKUP_SCHEMA,
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      data: {
        favorites,
        favoritesCache,
        dashboard: {
          sortMode: coerceSortMode(input.dashboardSortMode),
          sortOrder: coerceSortOrder(input.dashboardSortOrder, input.dashboardSortMode === "velocity" ? "desc" : "asc"),
        },
      },
    };
  },

  stringify(payload: DashboardBackupPayload): string {
    return JSON.stringify(payload, null, 2);
  },

  parse(jsonText: string):
    | { ok: true; payload: DashboardBackupPayload }
    | { ok: false; error: string } {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return { ok: false, error: "invalid_json" };
    }

    if (!parsed || typeof parsed !== "object") return { ok: false, error: "invalid_payload" };
    if (parsed.schema !== BACKUP_SCHEMA) return { ok: false, error: "invalid_schema" };
    if (parsed.version !== BACKUP_VERSION) return { ok: false, error: "unsupported_version" };

    const favoritesRaw = Array.isArray(parsed?.data?.favorites) ? parsed.data.favorites : [];
    const favoritesCacheRaw = parsed?.data?.favoritesCache && typeof parsed.data.favoritesCache === "object"
      ? parsed.data.favoritesCache
      : {};

    const { favorites } = normalizeFavorites(favoritesRaw);

    const favoritesCache: Record<string, FavoriteCacheEntry> = {};
    for (const fav of favorites) {
      const entry = (favoritesCacheRaw as any)[fav.id];
      if (!entry || typeof entry !== "object") continue;
      if (!Array.isArray(entry.videos) || typeof entry.fetchedAt !== "number") continue;
      favoritesCache[fav.id] = entry as FavoriteCacheEntry;
    }

    const sortMode = coerceSortMode(parsed?.data?.dashboard?.sortMode, "alpha");
    const sortOrder = coerceSortOrder(parsed?.data?.dashboard?.sortOrder, sortMode === "velocity" ? "desc" : "asc");

    const exportedAt = typeof parsed.exportedAt === "number" ? parsed.exportedAt : Date.now();

    const payload: DashboardBackupPayload = {
      schema: BACKUP_SCHEMA,
      version: BACKUP_VERSION,
      exportedAt,
      data: {
        favorites,
        favoritesCache,
        dashboard: { sortMode, sortOrder },
      },
    };

    return { ok: true, payload };
  },
};
