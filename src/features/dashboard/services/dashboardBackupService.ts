import { safeRead } from "@/src/shared/lib/storage";
import { STORAGE_KEYS } from "@/src/shared/constants";
import type { DashboardSortMode, SortOrder } from "@/src/shared/types";
import type { FavoriteCacheEntry, FavoriteConfig } from "@/src/features/favorites/types";

const BACKUP_VERSION = 1;

export interface DashboardBackupPayload {
  readonly version: number;
  readonly createdAt: number;
  readonly data: {
    readonly favorites: FavoriteConfig[];
    readonly favoritesCache: Record<string, FavoriteCacheEntry>;
    readonly dashboard: {
      readonly sortMode: DashboardSortMode;
      readonly sortOrder: SortOrder;
    };
  };
}

export type ParseResult =
  | { ok: true; payload: DashboardBackupPayload }
  | { ok: false; payload?: never };

export const dashboardBackupService = {
  createBackup(options: {
    dashboardSortMode: DashboardSortMode;
    dashboardSortOrder: SortOrder;
  }): DashboardBackupPayload {
    const favorites = safeRead<FavoriteConfig[]>(STORAGE_KEYS.FAVORITES, []);
    const favoritesCache = safeRead<Record<string, FavoriteCacheEntry>>(
      STORAGE_KEYS.FAVORITES_CACHE,
      {},
    );

    return {
      version: BACKUP_VERSION,
      createdAt: Date.now(),
      data: {
        favorites,
        favoritesCache,
        dashboard: {
          sortMode: options.dashboardSortMode,
          sortOrder: options.dashboardSortOrder,
        },
      },
    };
  },

  stringify(payload: DashboardBackupPayload): string {
    return JSON.stringify(payload, null, 2);
  },

  parse(json: string): ParseResult {
    try {
      const parsed = JSON.parse(json);

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        typeof parsed.version !== "number" ||
        typeof parsed.data !== "object"
      ) {
        return { ok: false };
      }

      if (!Array.isArray(parsed.data.favorites)) {
        return { ok: false };
      }

      // favoritesCache must be a plain object (Record<string, FavoriteCacheEntry>).
      // Without this guard, importing a malformed backup writes `"undefined"` to
      // localStorage via JSON.stringify(undefined) and corrupts the cache on next read.
      if (
        typeof parsed.data.favoritesCache !== "object" ||
        parsed.data.favoritesCache === null ||
        Array.isArray(parsed.data.favoritesCache)
      ) {
        return { ok: false };
      }

      return { ok: true, payload: parsed as DashboardBackupPayload };
    } catch {
      return { ok: false };
    }
  },
};
