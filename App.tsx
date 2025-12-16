import React, { useState, useMemo, useEffect } from 'react';
import { InputSection } from './components/InputSection';
import { VideoCard } from './components/VideoCard';
import { VideoListTable } from './components/VideoListTable';
import { EmptyState } from './components/EmptyState';
import { ApiKeyModal } from './components/ApiKeyModal';
import { FavoriteRow } from './components/FavoriteRow';
import { analyzeVideoStats } from './services/geminiService';
import { findChannelInfo, getVideosFromChannel, setYoutubeApiKey } from './services/youtubeService';
import { TimeFrame, SearchState, FavoriteConfig } from './types';
import { favoritesService } from './services/favoritesService';
import { BarChart3, AlertCircle, Activity, Settings, Trophy, List, Eye, LayoutDashboard, RefreshCw, Youtube } from 'lucide-react';
import { ThemeToggle } from './components/ThemeToggle';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

const App: React.FC = () => {
  const { t } = useTranslation();

  // Initialize state directly from storage to prevent modal flash
  const [apiKey, setApiKey] = useState<string | null>(() => {
    return localStorage.getItem('yt_api_key');
  });
  
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  const [searchState, setSearchState] = useState<SearchState>({
    isLoading: false,
    step: 'idle',
    error: null,
    data: null,
    channelName: ''
  });
  
  // Initial check: if no key in storage, open modal
  useEffect(() => {
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
    }
  }, [apiKey]);

  const handleSaveKey = (key: string) => {
    setYoutubeApiKey(key);
    setApiKey(key);
    setIsApiKeyModalOpen(false);
  };

  const handleResetKey = () => {
    if (window.confirm(t('confirm.deleteApiKey'))) {
      setYoutubeApiKey("");
      setApiKey(null);
      setIsApiKeyModalOpen(true);
    }
  };

  const handleSearch = async (channel: string, timeFrame: TimeFrame, maxResults: number) => {
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    setSearchState(prev => ({ 
      ...prev, 
      isLoading: true, 
      step: 'fetching_youtube',
      error: null, 
      channelName: channel,
      channelId: undefined,
      data: null
    }));
    
    try {
      // Step 1: Find Channel and Get Uploads Playlist
      const { id: channelId, name: officialName, uploadsPlaylistId } = await findChannelInfo(channel);
      
      // Step 2: Get Videos from Playlist & Stats (passing limit)
      const { videos: apiVideos } = await getVideosFromChannel(uploadsPlaylistId, timeFrame, maxResults);

      if (apiVideos.length === 0) {
        throw new Error(`Keine Videos im Zeitraum "${timeFrame}" gefunden.`);
      }

      // Step 3: Calculate Stats (Pure Math, no AI API)
      setSearchState(prev => ({ ...prev, step: 'analyzing_ai' }));
      const analyzedVideos = await analyzeVideoStats(apiVideos, officialName, timeFrame);

      setSearchState(prev => ({ 
        ...prev, 
        isLoading: false, 
        step: 'complete',
        data: analyzedVideos,
        channelName: officialName,
        channelId
      }));

    } catch (err: any) {
      console.error(err);
      let errorMessage = err.message || "Fehler bei der Analyse.";
      
      if (errorMessage.includes("API key not valid") || errorMessage.includes("403")) {
        setSearchState(prev => ({ ...prev, error: "Der API Key scheint ungültig zu sein. Bitte überprüfe ihn." }));
        setYoutubeApiKey("");
        setApiKey(null);
        setIsApiKeyModalOpen(true);
      } else {
        setSearchState(prev => ({ 
          ...prev, 
          isLoading: false, 
          step: 'idle',
          error: errorMessage
        }));
      }
    }
  };

  // Sorting / Filter state
  const [sortMode, setSortMode] = useState<'trend' | 'views'>('trend');
  // Anzahl hervorgehobener Karten (Top N)
  const [topN, setTopN] = useState<3 | 6>(3);

  // Simple Navigation (ohne Router): Dashboard | Analyser
  // Standardmäßig soll beim Betreten der Seite das Dashboard aktiv sein
  const [activePage, setActivePage] = useState<'dashboard' | 'analyser'>('dashboard');
  const [favorites, setFavorites] = useState<FavoriteConfig[]>([]);
  const [dashRefreshToken, setDashRefreshToken] = useState<number>(0);

  // Dashboard: Sortiermodus (persistiert im Browser)
  type DashboardSortMode = 'alpha' | 'velocity';
  const DASHBOARD_SORT_KEY = 'tt.dashboard.sort.v1';
  type SortOrder = 'asc' | 'desc';
  const DASHBOARD_ORDER_KEY = 'tt.dashboard.sortOrder.v1';
  const [dashboardSortMode, setDashboardSortMode] = useState<DashboardSortMode>(() => {
    if (typeof window === 'undefined') return 'alpha';
    const v = localStorage.getItem(DASHBOARD_SORT_KEY);
    return v === 'velocity' ? 'velocity' : 'alpha';
  });
  const [dashboardSortOrder, setDashboardSortOrder] = useState<SortOrder>(() => {
    if (typeof window === 'undefined') return 'asc';
    // Wenn bereits gespeichert, diesen Wert verwenden
    const saved = localStorage.getItem(DASHBOARD_ORDER_KEY);
    if (saved === 'asc' || saved === 'desc') return saved;
    // Sonst standardgemäß je Modus: Alpha → asc, Velocity → desc
    const mode = localStorage.getItem(DASHBOARD_SORT_KEY) === 'velocity' ? 'velocity' : 'alpha';
    return mode === 'velocity' ? 'desc' : 'asc';
  });
  // Tick, um Re-Rendering zu erzwingen, wenn Cache aktualisiert wird (für Velocity-Sortierung)
  const [cacheTick, setCacheTick] = useState<number>(0);

  useEffect(() => {
    if (activePage === 'dashboard') {
      try {
        setFavorites(favoritesService.list());
      } catch (e) {
        // ignore storage errors
      }
    }
  }, [activePage]);

  // Persistiere Dashboard-Sortiermodus
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(DASHBOARD_SORT_KEY, dashboardSortMode);
      }
    } catch {
      // ignore storage errors
    }
  }, [dashboardSortMode]);

  // Persistiere Dashboard-Sortierreihenfolge (ASC/DESC)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(DASHBOARD_ORDER_KEY, dashboardSortOrder);
      }
    } catch {
      // ignore storage errors
    }
  }, [dashboardSortOrder]);

  // Reagiere auf Cache-Updates aus FavoriteRow -> löst Neu-Sortierung bei Velocity aus
  useEffect(() => {
    const handler = () => setCacheTick(t => t + 1);
    if (typeof window !== 'undefined') {
      window.addEventListener('favorites-cache-updated', handler as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('favorites-cache-updated', handler as EventListener);
      }
    };
  }, []);

  const handleRemoveFavorite = (id: string) => {
    favoritesService.remove(id);
    setFavorites(favoritesService.list());
  };

  // Klick auf Sortier-Buttons: gleiches erneut → Reihenfolge umkehren, anderer Modus → Modus wechseln + Default-Reihenfolge setzen
  const handleDashboardSortClick = (mode: DashboardSortMode) => {
    if (mode === dashboardSortMode) {
      setDashboardSortOrder(o => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setDashboardSortMode(mode);
      setDashboardSortOrder(mode === 'velocity' ? 'desc' : 'asc');
    }
  };

  // Sortierte Favoriten für Dashboard
  const sortedFavorites = useMemo(() => {
    const arr = [...favorites];
    if (dashboardSortMode === 'alpha') {
      return arr.sort((a, b) => {
        const an = (a.label || a.query || '').toString();
        const bn = (b.label || b.query || '').toString();
        const cmp = an.localeCompare(bn, 'de', { sensitivity: 'base' });
        return dashboardSortOrder === 'asc' ? cmp : -cmp;
      });
    }
    // Velocity: Desc nach Aufrufen pro Stunde (Views/Hour) des besten Videos im Zeitraum (höchster zuerst), Tiebreaker Alphabet
    return arr.sort((a, b) => {
      const ac = favoritesService.getCache(a.id);
      const bc = favoritesService.getCache(b.id);
      // Primär versuchen wir, den vorab gespeicherten Top‑Velocity‑Wert zu nutzen
      const avMeta = Number(ac?.meta?.topVelocityVph);
      const bvMeta = Number(bc?.meta?.topVelocityVph);
      // Fallback: maximalen viewsPerHour aus den (gecachten) Videos berechnen
      const avCandidates = (ac?.videos ?? []).map(v => {
        const n = Number(v.viewsPerHour);
        return Number.isFinite(n) ? n : -1;
      });
      const bvCandidates = (bc?.videos ?? []).map(v => {
        const n = Number(v.viewsPerHour);
        return Number.isFinite(n) ? n : -1;
      });
      const avFallback = avCandidates.length ? Math.max(...avCandidates) : -1;
      const bvFallback = bvCandidates.length ? Math.max(...bvCandidates) : -1;
      const av = Number.isFinite(avMeta) ? avMeta : avFallback;
      const bv = Number.isFinite(bvMeta) ? bvMeta : bvFallback;
      // Reihenfolge: desc → höherer Wert nach oben, asc → niedrigerer nach oben
      if (av !== bv) {
        return dashboardSortOrder === 'desc' ? (bv - av) : (av - bv);
      }
      const an = (a.label || a.query || '').toString();
      const bn = (b.label || b.query || '').toString();
      return an.localeCompare(bn, 'de', { sensitivity: 'base' });
    });
  }, [favorites, dashboardSortMode, dashboardSortOrder, cacheTick]);

  const sortedVideos = useMemo(() => {
    if (!searchState.data) return [];

    const arr = [...searchState.data];
    if (sortMode === 'views') {
      // Sort by total views desc, tiebreaker trend score
      return arr.sort((a, b) => {
        if (b.views !== a.views) return b.views - a.views;
        return b.trendingScore - a.trendingScore;
      });
    }
    // Default: sort by Trending Score descending
    return arr.sort((a, b) => b.trendingScore - a.trendingScore);
  }, [searchState.data, sortMode]);

  // Split into Top N and Rest
  const topVideos = sortedVideos.slice(0, topN);
  const otherVideos = sortedVideos.slice(topN);

  // URL zum YouTube‑Kanal für Breadcrumb/Heading (bevorzugt über Channel-ID)
  const channelUrl = useMemo(() => {
    if (searchState.channelId) return `https://www.youtube.com/channel/${searchState.channelId}`;
    const q = (searchState.channelName || '').trim();
    if (q.startsWith('@')) return `https://www.youtube.com/${q}`;
    return null;
  }, [searchState.channelId, searchState.channelName]);

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 pb-20 font-sans selection:bg-indigo-500/30">
      
      {isApiKeyModalOpen && <ApiKeyModal onSave={handleSaveKey} />}

      {/* Header */}
      <header className="bg-white/80 border-b border-slate-200 dark:bg-slate-900/80 dark:border-slate-800 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[101.2rem] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-red-600 to-red-700 p-2 rounded-lg shadow-lg shadow-red-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400 hidden sm:block">
              {t('appTitle')}
            </h1>
            {/* Simple Menü links: Dashboard | Analyser */}
            <nav className="ml-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActivePage('dashboard')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors 
                  ${activePage === 'dashboard' 
                    ? 'bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700' 
                    : 'text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white'}
                `}
                title="Dashboard"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePage('analyser')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors 
                  ${activePage === 'analyser' 
                    ? 'bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-800 dark:text-white dark:border-slate-700' 
                    : 'text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white'}
                `}
                title="Analyser"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analyser</span>
              </button>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Status Indicator */}
             {searchState.isLoading ? (
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-indigo-500/10 border-indigo-500/20 text-indigo-400 animate-pulse">
                 <Activity className="w-3 h-3 animate-spin" />
                 <span>{searchState.step === 'fetching_youtube' ? 'Lade offizielle Daten...' : 'Berechne Statistiken...'}</span>
               </div>
             ) : (
               <>
                 {/* Theme Toggle */}
                 {apiKey && (
                   <button 
                     onClick={handleResetKey}
                     className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors 
                                border-slate-300 text-slate-700 hover:bg-slate-100 
                                dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                     title={t('actions.resetApiKey')}
                   >
                       <Settings className="w-3 h-3" />
                       <span>{t('actions.resetApiKey')}</span>
                   </button>
                 )}
               </>
             )}
             {/* Always show toggle at the far right */}
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
         </div>
       </div>
     </header>

      <main className="max-w-[101.2rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activePage === 'dashboard' ? (
          <div className="animate-fade-in">

            {favorites.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 text-slate-600 dark:bg-slate-900/50 dark:border-slate-800 rounded-xl p-6 text-center dark:text-slate-400">
                {t('dashboard.noFavorites')}
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
                  {/* Sortier-Umschalter */}
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="text-slate-600 dark:text-slate-400">{t('dashboard.sorting.label')}</span>
                    <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900/60">
                      <button
                        type="button"
                        onClick={() => handleDashboardSortClick('alpha')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                          dashboardSortMode === 'alpha' 
                            ? 'bg-indigo-600 text-white' 
                            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
                        }`}
                        title={t('dashboard.sorting.alphaTitle')}
                      >
                        <span>{dashboardSortMode === 'alpha' ? (dashboardSortOrder === 'asc' ? 'A–Z' : 'Z–A') : 'A–Z'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDashboardSortClick('velocity')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                          dashboardSortMode === 'velocity' 
                            ? 'bg-indigo-600 text-white' 
                            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
                        }`}
                        title={t('dashboard.sorting.velocityTitle')}
                      >
                        <Activity className="w-3 h-3" />
                        <span>{t('dashboard.sorting.activity')}{dashboardSortMode === 'velocity' ? (dashboardSortOrder === 'desc' ? ' ↓' : ' ↑') : ''}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setDashRefreshToken(v => v + 1)}
                      className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors 
                                 border-slate-300 text-slate-700 hover:bg-slate-100 
                                 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      title={t('actions.refreshAll')}
                    >
                      <RefreshCw className="w-3 h-3" /> {t('actions.refreshAll')}
                    </button>
                  </div>
                </div>

                <div className="space-y-10">
                  {sortedFavorites.map(fav => (
                    <FavoriteRow key={fav.id} favorite={fav} onRemove={handleRemoveFavorite} globalRefreshToken={dashRefreshToken} />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <InputSection 
              onSearch={handleSearch} 
              isLoading={searchState.isLoading} 
            />

            {/* Error Message */}
            {searchState.error && (
              <div className="mb-8 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-500 dark:text-red-200 animate-fade-in shadow-lg shadow-red-900/10">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{searchState.error}</p>
              </div>
            )}

            {/* Results */}
            {sortedVideos.length > 0 && (
              <div className="space-y-12 animate-fade-in">
                {/* Control Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-100/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 gap-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                      {t('results.resultsFor')} {channelUrl ? (
                        <a
                          href={channelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-red-500 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300 hover:underline underline-offset-2"
                          title={t('results.openChannelTitle', { channel: searchState.channelName })}
                        >
                          <Youtube className="w-4 h-4" aria-hidden="true" />
                          @{searchState.channelName}
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-red-500 dark:text-red-400">
                          <Youtube className="w-4 h-4" aria-hidden="true" />
                          @{searchState.channelName}
                        </span>
                      )}
                    </h3>
                    <span className="bg-slate-200 dark:bg-slate-700 text-xs px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
                      {t('results.videosCount', { count: sortedVideos.length })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm font-medium">
                    <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {t('results.sortedBy')} {sortMode === 'trend' ? t('results.sortModes.trend') : t('results.sortModes.views')}
                    </span>
                    {/* Sort Toggle */}
                    <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 p-0.5">
                      <button
                        type="button"
                        onClick={() => setSortMode('trend')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                          sortMode === 'trend'
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                        title={t('results.sortTitles.trend')}
                      >
                        <Trophy className="w-4 h-4" />
                        <span>{t('results.sortButtons.trendScore')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortMode('views')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                          sortMode === 'views'
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                        title={t('results.sortTitles.views')}
                      >
                        <Eye className="w-4 h-4" />
                        <span>{t('results.sortButtons.views')}</span>
                      </button>
                    </div>
                    {/* Top N Toggle */}
                    <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 p-0.5">
                      <button
                        type="button"
                        onClick={() => setTopN(3)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                          topN === 3
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                        title={t('results.highlightTopN', { n: 3 })}
                      >
                        <span>Top 3</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTopN(6)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                          topN === 6
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                        title={t('results.highlightTopN', { n: 6 })}
                      >
                        <span>Top 6</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* SECTION 1: Top N Cards */}
                <div>
                  <div className="flex items-center gap-2 mb-4 px-1">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                      {t('results.topPerformance', { n: topN })}
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                    {topVideos.map((video, index) => (
                      <VideoCard key={video.id} video={video} rank={index + 1} />
                    ))}
                  </div>
                </div>

                {/* SECTION 2: List Table (Rank 4+) */}
                {otherVideos.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4 px-1 mt-8">
                      <List className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                      <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                        {t('results.moreVideos')}
                      </h3>
                    </div>
                    <VideoListTable videos={otherVideos} startIndex={topN + 1} />
                  </div>
                )}
              </div>
            )}

            {/* Empty State / Initial Load */}
            {!searchState.data && !searchState.isLoading && <EmptyState />}
          </>
        )}
      </main>
    </div>
  );
};

export default App;