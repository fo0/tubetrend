import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ApiKeyModal} from '@/src/shared/components/ui/ApiKeyModal';
import {HiddenHighlightsModal} from '@/src/shared/components/ui/HiddenHighlightsModal';
import {Header, Footer, type PageType} from '@/src/shared/components/layout';
import {DashboardPage} from './routes/DashboardPage';
import {AnalyserPage} from './routes/AnalyserPage';
import {useTranslation} from 'react-i18next';
import {setApiKey as setYoutubeApiKey} from '@/src/features/youtube';
import {dashboardBackupService} from '@/src/features/dashboard';
import {
  useDashboardSort,
  useFavorites,
  useHighlights
} from '@/src/features/dashboard/hooks/useDashboard';
import {useSearch} from '@/src/features/search/hooks/useSearch';
import type {FavoriteConfig} from '@/src/features/favorites/types';
import type {VideoData} from '@/src/features/videos/types';
import type {SearchType, TimeFrame} from '@/src/shared/types';
import {STORAGE_KEYS} from '@/src/shared/constants';

const App: React.FC = () => {
  const { t } = useTranslation();

  // API Key state
  const [apiKey, setApiKey] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.API_KEY);
  });
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isHiddenHighlightsModalOpen, setIsHiddenHighlightsModalOpen] = useState(false);

  // Navigation state
  const [activePage, setActivePage] = useState<PageType>('dashboard');

  // External input values for analyzer
  const [externalInputValues, setExternalInputValues] = useState<{
    query?: string;
    timeFrame?: TimeFrame;
    maxResults?: number;
    searchType?: SearchType;
    syncToken?: number;
  }>({});

  // Hooks
  const { favorites, refreshToken, refreshingIds, removeFavorite, refreshAll, loadFavorites } = useFavorites();
  const { sortMode, sortOrder, cacheTick, handleSortClick, sortFavorites } = useDashboardSort();
  const { hiddenTick } = useHighlights(favorites);

  const { searchState, handleSearch, setSearchResult } = useSearch(apiKey, {
    onApiKeyInvalid: () => {
      setYoutubeApiKey('');
      setApiKey(null);
      setIsApiKeyModalOpen(true);
    },
  });

  // Sorted favorites
  const sortedFavorites = useMemo(() => sortFavorites(favorites), [favorites, sortFavorites]);

  // Initial API key check
  useEffect(() => {
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
    }
  }, [apiKey]);

  // Load favorites when switching to dashboard
  useEffect(() => {
    if (activePage === 'dashboard') {
      loadFavorites();
    }
  }, [activePage, loadFavorites]);

  // Handlers
  const handleSaveKey = useCallback((key: string) => {
    setYoutubeApiKey(key);
    setApiKey(key);
    setIsApiKeyModalOpen(false);
  }, []);

  const handleResetKey = useCallback(() => {
    if (window.confirm(t('confirm.deleteApiKey'))) {
      setYoutubeApiKey('');
      setApiKey(null);
      setIsApiKeyModalOpen(true);
    }
  }, [t]);

  const downloadTextFile = useCallback((filename: string, text: string) => {
    try {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      // ignore
    }
  }, []);

  const handleDashboardExport = useCallback(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
    const filename = `tubetrend-dashboard-backup_${stamp}.json`;

    const payload = dashboardBackupService.createBackup({
      dashboardSortMode: sortMode,
      dashboardSortOrder: sortOrder,
    });
    const json = dashboardBackupService.stringify(payload);
    downloadTextFile(filename, json);
    window.alert(t('backup.exportSuccess'));
  }, [sortMode, sortOrder, downloadTextFile, t]);

  const handleDashboardImportFile = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = dashboardBackupService.parse(text);

    if (!parsed.ok) {
      window.alert(t('backup.importInvalid'));
      return;
    }

    const count = parsed.payload.data.favorites.length;
    const ok = window.confirm(t('confirm.importDashboardReplace', { count }));
    if (!ok) return;

    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(parsed.payload.data.favorites));
      localStorage.setItem(STORAGE_KEYS.FAVORITES_CACHE, JSON.stringify(parsed.payload.data.favoritesCache));
    } catch {
      window.alert(t('backup.importFailedStorage'));
      return;
    }

    loadFavorites();

    try {
      window.dispatchEvent(new CustomEvent('favorites-cache-updated', { detail: { id: '*' } }));
    } catch {
      // ignore
    }

    window.alert(t('backup.importSuccess', { count }));
  }, [loadFavorites, t]);

  const handleAnalyzeFavorite = useCallback(
    (
      favorite: FavoriteConfig,
      cachedVideos: VideoData[] | null,
      channelTitle: string,
      channelId: string | null
    ) => {
      setActivePage('analyser');

      setExternalInputValues({
        query: favorite.query,
        timeFrame: favorite.timeFrame,
        maxResults: favorite.maxResults,
        searchType: favorite.searchType,
        syncToken: Date.now(),
      });

      if (cachedVideos && cachedVideos.length > 0) {
        setSearchResult(cachedVideos, channelTitle || favorite.query, channelId || undefined);
      } else {
        handleSearch(favorite.query, favorite.timeFrame, favorite.maxResults, favorite.searchType);
      }
    },
    [handleSearch, setSearchResult]
  );

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans selection:bg-indigo-500/30">
      {isApiKeyModalOpen && <ApiKeyModal onSave={handleSaveKey} />}
      <HiddenHighlightsModal
        isOpen={isHiddenHighlightsModalOpen}
        onClose={() => setIsHiddenHighlightsModalOpen(false)}
      />

      <Header
        activePage={activePage}
        onPageChange={setActivePage}
        apiKey={apiKey}
        isLoading={searchState.isLoading}
        loadingStep={searchState.step === 'fetching_youtube' ? 'fetching_youtube' : 'analyzing_ai'}
        onResetApiKey={handleResetKey}
      />

      <main className="flex-1 max-w-[101.2rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {activePage === 'dashboard' ? (
          <DashboardPage
            favorites={favorites}
            sortedFavorites={sortedFavorites}
            refreshToken={refreshToken}
            refreshingIds={refreshingIds}
            dashboardSortMode={sortMode}
            dashboardSortOrder={sortOrder}
            cacheTick={cacheTick}
            hiddenTick={hiddenTick}
            onRemoveFavorite={removeFavorite}
            onAnalyzeFavorite={handleAnalyzeFavorite}
            onRefreshAll={refreshAll}
            onSortClick={handleSortClick}
            onExport={handleDashboardExport}
            onImportFile={handleDashboardImportFile}
            onOpenHiddenModal={() => setIsHiddenHighlightsModalOpen(true)}
          />
        ) : (
          <AnalyserPage
            searchState={searchState}
            externalInputValues={externalInputValues}
            onSearch={handleSearch}
          />
        )}
      </main>

      <Footer />
    </div>
  );
};

export default App;
