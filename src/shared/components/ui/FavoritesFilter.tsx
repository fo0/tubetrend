import React from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface FavoritesFilterProps {
  value: string;
  onChange: (value: string) => void;
  /** Favorites currently passing the filter. */
  matchCount: number;
  /** Favorites in the unfiltered list. */
  totalCount: number;
}

/**
 * Compact name filter for the dashboard favorites list. Purely presentational —
 * the dashboard owns the filter value so the rows and this bar can never drift
 * apart (mirrors VideoListFilter on the analyser page).
 */
export const FavoritesFilter: React.FC<FavoritesFilterProps> = ({
  value,
  onChange,
  matchCount,
  totalCount,
}) => {
  const { t } = useTranslation();
  const isFiltering = value.trim().length > 0;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-0">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        </div>
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("dashboard.filter.placeholder")}
          aria-label={t("dashboard.filter.aria")}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="block w-full pl-9 pr-9 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition-all [&::-webkit-search-cancel-button]:hidden"
        />
        {isFiltering && (
          <button
            type="button"
            onClick={() => onChange("")}
            title={t("dashboard.filter.clear")}
            aria-label={t("dashboard.filter.clear")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {isFiltering && (
        <p
          role="status"
          aria-live="polite"
          className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap sm:pl-2"
        >
          {t("dashboard.filter.count", { count: matchCount, total: totalCount })}
        </p>
      )}
    </div>
  );
};
