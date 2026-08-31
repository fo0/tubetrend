import React, { useCallback, useRef } from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEventListener } from "@/src/shared/hooks";

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
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" focuses this filter — the dashboard counterpart to the analyser's search
  // box, which registers the same key. The shortcuts popover advertises "/" as a
  // global "focus search", but nothing on the dashboard listened for it, so the
  // key was dead on half the app. Dashboard and analyser are mutually exclusive
  // pages, so the two inputs can never claim the key at the same time.
  const handleFocusHotkey = useCallback((e: KeyboardEvent) => {
    if (e.key !== "/") return;
    const target = e.target as HTMLElement | null;
    if (
      target?.tagName === "INPUT" ||
      target?.tagName === "TEXTAREA" ||
      target?.isContentEditable
    ) {
      return;
    }
    e.preventDefault();
    inputRef.current?.focus();
  }, []);
  useEventListener("keydown", handleFocusHotkey, document);

  // Escape clears an active filter and keeps the caret in the field, so the way
  // back to the full list is the same key that dismisses everything else in the
  // app. The analyser's search box has treated Escape as "clear what I typed"
  // for a while; this bar did not, and the browser's own affordance is gone —
  // `[&::-webkit-search-cancel-button]:hidden` below removes the native clear
  // button of the `type="search"` input. That left the X button as the only way
  // out, i.e. a mouse move for a filter that was reached by hotkey and typed
  // into blind. The key is only swallowed while there is something to clear, so
  // an empty field lets Escape bubble to whatever else may want it.
  const handleFilterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Escape" || value.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
    onChange("");
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-0">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        </div>
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleFilterKeyDown}
          placeholder={t("dashboard.filter.placeholder")}
          aria-label={t("dashboard.filter.aria")}
          title={t("dashboard.filter.shortcutHint")}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="block w-full pl-9 pr-9 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 transition-all [&::-webkit-search-cancel-button]:hidden"
        />
        {isFiltering ? (
          <button
            type="button"
            onClick={() => onChange("")}
            title={t("dashboard.filter.clear")}
            aria-label={t("dashboard.filter.clear")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        ) : (
          /* Discoverability for the "/" hotkey — decorative, the title attribute
             above carries the same information for assistive tech. Shares the
             right slot with the clear button, which only exists while filtering. */
          <span
            aria-hidden="true"
            className="absolute inset-y-0 right-0 pr-3 hidden sm:flex items-center pointer-events-none"
          >
            <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-100 font-mono text-[10px] leading-none text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
              /
            </kbd>
          </span>
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
