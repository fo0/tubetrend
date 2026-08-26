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
      {/* Two mechanisms, in this order:
          1. Below `md` the labelled controls collapse to icon-only (each keeps an
             explicit aria-label). That is what this header already does for the
             <h1>, ThemeToggle and the LanguageSwitcher label, and it is what
             keeps the bar on ONE row at every width where the content can fit —
             it is sticky, so a second row costs scarce vertical space, and
             DashboardPage's `scroll-mt-20` quick-jump offset is documented
             against this bar being 4rem tall.
          2. `flex-wrap` is the guard below that, matching DashboardPage and
             AnalyserPage. On the narrowest phones even the collapsed row does not
             fit, and a second line is strictly better than controls pushed off
             the side of the viewport.
          `min-h-16` instead of a fixed `h-16` so a wrapped or grown row gets
          taller rather than being clipped by it; 4rem stays the height in the
          common case. */}
      <div className="max-w-[101.2rem] mx-auto px-4 sm:px-6 lg:px-8 min-h-16 flex flex-wrap items-center justify-between gap-y-2">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-red-600 to-red-700 p-2 rounded-lg shadow-lg shadow-red-500/20">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          {/* sr-only (not `hidden`) below `sm`: the only <h1> on the page must stay
              in the accessibility tree on mobile even though it's visually hidden
              there for layout reasons — `hidden` would remove it from both. */}
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-100 dark:to-slate-400 sr-only sm:not-sr-only sm:block">
            {t("appTitle")}
          </h1>

          <nav aria-label={t("nav.main")} className="ml-1 md:ml-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange("dashboard")}
              aria-current={activePage === "dashboard" ? "page" : undefined}
              // The visible label is hidden below `md`, so the button needs an
              // explicit accessible name — `title` alone is not one for touch or
              // screen-reader users.
              aria-label={t("nav.dashboard")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors
                ${
                  activePage === "dashboard"
                    ? "bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700"
                    : "text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                }
              `}
              title={t("nav.dashboard")}
            >
              <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">{t("nav.dashboard")}</span>
            </button>
            <button
              type="button"
              onClick={() => onPageChange("analyser")}
              aria-current={activePage === "analyser" ? "page" : undefined}
              aria-label={t("nav.analyser")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors
                ${
                  activePage === "analyser"
                    ? "bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700"
                    : "text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                }
              `}
              title={t("nav.analyser")}
            >
              <BarChart3 className="w-4 h-4" aria-hidden="true" />
              <span className="hidden md:inline">{t("nav.analyser")}</span>
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <KeyboardShortcutsHint activePage={activePage} />
          {isLoading ? (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-indigo-500/10 border-indigo-500/20 text-indigo-400 animate-pulse"
              role="status"
              aria-live="polite"
            >
              <Activity className="w-3 h-3 animate-spin" aria-hidden="true" />
              {/* sr-only below `md`, not `hidden`: this is the text of a live
                  region, so removing it from the accessibility tree would leave
                  the status pill announcing nothing on exactly the screens where
                  the spinner is the only visible cue. Same trick as the <h1>. */}
              <span className="sr-only md:not-sr-only">
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
                  aria-label={t("actions.resetApiKey")}
                >
                  <Settings className="w-3 h-3" aria-hidden="true" />
                  <span className="hidden md:inline">{t("actions.resetApiKey")}</span>
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
  // The popover trigger, so Escape can hand focus back to it.
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  // Close on Escape, then return focus to the trigger: the panel is unmounted
  // on close, so without the explicit focus() a keyboard user is dropped on
  // <body> and resumes tabbing from the top of the page (WCAG 2.4.3).
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  return (
    <div className="relative hidden md:block" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
        title={t("keyboard.label")}
        aria-label={t("keyboard.label")}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls="keyboard-shortcuts-panel"
      >
        <Keyboard className="w-3.5 h-3.5" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          id="keyboard-shortcuts-panel"
          role="dialog"
          aria-label={t("keyboard.label")}
          className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 p-3 animate-fade-in"
        >
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
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                {t("keyboard.toggleTheme")}
              </span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-600 dark:text-slate-300">
                T
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
