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

const App: React.FC = () => {
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
    if (window.confirm("Möchtest du den API Key wirklich löschen?")) {
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

  useEffect(() => {
    if (activePage === 'dashboard') {
      try {
        setFavorites(favoritesService.list());
      } catch (e) {
        // ignore storage errors
      }
    }
  }, [activePage]);

  const handleRemoveFavorite = (id: string) => {
    favoritesService.remove(id);
    setFavorites(favoritesService.list());
  };

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
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 font-sans selection:bg-indigo-500/30">
      
      {isApiKeyModalOpen && <ApiKeyModal onSave={handleSaveKey} />}

      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-[101.2rem] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-red-600 to-red-700 p-2 rounded-lg shadow-lg shadow-red-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400 hidden sm:block">
              TubeTrend
            </h1>
            {/* Simple Menü links: Dashboard | Analyser */}
            <nav className="ml-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActivePage('dashboard')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors 
                  ${activePage === 'dashboard' 
                    ? 'bg-slate-800 text-white border-slate-700' 
                    : 'text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'}
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
                    ? 'bg-slate-800 text-white border-slate-700' 
                    : 'text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'}
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
                  {apiKey && (
                    <button 
                      onClick={handleResetKey}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-slate-700 hover:bg-slate-800 transition-colors text-slate-400"
                      title="API Key ändern"
                    >
                        <Settings className="w-3 h-3" />
                        <span>Configured</span>
                    </button>
                  )}
                </>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-[101.2rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activePage === 'dashboard' ? (
          <div className="animate-fade-in">

            {favorites.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center text-slate-400">
                Noch keine Favoriten. Lege im Analyser eine Suche als Favorit an.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-end mb-4">
                  <button
                    type="button"
                    onClick={() => setDashRefreshToken(t => t + 1)}
                    className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                    title="Alle Kanäle aktualisieren"
                  >
                    <RefreshCw className="w-3 h-3" /> Alle aktualisieren
                  </button>
                </div>

                <div className="space-y-10">
                  {favorites.map(fav => (
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
              <div className="mb-8 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-200 animate-fade-in shadow-lg shadow-red-900/10">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{searchState.error}</p>
              </div>
            )}

            {/* Results */}
            {sortedVideos.length > 0 && (
              <div className="space-y-12 animate-fade-in">
                {/* Control Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800 gap-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-200">
                      Ergebnisse für {channelUrl ? (
                        <a
                          href={channelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 hover:underline underline-offset-2"
                          title={`YouTube-Kanal öffnen: ${searchState.channelName}`}
                        >
                          <Youtube className="w-4 h-4" aria-hidden="true" />
                          @{searchState.channelName}
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-red-400">
                          <Youtube className="w-4 h-4" aria-hidden="true" />
                          @{searchState.channelName}
                        </span>
                      )}
                    </h3>
                    <span className="bg-slate-700 text-xs px-2 py-0.5 rounded-full text-slate-300 border border-slate-600">
                      {sortedVideos.length} Videos
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm font-medium">
                    <span className="text-slate-400 whitespace-nowrap">
                      Sortiert nach {sortMode === 'trend' ? 'Trend Score (Velocity)' : 'Views'}
                    </span>
                    {/* Sort Toggle */}
                    <div className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-900/60 p-0.5">
                      <button
                        type="button"
                        onClick={() => setSortMode('trend')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                          sortMode === 'trend'
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Nach Trend Score sortieren"
                      >
                        <Trophy className="w-4 h-4" />
                        <span>Trend Score</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortMode('views')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                          sortMode === 'views'
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Nach Views sortieren"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Views</span>
                      </button>
                    </div>
                    {/* Top N Toggle */}
                    <div className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-900/60 p-0.5">
                      <button
                        type="button"
                        onClick={() => setTopN(3)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                          topN === 3
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Top 3 hervorheben"
                      >
                        <span>Top 3</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTopN(6)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                          topN === 6
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                        title="Top 6 hervorheben"
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
                    <h3 className="text-lg font-bold text-slate-200 uppercase tracking-wide">
                      Top {topN} Performance
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {topVideos.map((video, index) => (
                      <VideoCard key={video.id} video={video} rank={index + 1} />
                    ))}
                  </div>
                </div>

                {/* SECTION 2: List Table (Rank 4+) */}
                {otherVideos.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4 px-1 mt-8">
                      <List className="w-5 h-5 text-slate-400" />
                      <h3 className="text-lg font-bold text-slate-200 uppercase tracking-wide">
                        Weitere Videos
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