import {useMemo, useRef} from 'react';
import {Activity, Download, EyeOff, RefreshCw, Upload} from 'lucide-react';
import {FavoriteRow} from '@/src/shared/components/ui/FavoriteRow';
import {FavoriteAvatar} from '@/src/shared/components/ui/FavoriteAvatar';
import {HighlightVideoCard} from '@/src/shared/components/ui/HighlightVideoCard';
import {FloatingScrollButton} from '@/src/shared/components/ui/FloatingScrollButton';
import {useTranslation} from 'react-i18next';
import type {FavoriteConfig} from '@/src/features/favorites/types';
import type {VideoData} from '@/src/features/videos/types';
import {favoritesService} from '@/src/features/favorites';
import {
  hiddenHighlightsService,
  selectHighlightVideosFromFavorites
} from '@/src/features/dashboard';
import type {DashboardSortMode} from '@/src/shared/types';

interface DashboardPageProps {
  favorites: FavoriteConfig[];
  sortedFavorites: FavoriteConfig[];
  refreshToken: number;
  refreshingIds: Set<string>;
  dashboardSortMode: DashboardSortMode;
  dashboardSortOrder: 'asc' | 'desc';
  cacheTick: number;
  hiddenTick: number;
  onRemoveFavorite: (id: string) => void;
  onAnalyzeFavorite: (
    favorite: FavoriteConfig,
    cachedVideos: VideoData[] | null,
    channelTitle: string,
    channelId: string | null
  ) => void;
  onRefreshAll: () => void;
  onSortClick: (mode: DashboardSortMode) => void;
  onExport: () => void;
  onImportFile: (file: File) => Promise<void>;
  onOpenHiddenModal: () => void;
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
}: DashboardPageProps) {
  const { t } = useTranslation();
  const importRef = useRef<HTMLInputElement | null>(null);

  const handleImportPick = () => {
    importRef.current?.click();
  };

  const highlightVideosData = useMemo(() => {
    const raw = selectHighlightVideosFromFavorites(
      sortedFavorites,
      (id) => favoritesService.getCache(id),
      { perFavorite: 1, maxTotal: sortedFavorites.length }
    );

    // Sort by velocity
    const sorted = [...raw].sort((a, b) => {
      const av = Number(a.video?.viewsPerHour);
      const bv = Number(b.video?.viewsPerHour);
      const aVph = Number.isFinite(av) ? av : -1;
      const bVph = Number.isFinite(bv) ? bv : -1;
      if (aVph !== bVph) return bVph - aVph;
      const aTs = typeof a.video?.trendingScore === 'number' ? a.video.trendingScore : -1;
      const bTs = typeof b.video?.trendingScore === 'number' ? b.video.trendingScore : -1;
      if (aTs !== bTs) return bTs - aTs;
      return a.sourceLabel.localeCompare(b.sourceLabel, 'de', { sensitivity: 'base' });
    });

    const visible = sorted.filter(
      (item) => !hiddenHighlightsService.isHidden(item.video.id)
    );
    const hiddenCount = sorted.length - visible.length;

    return { visible, hiddenCount };
  }, [sortedFavorites, cacheTick, hiddenTick]);

  const highlightVideos = highlightVideosData.visible;
  const hiddenHighlightsCount = highlightVideosData.hiddenCount;

  return (
    <div className="animate-fade-in">
      {/* Hidden file input for dashboard import */}
      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          onImportFile(f).catch(() => {
            try {
              window.alert(t('backup.importInvalid'));
            } catch {
              // ignore
            }
          });
        }}
      />

      {favorites.length > 0 && (
        <section className={`mb-6 rounded-2xl border border-indigo-200/70 bg-indigo-50/40 p-4 shadow-sm dark:border-indigo-500/20 dark:bg-indigo-500/10 ${refreshingIds.size > 0 ? 'highlights-loading-border' : ''}`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                {t('dashboard.highlights.title')}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {t('dashboard.highlights.subtitle')}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              {highlightVideos.length > 0 && (
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
                  {t('dashboard.highlights.count', { count: highlightVideos.length })}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleImportPick}
                  className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors
                           border-slate-300 text-slate-700 hover:bg-slate-100
                           dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  title={t('actions.importDashboard')}
                >
                  <Upload className="w-3 h-3" /> {t('actions.importDashboard')}
                </button>
                <button
                  type="button"
                  onClick={onExport}
                  disabled={favorites.length === 0}
                  className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors
                           border-slate-300 text-slate-700 hover:bg-slate-100
                           disabled:opacity-50 disabled:cursor-not-allowed
                           dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  title={t('actions.exportDashboard')}
                >
                  <Download className="w-3 h-3" /> {t('actions.exportDashboard')}
                </button>
                <button
                  type="button"
                  onClick={onRefreshAll}
                  disabled={favorites.length === 0}
                  className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors
                           border-slate-300 text-slate-700 hover:bg-slate-100
                           disabled:opacity-50 disabled:cursor-not-allowed
                           dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  title={t('actions.refreshAll')}
                >
                  <RefreshCw className="w-3 h-3" /> {t('actions.refreshAll')}
                </button>
                {hiddenHighlightsCount > 0 && (
                  <button
                    type="button"
                    onClick={onOpenHiddenModal}
                    className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors
                             border-amber-300 text-amber-700 hover:bg-amber-50
                             dark:border-amber-600/50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                    title={t('dashboard.highlights.showHiddenList')}
                  >
                    <EyeOff className="w-3 h-3" /> {t('dashboard.highlights.hiddenButton')}
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
                  <div className="p-4 flex flex-col flex-grow">
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
                  {t('dashboard.highlights.empty')}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Sorting controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        {favorites.length > 0 ? (
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="text-slate-600 dark:text-slate-400">
              {t('dashboard.sorting.label')}
            </span>
            <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900/60">
              <button
                type="button"
                onClick={() => onSortClick('alpha')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  dashboardSortMode === 'alpha'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
                }`}
                title={t('dashboard.sorting.alphaTitle')}
              >
                <span>
                  {dashboardSortMode === 'alpha'
                    ? dashboardSortOrder === 'asc'
                      ? 'A–Z'
                      : 'Z–A'
                    : 'A–Z'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onSortClick('velocity')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  dashboardSortMode === 'velocity'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
                }`}
                title={t('dashboard.sorting.velocityTitle')}
              >
                <Activity className="w-3 h-3" />
                <span>
                  {t('dashboard.sorting.activity')}
                  {dashboardSortMode === 'velocity'
                    ? dashboardSortOrder === 'desc'
                      ? ' ↓'
                      : ' ↑'
                    : ''}
                </span>
              </button>
            </div>

            {/* Favorite Avatars */}
            {sortedFavorites.length > 0 && (
              <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-slate-300 dark:border-slate-700">
                {sortedFavorites.map((fav) => (
                  <FavoriteAvatar
                    key={fav.id}
                    favorite={fav}
                    isRefreshing={refreshingIds.has(fav.id)}
                    size="sm"
                    onClick={() => {
                      // Scroll to the favorite section
                      const element = document.getElementById(`favorite-${fav.id}`);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
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
                onClick={handleImportPick}
                className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors
                         border-slate-300 text-slate-700 hover:bg-slate-100
                         dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                title={t('actions.importDashboard')}
              >
                <Upload className="w-3 h-3" /> {t('actions.importDashboard')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Favorites list */}
      {favorites.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 text-slate-600 dark:bg-slate-900/50 dark:border-slate-800 rounded-xl p-6 text-center dark:text-slate-400">
          {t('dashboard.noFavorites')}
        </div>
      ) : (
        <div className="space-y-10">
          {sortedFavorites.map((fav, idx) => (
            <div key={fav.id} id={`favorite-${fav.id}`}>
              <FavoriteRow
                favorite={fav}
                onRemove={onRemoveFavorite}
                onAnalyze={onAnalyzeFavorite}
                globalRefreshToken={refreshToken}
                staggerIndex={idx}
              />
            </div>
          ))}
        </div>
      )}

      {/* Floating scroll button - subtle, appears based on scroll direction */}
      <FloatingScrollButton />
    </div>
  );
}
