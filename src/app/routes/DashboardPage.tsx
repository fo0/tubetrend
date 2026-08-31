import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Check,
  Copy,
  Download,
  EyeOff,
  FileJson,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { FavoriteRow } from "@/src/shared/components/ui/FavoriteRow";
import { FavoriteAvatar } from "@/src/shared/components/ui/FavoriteAvatar";
import { FavoritesFilter } from "@/src/shared/components/ui/FavoritesFilter";
import { HighlightVideoCard } from "@/src/shared/components/ui/HighlightVideoCard";
import { FloatingScrollButton } from "@/src/shared/components/ui/FloatingScrollButton";
import { showToast } from "@/src/shared/components/feedback";
import { useFileDropZone } from "@/src/shared/hooks";
import { useTranslation } from "react-i18next";
import type { FavoriteConfig } from "@/src/features/favorites/types";
import type { VideoData } from "@/src/features/videos/types";
import { favoritesService } from "@/src/features/favorites";
import {
  hiddenHighlightsService,
  selectHighlightVideosFromFavorites,
} from "@/src/features/dashboard";
import { buildResultsCsv, buildResultsCsvFilename } from "@/src/features/videos";
import { downloadBlob } from "@/src/shared/lib/download";
import { getLocale } from "@/src/shared/lib/locale";
import type { DashboardSortMode } from "@/src/shared/types";

/**
 * Below this many favorites the list fits on screen, so the filter bar would
 * only add clutter (mirrors FILTER_MIN_ROWS in VideoListTable).
 */
const FAVORITES_FILTER_MIN_ROWS = 5;

interface DashboardPageProps {
  favorites: FavoriteConfig[];
  sortedFavorites: FavoriteConfig[];
  refreshToken: number;
  refreshingIds: Set<string>;
  dashboardSortMode: DashboardSortMode;
  dashboardSortOrder: "asc" | "desc";
  cacheTick: number;
  hiddenTick: number;
  onRemoveFavorite: (id: string) => void;
  onAnalyzeFavorite: (
    favorite: FavoriteConfig,
    cachedVideos: VideoData[] | null,
    channelTitle: string,
    channelId: string | null,
  ) => void;
  onRefreshAll: () => void;
  onSortClick: (mode: DashboardSortMode) => void;
  onExport: () => void;
  onImportFile: (file: File) => Promise<void>;
  onOpenHiddenModal: () => void;
  onClearAllFavorites: () => void;
  onOpenAnalyser: () => void;
}

