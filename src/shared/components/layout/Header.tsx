import { Activity, BarChart3, Keyboard, LayoutDashboard, Settings } from "lucide-react";
import { useCallback, useRef, useState, useEffect } from "react";
import { ThemeToggle } from "@/src/shared/components/ui/ThemeToggle";
import { LanguageSwitcher } from "@/src/shared/components/ui/LanguageSwitcher";
import { ApiQuotaIndicator } from "@/src/shared/components/ui/ApiQuotaIndicator";
import { useEventBus } from "@/src/shared/lib/eventBus";
import { useTranslation } from "react-i18next";

export type PageType = "dashboard" | "analyser";

interface HeaderProps {
  activePage: PageType;
  onPageChange: (page: PageType) => void;
  apiKey: string | null;
  isLoading: boolean;
  loadingStep?: "fetching_youtube" | "analyzing_ai";
  onResetApiKey: () => void;
}

export function Header({
  activePage,
  onPageChange,
  apiKey,
  isLoading,
  loadingStep,
  onResetApiKey,
}: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="bg-white/80 border-b border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-[101.2rem] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-red-600 to-red-700 p-2 rounded-lg shadow-lg shadow-red-500/20">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400 hidden sm:block">
            {t("appTitle")}
          </h1>

          <nav aria-label={t("nav.main")} className="ml-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange("dashboard")}
              aria-current={activePage === "dashboard" ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors
                ${
                  activePage === "dashboard"
                    ? "bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700"
                    : "text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                }
              `}
              title={t("nav.dashboard")}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{t("nav.dashboard")}</span>
            </button>
            <button
              type="button"
              onClick={() => onPageChange("analyser")}
              aria-current={activePage === "analyser" ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors
                ${
                  activePage === "analyser"
                    ? "bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700"
                    : "text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                }
              `}
              title={t("nav.analyser")}
            >
              <BarChart3 className="w-4 h-4" />
              <span>{t("nav.analyser")}</span>
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <KeyboardShortcutsHint activePage={activePage} />
          {isLoading ? (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-indigo-500/10 border-indigo-500/20 text-indigo-400 animate-pulse"
              role="status"
              aria-live="polite"
            >
              <Activity className="w-3 h-3 animate-spin" aria-hidden="true" />
              <span>
                {loadingStep === "fetching_youtube"
                  ? t("loadingState.fetchingYoutube")
                  : t("loadingState.analyzing")}
              </span>
            </div>
          ) : (
            <>
              {apiKey && (
                <button
                  type="button"
                  onClick={onResetApiKey}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                             border-slate-300 text-slate-700 hover:bg-slate-100
                             dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                  title={t("actions.resetApiKey")}
                >
                  <Settings className="w-3 h-3" />
                  <span>{t("actions.resetApiKey")}</span>
                </button>
              )}
            </>
          )}

          <div className="flex items-center gap-2">
            {apiKey && <ApiQuotaIndicator />}
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

/** Small popover showing available keyboard shortcuts. Hidden on mobile. */
function KeyboardShortcutsHint({ activePage }: { activePage: PageType }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Allow the global "?" hotkey (dispatched from App) to toggle this popover.
  const handleToggle = useCallback(() => setIsOpen((prev) => !prev), []);
  useEventBus("toggle-shortcuts-hint", handleToggle);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  return (
    <div className="relative hidden md:block" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
        title={t("keyboard.label")}
        aria-label={t("keyboard.label")}
        aria-expanded={isOpen}
      >
        <Keyboard className="w-3.5 h-3.5" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 p-3 animate-fade-in">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
            {t("keyboard.label")}
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                {t("keyboard.focusSearch")}
              </span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-600 dark:text-slate-300">
                /
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                {t("keyboard.openDashboard")}
              </span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-600 dark:text-slate-300">
                D
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                {t("keyboard.openAnalyser")}
              </span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-600 dark:text-slate-300">
                A
              </kbd>
            </div>
            {activePage === "dashboard" && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  {t("keyboard.refreshAll")}
                </span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-600 dark:text-slate-300">
                  R
                </kbd>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">{t("keyboard.toggleHint")}</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-600 dark:text-slate-300">
                ?
              </kbd>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
