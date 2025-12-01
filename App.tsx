import React, { useState, useMemo, useEffect } from 'react';
import { InputSection } from './components/InputSection';
import { VideoCard } from './components/VideoCard';
import { VideoListTable } from './components/VideoListTable';
import { EmptyState } from './components/EmptyState';
import { ApiKeyModal } from './components/ApiKeyModal';
import { analyzeVideoStats } from './services/geminiService';
import { findChannelInfo, getVideosFromChannel, setYoutubeApiKey } from './services/youtubeService';
import { TimeFrame, SearchState } from './types';
import { BarChart3, AlertCircle, Activity, Settings, Trophy, List, Eye } from 'lucide-react';

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
      data: null
    }));
    
    try {
      // Step 1: Find Channel and Get Uploads Playlist
      const { name: officialName, uploadsPlaylistId } = await findChannelInfo(channel);
      
      // Step 2: Get Videos from Playlist & Stats (passing limit)
      const apiVideos = await getVideosFromChannel(uploadsPlaylistId, timeFrame, maxResults);

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
        channelName: officialName 
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

  // Split into Top 3 and Rest
  const topVideos = sortedVideos.slice(0, 3);
  const otherVideos = sortedVideos.slice(3);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 font-sans selection:bg-indigo-500/30">
      
      {isApiKeyModalOpen && <ApiKeyModal onSave={handleSaveKey} />}

      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-red-600 to-red-700 p-2 rounded-lg shadow-lg shadow-red-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400 hidden sm:block">
              TubeTrend
            </h1>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="mb-10 text-center space-y-3">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            Offizielle API. <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Echte Trends.</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
            Direkte Verbindung zur YouTube Data API v3. Mathematische Analyse von Velocity und Wachstum.
          </p>
        </div>

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
                   Ergebnisse für <span className="text-red-400">@{searchState.channelName}</span>
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
               </div>
             </div>

            {/* SECTION 1: Top 3 Cards */}
            <div>
              <div className="flex items-center gap-2 mb-4 px-1">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-bold text-slate-200 uppercase tracking-wide">
                  Top 3 Performance
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
                <VideoListTable videos={otherVideos} startIndex={4} />
              </div>
            )}
            
          </div>
        )}

        {/* Empty State / Initial Load */}
        {!searchState.data && !searchState.isLoading && <EmptyState />}
        
      </main>
    </div>
  );
};

export default App;