export function DashboardPage({
  favorites,
  sortedFavorites,
  refreshToken,
  refreshingIds,
  dashboardSortMode,
  dashboardSortOrder,
  cacheTick,
  hiddenTick,
  onRemoveFavorite,
  onAnalyzeFavorite,
  onRefreshAll,
  onSortClick,
  onExport,
  onImportFile,
  onOpenHiddenModal,
  onClearAllFavorites,
  onOpenAnalyser,
}: DashboardPageProps) {
  const { t } = useTranslation();
  const importRef = useRef<HTMLInputElement | null>(null);
  const [favoriteFilter, setFavoriteFilter] = useState("");

  const handleImportPick = () => {
    importRef.current?.click();
  };

  // Restoring a dashboard backup meant hunting for the "Import" button in a
  // toolbar that already carries up to six others, then walking a file picker to
  // the download folder the file was just written to. Dropping the file on the
  // page is the shorter route and the one people try first — it used to make the
  // browser navigate away from the app and render the raw JSON instead.
  //
  // Same handler as the file picker, so the confirm dialog, the validation and
  // the replace semantics are identical however the file arrives.
  const runImport = useCallback(
    (file: File) => {
      onImportFile(file).catch(() => {
        showToast(t("backup.importInvalid"), "error");
      });
    },
    [onImportFile, t],
  );

  const rejectImport = useCallback(() => {
    // Anything but .json is refused before it is read — silently ignoring the
    // drop would look exactly like a drop the page never received.
    showToast(t("backup.importWrongType"), "error");
  }, [t]);

  const { isDragging, dropHandlers } = useFileDropZone({
    extension: ".json",
    onFile: runImport,
    onReject: rejectImport,
  });

  // Progress for a running refresh. "Refresh all" staggers one favorite every
  // 300ms, so with a dozen favorites the button sat disabled with a spinner for
  // a long while and gave no clue how much was left. refreshingIds only holds
  // what is still in flight, so remember the highest value seen during the run
  // as the total; it resets to 0 once the last row reports back.
  const refreshingCount = refreshingIds.size;
  const [refreshTotal, setRefreshTotal] = useState(0);
  useEffect(() => {
    setRefreshTotal((prev) => (refreshingCount === 0 ? 0 : Math.max(prev, refreshingCount)));
  }, [refreshingCount]);
  // Only meaningful for a batch — a single row refresh has its own spinner.
  const showRefreshProgress = refreshTotal > 1 && refreshingCount > 0;
  const refreshProgressLabel = showRefreshProgress
    ? t("actions.refreshProgress", { done: refreshTotal - refreshingCount, total: refreshTotal })
    : "";

  const showFavoriteFilter = favorites.length >= FAVORITES_FILTER_MIN_ROWS;
  const normalizedFavoriteFilter = showFavoriteFilter ? favoriteFilter.trim().toLowerCase() : "";

  // Searchable text per favorite, built once per list/cache change. Matching
  // covers the saved label, the raw query and the resolved channel title from
  // the cache, so "@mkbhd" and "Marques Brownlee" both find the same row.
  //
  // This must stay out of the keystroke path: getCache() re-reads and
  // re-JSON-parses the whole favorites cache blob on every call, so building
  // the haystacks inside the filter did that work once per favorite for every
  // single character typed (same reason the hidden list is read once below).
  const favoriteHaystacks = useMemo(() => {
    const haystacks = new Map<string, string>();
    for (const fav of sortedFavorites) {
      const channelTitle = favoritesService.getCache(fav.id)?.meta?.channelTitle ?? "";
      haystacks.set(fav.id, `${fav.label ?? ""} ${fav.query} ${channelTitle}`.toLowerCase());
    }
    return haystacks;
    // cacheTick: a refresh can resolve a channel title that was unknown before.
    // It is a cache-buster for the imperative getCache() reads above, never read
    // in the body — exhaustive-deps cannot see that and calls it unnecessary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedFavorites, cacheTick]);

  // `null` means "no filter active" — every favorite stays visible. Typing only
  // runs substring checks against the precomputed haystacks above.
  const matchingFavoriteIds = useMemo<Set<string> | null>(() => {
    if (!normalizedFavoriteFilter) return null;
    const ids = new Set<string>();
    for (const fav of sortedFavorites) {
      const haystack = favoriteHaystacks.get(fav.id) ?? "";
      if (haystack.includes(normalizedFavoriteFilter)) ids.add(fav.id);
    }
    return ids;
  }, [sortedFavorites, favoriteHaystacks, normalizedFavoriteFilter]);

  const visibleFavorites = matchingFavoriteIds
    ? sortedFavorites.filter((fav) => matchingFavoriteIds.has(fav.id))
    : sortedFavorites;

  const highlightVideosData = useMemo(() => {
    const raw = selectHighlightVideosFromFavorites(
      sortedFavorites,
      (id) => favoritesService.getCache(id),
      { perFavorite: 1, maxTotal: sortedFavorites.length },
    );

    // Sort by velocity
    const sorted = [...raw].sort((a, b) => {
      const av = Number(a.video?.viewsPerHour);
      const bv = Number(b.video?.viewsPerHour);
      const aVph = Number.isFinite(av) ? av : -1;
      const bVph = Number.isFinite(bv) ? bv : -1;
      if (aVph !== bVph) return bVph - aVph;
      const aTs = typeof a.video?.trendingScore === "number" ? a.video.trendingScore : -1;
      const bTs = typeof b.video?.trendingScore === "number" ? b.video.trendingScore : -1;
      if (aTs !== bTs) return bTs - aTs;
      return a.sourceLabel.localeCompare(b.sourceLabel, getLocale(), { sensitivity: "base" });
    });

    // Read the hidden list once. `isHidden()` re-reads localStorage, JSON-parses
    // it and re-validates every entry on each call, so calling it inside the
    // filter did that work once per highlight item.
    const hiddenIds = new Set(hiddenHighlightsService.list().map((h) => h.videoId));
    const visible = sorted.filter((item) => !hiddenIds.has(item.video.id));
    const hiddenCount = sorted.length - visible.length;

    return { visible, hiddenCount };
    // cacheTick / hiddenTick are cache-busters, not inputs: the memo reads the
    // favorites cache and the hidden-highlights list imperatively, so these
    // counters are the only signal that either store changed. Dropping them
    // freezes the highlight list until an unrelated re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedFavorites, cacheTick, hiddenTick]);

  const highlightVideos = highlightVideosData.visible;
  const hiddenHighlightsCount = highlightVideosData.hiddenCount;

  // Bulk copy of every visible highlight URL. The analyser's results bar has
  // offered this for a while; the dashboard — the surface most users start on —
  // only had a per-card copy button, so collecting the day's highlights meant
  // one click per card. Same clipboard guard and transient icon feedback as
  // VideoCard / HighlightVideoCard, so a blocked clipboard is never a silent
  // no-op.
  const [copiedAllHighlights, setCopiedAllHighlights] = useState(false);
  const [copyAllHighlightsFailed, setCopyAllHighlightsFailed] = useState(false);
  const copiedAllTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyAllFailedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedAllTimerRef.current) clearTimeout(copiedAllTimerRef.current);
      if (copyAllFailedTimerRef.current) clearTimeout(copyAllFailedTimerRef.current);
    };
  }, []);

  const flashCopyAllFailed = () => {
    setCopyAllHighlightsFailed(true);
    if (copyAllFailedTimerRef.current) clearTimeout(copyAllFailedTimerRef.current);
    copyAllFailedTimerRef.current = setTimeout(() => setCopyAllHighlightsFailed(false), 2500);
  };

  // Jump from a highlight card (or an avatar in the quick-jump strip) to the
  // favorite row it belongs to.
  const scrollToFavorite = (favoriteId: string) => {
    document
      .getElementById(`favorite-${favoriteId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // A filtered-out row is rendered with `hidden` (never unmounted, to protect
  // the API quota), so scrolling to it would land on a zero-height element.
  // Drop the filter first and let the effect below scroll once the row is back.
  const [pendingJumpId, setPendingJumpId] = useState<string | null>(null);

  const handleJumpToSource = (sourceId: string) => {
    if (matchingFavoriteIds && !matchingFavoriteIds.has(sourceId)) {
      setFavoriteFilter("");
      setPendingJumpId(sourceId);
      return;
    }
    scrollToFavorite(sourceId);
  };

  useEffect(() => {
    if (!pendingJumpId) return;
    scrollToFavorite(pendingJumpId);
    setPendingJumpId(null);
  }, [pendingJumpId]);

  // Export every visible highlight as CSV. The analyser has offered CSV/JSON for
  // its result list for a while; the dashboard could only copy bare URLs, so
  // getting the day's highlights into a sheet meant pasting links and refilling
  // views, velocity and score by hand. Same builder as the analyser export, so
  // both files share one column layout and one CSV-injection guard.
  const handleExportHighlightsCsv = () => {
    if (highlightVideos.length === 0) return;
    try {
      const csv = buildResultsCsv(highlightVideos.map((item) => item.video));
      downloadBlob(
        buildResultsCsvFilename("highlights"),
        new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      );
      showToast(t("dashboard.highlights.exportDone"), "success");
    } catch {
      // The download can be blocked (sandboxed iframe, hardened Electron
      // window) — never report a file the browser refused to write.
      showToast(t("dashboard.highlights.exportFailed"), "error");
    }
  };

  const handleCopyAllHighlights = () => {
    if (highlightVideos.length === 0) return;
    // navigator.clipboard is undefined in insecure contexts (HTTP, some
    // iframes); reading .writeText off it throws synchronously, which the
    // rejection handler below would not catch — guard the property first.
    if (!navigator.clipboard) {
      flashCopyAllFailed();
      return;
    }
    const urls = highlightVideos.map((item) => item.video.url).join("\n");
    navigator.clipboard.writeText(urls).then(
      () => {
        setCopiedAllHighlights(true);
        if (copiedAllTimerRef.current) clearTimeout(copiedAllTimerRef.current);
        copiedAllTimerRef.current = setTimeout(() => setCopiedAllHighlights(false), 1500);
      },
      () => {
        // Clipboard write rejected (permissions / focus) — surface it.
        flashCopyAllFailed();
      },
    );
  };

  return (
    <div className="animate-fade-in" {...dropHandlers}>
      {/* Drop hint for a backup file dragged onto the page. `pointer-events-none`
          is load-bearing: an overlay that took the pointer would sit between the
          cursor and the drop target above, firing a dragleave/dragenter pair on
          every frame and cancelling the drop it is advertising. z-[55] puts it
          over the sticky header (z-50) but under the toasts (z-60) that report
          the outcome. */}
      {isDragging && (
        <div
          className="pointer-events-none fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] animate-fade-in"
          aria-hidden="true"
        >
          <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-indigo-400 bg-white px-6 py-4 text-sm font-medium text-slate-700 shadow-2xl dark:border-indigo-500 dark:bg-slate-900 dark:text-slate-200">
            <FileJson className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            {t("backup.dropHint")}
          </div>
        </div>
      )}

      {/* Hidden file input for dashboard import */}
      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          runImport(f);
        }}
      />

      {/* Polite live region: the bulk-copy result is otherwise only conveyed by a
          transient icon swap, which is silent to assistive tech (mirrors the
          analyser's bulk actions and the per-card copy buttons). */}
      <p className="sr-only" role="status" aria-live="polite">
        {copyAllHighlightsFailed
          ? t("dashboard.highlights.copyAllFailed")
          : copiedAllHighlights
            ? t("dashboard.highlights.copyAllDone")
            : ""}
      </p>

      {favorites.length > 0 && (
        <section
          className={`mb-6 rounded-2xl border border-indigo-200/70 bg-indigo-50/40 p-4 shadow-sm dark:border-indigo-500/20 dark:bg-indigo-500/10 ${refreshingIds.size > 0 ? "highlights-loading-border" : ""}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
            <div>
              {/* h2: the page's <h1> (Header) otherwise skips straight to each
                  favorite row's <h3> (WCAG 1.3.1 — no skipped heading levels). */}
              <h2 className="text-xs font-extrabold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                {t("dashboard.highlights.title")}
              </h2>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {t("dashboard.highlights.subtitle")}
              </div>
            </div>

            {/* flex-wrap: up to five labelled buttons (Import, Export, Refresh
                all, Clear all, Hidden) share this row with the count badge. On
                one unwrapped line they run past the section — and the page
                container with it — on any viewport narrower than a desktop. */}
            <div className="flex flex-wrap items-center justify-end gap-2 min-w-0">
              {highlightVideos.length > 0 && (
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
                  {t("dashboard.highlights.count", { count: highlightVideos.length })}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 min-w-0">
                {highlightVideos.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCopyAllHighlights}
                    className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                      copyAllHighlightsFailed
                        ? "border-red-300/60 text-red-600 dark:border-red-700/40 dark:text-red-400"
                        : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                    title={
                      copyAllHighlightsFailed
                        ? t("dashboard.highlights.copyAllFailed")
                        : t("dashboard.highlights.copyAllUrls")
                    }
                    aria-label={
                      copyAllHighlightsFailed
                        ? t("dashboard.highlights.copyAllFailed")
                        : t("dashboard.highlights.copyAllUrls")
                    }
                  >
                    {copyAllHighlightsFailed ? (
                      <AlertCircle className="w-3 h-3" aria-hidden="true" />
                    ) : copiedAllHighlights ? (
                      <Check className="w-3 h-3 text-green-500" aria-hidden="true" />
                    ) : (
                      <Copy className="w-3 h-3" aria-hidden="true" />
                    )}
                    <span className="whitespace-nowrap">{t("dashboard.highlights.copyAll")}</span>
                  </button>
                )}
                {highlightVideos.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportHighlightsCsv}
                    className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors
                             border-slate-300 text-slate-700 hover:bg-slate-100
                             dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    title={t("dashboard.highlights.exportCsvTitle")}
                    aria-label={t("dashboard.highlights.exportCsvTitle")}
                  >
                    <Download className="w-3 h-3" aria-hidden="true" />
                    <span className="whitespace-nowrap">{t("dashboard.highlights.exportCsv")}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleImportPick}
                  className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors
                           border-slate-300 text-slate-700 hover:bg-slate-100
                           dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  title={t("actions.importDashboard")}
                >
                  <Upload className="w-3 h-3" /> {t("actions.importDashboard")}
                </button>
                <button
                  type="button"
                  onClick={onExport}
                  disabled={favorites.length === 0}
                  className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors
                           border-slate-300 text-slate-700 hover:bg-slate-100
                           disabled:opacity-50 disabled:cursor-not-allowed
                           dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  title={t("actions.exportDashboard")}
                >
                  <Download className="w-3 h-3" /> {t("actions.exportDashboard")}
                </button>
                <button
                  type="button"
                  onClick={onRefreshAll}
                  disabled={favorites.length === 0 || refreshingIds.size > 0}
                  aria-busy={refreshingIds.size > 0}
                  className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors
                           border-slate-300 text-slate-700 hover:bg-slate-100
                           disabled:opacity-50 disabled:cursor-not-allowed
                           dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  title={
                    showRefreshProgress
                      ? refreshProgressLabel
                      : refreshingIds.size > 0
                        ? t("favorites.status.refreshing")
                        : t("actions.refreshAll")
                  }
                >
                  <RefreshCw
                    className={`w-3 h-3 ${refreshingIds.size > 0 ? "animate-spin" : ""}`}
                  />{" "}
                  <span className="whitespace-nowrap">
                    {showRefreshProgress ? refreshProgressLabel : t("actions.refreshAll")}
                  </span>
                </button>
                {favorites.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearAllFavorites}
                    className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors
                             border-red-300/60 text-red-600 hover:bg-red-50
                             dark:border-red-700/40 dark:text-red-400 dark:hover:bg-red-900/20"
                    title={t("favorites.clearAll")}
                  >
                    <Trash2 className="w-3 h-3" /> {t("favorites.clearAll")}
                  </button>
                )}
                {hiddenHighlightsCount > 0 && (
                  <button
                    type="button"
                    onClick={onOpenHiddenModal}
                    className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors
                             border-amber-300 text-amber-700 hover:bg-amber-50
                             dark:border-amber-600/50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                    title={t("dashboard.highlights.showHiddenList")}
                  >
                    <EyeOff className="w-3 h-3" /> {t("dashboard.highlights.hiddenButton")}
                  </button>
                )}
              </div>
            </div>
          </div>

          {highlightVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {highlightVideos.map((item, idx) => (
                <HighlightVideoCard
                  key={`${item.video.id}:${item.sourceId}:${item.sourceRank}`}
                  video={item.video}
                  highlightRank={idx + 1}
                  sourceLabel={item.sourceLabel}
                  sourceRank={item.sourceRank}
                  sourceId={item.sourceId}
                  isRefreshing={refreshingIds.has(item.sourceId)}
                  onHide={(sourceId, videoId, meta) =>
                    hiddenHighlightsService.hide(sourceId, videoId, meta)
                  }
                  onJumpToSource={handleJumpToSource}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white/50 dark:bg-slate-800/50 rounded-xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50 flex flex-col h-full"
                >
                  <div className="h-40 bg-slate-200 dark:bg-slate-700" />
                  <div className="p-4 flex flex-col grow">
                    <div className="mb-2">
                      <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                      <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded mb-1" />
                      <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/50 dark:border-slate-700/50" />
                      <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/50 dark:border-slate-700/50" />
                    </div>
                  </div>
                </div>
              ))}
              <div className="col-span-full flex items-center justify-center -mt-[200px] pointer-events-none">
                <div className="text-center text-slate-500 dark:text-slate-400 text-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-lg">
                  {t("dashboard.highlights.empty")}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Sorting controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        {favorites.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium min-w-0">
            <span className="text-slate-600 dark:text-slate-400">
              {t("dashboard.sorting.label")}
            </span>
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
                hint that activating one jumps to that favorite. */}
            {visibleFavorites.length > 0 && (
              <div
                role="group"
                aria-label={t("dashboard.quickJump")}
                className="flex flex-wrap items-center gap-1.5 ml-2 pl-3 border-l border-slate-300 dark:border-slate-700 min-w-0"
              >
                {visibleFavorites.map((fav) => (
                  <FavoriteAvatar
                    key={fav.id}
                    favorite={fav}
                    isRefreshing={refreshingIds.has(fav.id)}
                    size="sm"
                    // Same jump the highlight cards use — one implementation.
                    onClick={() => scrollToFavorite(fav.id)}
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
                onClick={handleImportPick}
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

      {/* Favorites list */}
      {favorites.length === 0 ? (
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
              onChange={setFavoriteFilter}
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
                onClick={() => setFavoriteFilter("")}
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
      )}

      {/* Floating scroll button - subtle, appears based on scroll direction */}
      <FloatingScrollButton />
    </div>
  );
}
