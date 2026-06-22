import { AlertCircle, Search } from "lucide-react";
import { Youtube } from "@/src/shared/components/ui/BrandIcons";
import { useTranslation } from "react-i18next";
import { SearchType } from "@/src/shared/types";

/** One clickable quick-start example shown on the welcome screen. */
export interface EmptyStateExample {
  /** Text shown on the chip and used to pre-fill the search box (e.g. "@MrBeast", "#lofi"). */
  label: string;
  /** Query passed to the search (without any "#" prefix). */
  query: string;
  searchType: SearchType;
}

interface EmptyStateProps {
  /** "welcome" = initial state before any search; "no-results" = search returned nothing */
  variant?: "welcome" | "no-results";
  /** Quick-start examples; only rendered for the "welcome" variant when onPickExample is set. */
  examples?: EmptyStateExample[];
  /** Invoked when a quick-start example chip is clicked. */
  onPickExample?: (query: string, searchType: SearchType) => void;
}

export function EmptyState({ variant = "welcome", examples, onPickExample }: EmptyStateProps) {
  const { t } = useTranslation();

  if (variant === "no-results") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-xl border border-slate-200 dark:border-slate-700">
          <AlertCircle className="w-12 h-12 text-slate-400 dark:text-slate-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">
          {t("emptyState.title")}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md">{t("emptyState.description")}</p>
      </div>
    );
  }

  const showExamples = !!onPickExample && !!examples && examples.length > 0;

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-xl border border-slate-200 dark:border-slate-700 animate-pulse">
        <Youtube className="w-12 h-12 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">
        {t("empty.title")}
      </h2>
      <p className="text-slate-500 dark:text-slate-400 max-w-md">{t("empty.desc")}</p>

      {showExamples && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t("empty.tryExamples")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {examples.map((ex) => (
              <button
                key={`${ex.searchType}:${ex.query}`}
                type="button"
                onClick={() => onPickExample(ex.query, ex.searchType)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors
                           border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400
                           dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:hover:border-slate-600"
                title={t("empty.exampleTitle", { example: ex.label })}
              >
                <Search
                  className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400"
                  aria-hidden="true"
                />
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
