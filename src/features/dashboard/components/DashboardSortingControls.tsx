import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";
import { Activity, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FavoriteAvatar } from "@/src/shared/components/ui/FavoriteAvatar";
import type { FavoriteConfig } from "@/src/features/favorites/types";
import type { DashboardSortMode } from "@/src/shared/types";

interface DashboardSortingControlsProps {
  favorites: FavoriteConfig[];
  visibleFavorites: FavoriteConfig[];
  refreshingIds: Set<string>;
  dashboardSortMode: DashboardSortMode;
  dashboardSortOrder: "asc" | "desc";
  quickJumpRef: RefObject<HTMLDivElement | null>;
  activeQuickJumpIndex: number;
  onSortClick: (mode: DashboardSortMode) => void;
  onQuickJumpKeyDown: (e: ReactKeyboardEvent<HTMLButtonElement>, index: number) => void;
  onQuickJumpIndexChange: (index: number) => void;
  onScrollToFavorite: (favoriteId: string) => void;
  onImportPick: () => void;
}

export function DashboardSortingControls({
  favorites,
  visibleFavorites,
  refreshingIds,
  dashboardSortMode,
  dashboardSortOrder,
  quickJumpRef,
  activeQuickJumpIndex,
  onSortClick,
  onQuickJumpKeyDown,
  onQuickJumpIndexChange,
  onScrollToFavorite,
  onImportPick,
}: DashboardSortingControlsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
      {favorites.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium min-w-0">
          <span className="text-slate-600 dark:text-slate-400">{t("dashboard.sorting.label")}</span>
          <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900/60">
            <button
              type="button"
              onClick={() => onSortClick("alpha")}
              aria-pressed={dashboardSortMode === "alpha"}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                dashboardSortMode === "alpha"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800"
              }`}
              title={t("dashboard.sorting.alphaTitle")}
            >
              <span>
                {dashboardSortMode === "alpha"
                  ? dashboardSortOrder === "asc"
                    ? "A–Z"
                    : "Z–A"
                  : "A–Z"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onSortClick("velocity")}
              aria-pressed={dashboardSortMode === "velocity"}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                dashboardSortMode === "velocity"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800"
              }`}
              title={t("dashboard.sorting.velocityTitle")}
            >
              <Activity className="w-3 h-3" aria-hidden="true" />
              <span>
                {t("dashboard.sorting.activity")}
                {dashboardSortMode === "velocity"
                  ? dashboardSortOrder === "desc"
                    ? " ↓"
                    : " ↑"
                  : ""}
              </span>
            </button>
          </div>

          {/* Favorite Avatars — filtered-out favorites are dropped here too,
              otherwise their quick-jump would scroll to a hidden row.
              flex-wrap + min-w-0: the avatars are shrink-0, so an unwrapped
              strip grew past the page container once a user had ~15 favorites
              and pushed the whole layout into a horizontal scroll.
              role/aria-label: without them the strip is an unnamed run of
              buttons whose only accessible name is a channel title, giving no
              hint that activating one jumps to that favorite. "toolbar" is
              the role that goes with the roving tab stop below — it tells
              assistive tech that the arrow keys, not Tab, move within. */}
          {visibleFavorites.length > 0 && (
            <div
              ref={quickJumpRef}
              role="toolbar"
              aria-label={t("dashboard.quickJump")}
              className="flex flex-wrap items-center gap-1.5 ml-2 pl-3 border-l border-slate-300 dark:border-slate-700 min-w-0"
            >
              {visibleFavorites.map((fav, idx) => (
                <FavoriteAvatar
                  key={fav.id}
                  favorite={fav}
                  isRefreshing={refreshingIds.has(fav.id)}
                  size="sm"
                  // Exactly one avatar is in the tab order; the arrows move the
                  // stop along, and a click hands it to whatever was clicked so
                  // Tab and pointer never disagree about where the user is.
                  tabIndex={idx === activeQuickJumpIndex ? 0 : -1}
                  onKeyDown={(e) => onQuickJumpKeyDown(e, idx)}
                  // Same jump the highlight cards use — one implementation.
                  onClick={() => {
                    onQuickJumpIndexChange(idx);
                    onScrollToFavorite(fav.id);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div />
      )}

      {/* Fallback actions when no favorites */}
      {favorites.length === 0 && (
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onImportPick}
              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors
                         border-slate-300 text-slate-700 hover:bg-slate-100
                         dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              title={t("actions.importDashboard")}
            >
              <Upload className="w-3 h-3" /> {t("actions.importDashboard")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
