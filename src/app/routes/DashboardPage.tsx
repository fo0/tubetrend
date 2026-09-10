import { useCallback, useEffect, useRef, useState } from "react";
import { FloatingScrollButton } from "@/src/shared/components/ui/FloatingScrollButton";
import { showToast } from "@/src/shared/components/feedback";
import { useFileDropZone } from "@/src/shared/hooks";
import { useTranslation } from "react-i18next";
import type { FavoriteConfig } from "@/src/features/favorites/types";
import type { VideoData } from "@/src/features/videos/types";
import {
  DashboardDropOverlay,
  DashboardFavoritesList,
  DashboardHighlightsGrid,
  DashboardHighlightsLiveRegion,
  DashboardHighlightsToolbar,
  DashboardSortingControls,
  useDashboardFilters,
  useHighlightsCopyAll,
  useQuickJumpFocus,
  useUndoHiddenHighlight,
} from "@/src/features/dashboard";
import type { DashboardSortMode } from "@/src/shared/types";

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

  const {
    showFavoriteFilter,
    matchingFavoriteIds,
    visibleFavorites,
    highlightVideos,
    hiddenHighlightsCount,
  } = useDashboardFilters({
    favorites,
    sortedFavorites,
    favoriteFilter,
    cacheTick,
    hiddenTick,
  });

  const { copiedAllHighlights, copyAllHighlightsFailed, handleCopyAllHighlights } =
    useHighlightsCopyAll(highlightVideos);

  const { lastHidden, handleHideHighlight, handleUndoHide } = useUndoHiddenHighlight();

  // Jump from a highlight card (or an avatar in the quick-jump strip) to the
  // favorite row it belongs to.
  //
  // The reduced-motion block in src/styles/index.css sets
  // `scroll-behavior: auto !important`, but that only governs scrolls that ask
  // for the *computed* behaviour. Per CSSOM-View, an explicit `behavior:
  // "smooth"` argument wins over the CSS property, so this one call animated
  // the whole page for motion-sensitive users no matter what their OS said —
  // the single scroll in the app the stylesheet could not reach (WCAG 2.3.3).
  // Resolving the preference here closes that hole; everyone else is unchanged.
  const scrollToFavorite = (favoriteId: string) => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    document.getElementById(`favorite-${favoriteId}`)?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
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

  const { quickJumpRef, activeQuickJumpIndex, setQuickJumpIndex, handleQuickJumpKeyDown } =
    useQuickJumpFocus(visibleFavorites.length);

  return (
    <div className="animate-fade-in" {...dropHandlers}>
      {/* Drop hint for a backup file dragged onto the page. */}
      {isDragging && <DashboardDropOverlay />}

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

      <DashboardHighlightsLiveRegion
        copiedAllHighlights={copiedAllHighlights}
        copyAllHighlightsFailed={copyAllHighlightsFailed}
        lastHidden={lastHidden}
      />

      {favorites.length > 0 && (
        <section
          className={`mb-6 rounded-2xl border border-indigo-200/70 bg-indigo-50/40 p-4 shadow-sm dark:border-indigo-500/20 dark:bg-indigo-500/10 ${refreshingIds.size > 0 ? "highlights-loading-border" : ""}`}
        >
          <DashboardHighlightsToolbar
            favorites={favorites}
            highlightVideos={highlightVideos}
            refreshingIds={refreshingIds}
            showRefreshProgress={showRefreshProgress}
            refreshProgressLabel={refreshProgressLabel}
            hiddenHighlightsCount={hiddenHighlightsCount}
            lastHidden={lastHidden}
            copiedAllHighlights={copiedAllHighlights}
            copyAllHighlightsFailed={copyAllHighlightsFailed}
            onUndoHide={handleUndoHide}
            onCopyAllHighlights={handleCopyAllHighlights}
            onImportPick={handleImportPick}
            onExport={onExport}
            onRefreshAll={onRefreshAll}
            onClearAllFavorites={onClearAllFavorites}
            onOpenHiddenModal={onOpenHiddenModal}
          />

          <DashboardHighlightsGrid
            highlightVideos={highlightVideos}
            refreshingIds={refreshingIds}
            onHide={handleHideHighlight}
            onJumpToSource={handleJumpToSource}
          />
        </section>
      )}

      {/* Sorting controls */}
      <DashboardSortingControls
        favorites={favorites}
        visibleFavorites={visibleFavorites}
        refreshingIds={refreshingIds}
        dashboardSortMode={dashboardSortMode}
        dashboardSortOrder={dashboardSortOrder}
        quickJumpRef={quickJumpRef}
        activeQuickJumpIndex={activeQuickJumpIndex}
        onSortClick={onSortClick}
        onQuickJumpKeyDown={handleQuickJumpKeyDown}
        onQuickJumpIndexChange={setQuickJumpIndex}
        onScrollToFavorite={scrollToFavorite}
        onImportPick={handleImportPick}
      />

      {/* Favorites list */}
      <DashboardFavoritesList
        favorites={favorites}
        sortedFavorites={sortedFavorites}
        visibleFavorites={visibleFavorites}
        matchingFavoriteIds={matchingFavoriteIds}
        favoriteFilter={favoriteFilter}
        showFavoriteFilter={showFavoriteFilter}
        refreshToken={refreshToken}
        onFavoriteFilterChange={setFavoriteFilter}
        onRemoveFavorite={onRemoveFavorite}
        onAnalyzeFavorite={onAnalyzeFavorite}
        onOpenAnalyser={onOpenAnalyser}
      />

      {/* Floating scroll button - subtle, appears based on scroll direction */}
      <FloatingScrollButton />
    </div>
  );
}
