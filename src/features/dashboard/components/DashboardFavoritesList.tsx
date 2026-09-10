import { BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FavoriteRow } from "@/src/shared/components/ui/FavoriteRow";
import { FavoritesFilter } from "@/src/shared/components/ui/FavoritesFilter";
import type { FavoriteConfig } from "@/src/features/favorites/types";
import type { VideoData } from "@/src/features/videos/types";

interface DashboardFavoritesListProps {
  favorites: FavoriteConfig[];
  sortedFavorites: FavoriteConfig[];
  visibleFavorites: FavoriteConfig[];
  matchingFavoriteIds: Set<string> | null;
  favoriteFilter: string;
  showFavoriteFilter: boolean;
  refreshToken: number;
  onFavoriteFilterChange: (value: string) => void;
  onRemoveFavorite: (id: string) => void;
  onAnalyzeFavorite: (
    favorite: FavoriteConfig,
    cachedVideos: VideoData[] | null,
    channelTitle: string,
    channelId: string | null,
  ) => void;
  onOpenAnalyser: () => void;
}

export function DashboardFavoritesList({
  favorites,
  sortedFavorites,
  visibleFavorites,
  matchingFavoriteIds,
  favoriteFilter,
  showFavoriteFilter,
  refreshToken,
  onFavoriteFilterChange,
  onRemoveFavorite,
  onAnalyzeFavorite,
  onOpenAnalyser,
}: DashboardFavoritesListProps) {
  const { t } = useTranslation();

  return favorites.length === 0 ? (
    <div className="bg-slate-50 border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800 rounded-xl p-8 text-center flex flex-col items-center gap-4">
      <p className="text-slate-600 dark:text-slate-400">{t("dashboard.noFavorites")}</p>
      <button
        type="button"
        onClick={onOpenAnalyser}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors shadow-sm shadow-indigo-900/20"
      >
        <BarChart3 className="w-4 h-4" />
        {t("dashboard.openAnalyser")}
      </button>
    </div>
  ) : (
    <>
      {showFavoriteFilter && (
        <FavoritesFilter
          value={favoriteFilter}
          onChange={onFavoriteFilterChange}
          matchCount={visibleFavorites.length}
          totalCount={sortedFavorites.length}
        />
      )}

      {matchingFavoriteIds && visibleFavorites.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800 rounded-xl p-8 text-center flex flex-col items-center gap-3">
          <p className="text-slate-600 dark:text-slate-400">
            {t("dashboard.filter.noMatches", { query: favoriteFilter.trim() })}
          </p>
          <button
            type="button"
            onClick={() => onFavoriteFilterChange("")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {t("dashboard.filter.clear")}
          </button>
        </div>
      )}

      <div className="space-y-10">
        {sortedFavorites.map((fav, idx) => {
          // Filtered-out rows are hidden, not unmounted: a FavoriteRow
          // re-fetches from the YouTube API when its cache is stale, so
          // unmounting on every keystroke would burn API quota.
          const isVisible = !matchingFavoriteIds || matchingFavoriteIds.has(fav.id);
          return (
            // scroll-mt-20 (5rem) clears the sticky header (h-16 = 4rem) plus a
            // little breathing room. Without it the avatar quick-jump below
            // aligns the row flush with the viewport top, where the header
            // covers the favorite's own title — the user lands on a row whose
            // heading they cannot see.
            <div
              key={fav.id}
              id={`favorite-${fav.id}`}
              className={isVisible ? "scroll-mt-20" : "hidden"}
            >
              <FavoriteRow
                favorite={fav}
                onRemove={onRemoveFavorite}
                onAnalyze={onAnalyzeFavorite}
                globalRefreshToken={refreshToken}
                staggerIndex={idx}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
