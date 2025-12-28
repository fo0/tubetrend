import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FavoriteConfig, TimeFrame, VideoData, SearchType } from '../types';
import { favoritesService } from '../services/favoritesService';
import { analyzeVideoStats } from '../services/trendAnalysisService';
import { findChannelInfo, getVideosFromChannel, searchVideosByKeyword } from '../services/youtubeService';
import { VideoCard } from './VideoCard';
import { AlertCircle, AlertTriangle, ChevronRight, Loader2, Trash2, RefreshCw, Youtube, Hash } from 'lucide-react';
import { MAX_RESULTS_OPTIONS, TIME_FRAMES } from '../constants';
import { useTranslation } from 'react-i18next';

interface FavoriteRowProps {
  favorite: FavoriteConfig;
  onRemove?: (id: string) => void;
  // Wird vom Dashboard erhöht, um alle Reihen neu zu laden
  globalRefreshToken?: number;
  // Optimierung: Index für gestaffelten Refresh (verhindert gleichzeitige API-Calls)
  staggerIndex?: number;
}

// Optimierung: Gestaffelter Refresh - Delay zwischen den Favorites (in ms)
const STAGGER_DELAY_MS = 300;

export const FavoriteRow: React.FC<FavoriteRowProps> = ({ favorite, onRemove, globalRefreshToken = 0, staggerIndex = 0 }) => {
  const { t } = useTranslation();
  const [videos, setVideos] = useState<VideoData[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [channelTitle, setChannelTitle] = useState<string>(favorite.query);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [totalInTimeFrame, setTotalInTimeFrame] = useState<number | null>(null);
  // Lokaler Refresh-Zähler für diese Reihe
  const [localRefreshToken, setLocalRefreshToken] = useState<number>(0);

  // Lokale (änderbare) Konfiguration des Favoriten
  const [currentTimeFrame, setCurrentTimeFrame] = useState<TimeFrame>(favorite.timeFrame);
  const [currentMax, setCurrentMax] = useState<number>(favorite.maxResults);
  const [currentFavId, setCurrentFavId] = useState<string>(favorite.id);

  // Popover-UI State
  const [showTfMenu, setShowTfMenu] = useState<boolean>(false);
  const [showMaxMenu, setShowMaxMenu] = useState<boolean>(false);
  const tfButtonRef = useRef<HTMLButtonElement | null>(null);
  const maxButtonRef = useRef<HTMLButtonElement | null>(null);
  // Menü-Container Refs (für korrekte Outside-Click-Erkennung)
  const tfMenuRef = useRef<HTMLDivElement | null>(null);
  const maxMenuRef = useRef<HTMLDivElement | null>(null);

  // Sync bei Prop-Wechsel (z.B. nach Seiten-Neuladen)
  useEffect(() => {
    setCurrentTimeFrame(favorite.timeFrame);
    setCurrentMax(favorite.maxResults);
    setCurrentFavId(favorite.id);
  }, [favorite.id]);

  // Vorherige Token, um zu erkennen, ob ein erzwungener Refresh nötig ist
  const prevGlobalTokenRef = useRef<number>(globalRefreshToken);
  const prevLocalTokenRef = useRef<number>(localRefreshToken);

  const displayMax = useMemo(() => (currentMax === 0 ? t('maxResults.all') : t('maxResults.topN', { n: currentMax })), [currentMax, t]);

  const timeFrameLabel = (tf: TimeFrame): string => {
    const opt = TIME_FRAMES.find(o => o.value === tf);
    return opt ? t(opt.labelKey) : String(tf);
  };

  // Letztes Cache-Datum ermitteln (für Anzeige "wie alt")
  const lastFetchedAt = useMemo(() => {
    const entry = favoritesService.getCache(currentFavId);
    return entry?.fetchedAt ?? null;
  }, [currentFavId, videos, loading, globalRefreshToken, localRefreshToken]);

  // Zeige Warnung, wenn ausgewählte Top-X kleiner als Gesamtmenge im Zeitraum ist
  const showOverflowWarning = useMemo(() => {
    if (!totalInTimeFrame) return false;
    if (currentMax === 0) return false; // "Alle"
    return totalInTimeFrame > currentMax;
  }, [totalInTimeFrame, currentMax]);

  const formatTimeAgo = (ts: number): string => {
    const diffMs = Date.now() - ts;
    if (diffMs < 0) return t('timeAgo.justNow');
    const sec = Math.floor(diffMs / 1000);
    if (sec < 10) return t('timeAgo.justNow');
    if (sec < 60) return t('timeAgo.seconds', { count: sec });
    const min = Math.floor(sec / 60);
    if (min < 60) return t('timeAgo.minutes', { count: min });
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return t('timeAgo.hours', { count: hrs });
    const days = Math.floor(hrs / 24);
    if (days < 7) return t('timeAgo.days', { count: days });
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return t('timeAgo.weeks', { count: weeks });
    const months = Math.floor(days / 30);
    if (months < 12) return t('timeAgo.months', { count: months });
    const years = Math.floor(days / 365);
    return t('timeAgo.years', { count: years });
  };

  useEffect(() => {
    let cancelled = false;
    let staggerTimeout: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      setError(null);
      // Entscheiden, ob wir Cache ignorieren sollen (erzwungener Refresh)
      const isGlobalRefresh = prevGlobalTokenRef.current !== globalRefreshToken;
      const isLocalRefresh = prevLocalTokenRef.current !== localRefreshToken;
      const forced = isGlobalRefresh || isLocalRefresh;

      // Optimierung: Bei globalem Refresh gestaffelten Delay verwenden
      // um nicht alle API-Calls gleichzeitig zu starten
      if (isGlobalRefresh && staggerIndex > 0) {
        await new Promise<void>(resolve => {
          staggerTimeout = setTimeout(resolve, staggerIndex * STAGGER_DELAY_MS);
        });
        if (cancelled) return;
      }
      // Cache verwenden, wenn frisch und kein erzwungener Refresh
      if (!forced) {
        const cachedOk = favoritesService.isCacheValid(currentFavId);
        const cached = favoritesService.getCache(currentFavId);
        if (cachedOk && cached) {
          if (!cancelled) setVideos(cached.videos);
          if (!cancelled) setTotalInTimeFrame(cached.meta?.totalInTimeFrame ?? null);
          // Optimierung: channelId und channelTitle aus Cache wiederherstellen
          // Verhindert redundanten findChannelInfo() Call (spart 101 API Units)
          if (!cancelled && cached.meta?.channelId) setChannelId(cached.meta.channelId);
          if (!cancelled && cached.meta?.channelTitle) setChannelTitle(cached.meta.channelTitle);
          return;
        }
      }

      setLoading(true);
      // Globales Event: Start des Refresh für diesen Favoriten
      let dispatchedStart = false;
      try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('favorite-refresh-start', { detail: { id: currentFavId } }));
          dispatchedStart = true;
        }
      } catch {
        // ignore
      }
      try {
        let apiVideos: any[];
        let displayName: string;
        let fetchedChannelId: string | undefined;
        let totalInTimeFrame: number;

        const searchType = favorite.searchType ?? SearchType.CHANNEL;

        if (searchType === SearchType.KEYWORD) {
          // Keyword-Suche: Videos direkt nach Schlagwort suchen
          const result = await searchVideosByKeyword(favorite.query, currentTimeFrame as TimeFrame, currentMax);
          apiVideos = result.videos;
          totalInTimeFrame = result.totalInTimeFrame;
          displayName = favorite.query; // Bei Keyword-Suche zeigen wir das Keyword als "Name"
          fetchedChannelId = undefined;
        } else {
          // Kanal-Suche: Erst Kanal finden, dann Videos aus Uploads-Playlist
          const { id, name, uploadsPlaylistId } = await findChannelInfo(favorite.query);
          const result = await getVideosFromChannel(uploadsPlaylistId, currentTimeFrame as TimeFrame, currentMax);
          apiVideos = result.videos;
          totalInTimeFrame = result.totalInTimeFrame;
          displayName = name;
          fetchedChannelId = id;
        }

        if (!cancelled) setChannelTitle(displayName);
        if (!cancelled) setChannelId(fetchedChannelId ?? null);
        if (!cancelled) setTotalInTimeFrame(totalInTimeFrame);

        const analyzed = await analyzeVideoStats(apiVideos, displayName, currentTimeFrame);
        const top6 = analyzed.sort((a, b) => b.trendingScore - a.trendingScore).slice(0, 6);
        // Bestimme den höchsten Velocity‑Wert (Views pro Stunde) über alle analysierten Videos
        const topVelocityVph = analyzed.length > 0 
          ? analyzed.reduce((max, v) => {
              const vph = typeof v.viewsPerHour === 'number' && Number.isFinite(v.viewsPerHour) ? v.viewsPerHour : 0;
              return vph > max ? vph : max;
            }, 0)
          : 0;
        if (!cancelled) setVideos(top6);
        favoritesService.setCache(currentFavId, top6, {
          totalInTimeFrame,
          topVelocityVph,
          channelTitle: displayName,
          channelId: fetchedChannelId,
        });
      } catch (e: any) {
        if (!cancelled) setError(e?.message || t('errors.favoriteLoad'));
      } finally {
        if (!cancelled) setLoading(false);
        // Globales Event: Ende des Refresh für diesen Favoriten (nur senden, wenn Start gesendet wurde)
        try {
          if (dispatchedStart && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('favorite-refresh-end', { detail: { id: currentFavId } }));
          }
        } catch {
          // ignore
        }
      }
    };
    load();
    // Gesehene Tokens aktualisieren
    prevGlobalTokenRef.current = globalRefreshToken;
    prevLocalTokenRef.current = localRefreshToken;
    return () => {
      cancelled = true;
      if (staggerTimeout) clearTimeout(staggerTimeout);
    };
  }, [currentFavId, currentMax, favorite.query, favorite.searchType, currentTimeFrame, globalRefreshToken, localRefreshToken, staggerIndex]);

  // Sicherstellen, dass der Kanal-Titel klickbar ist – auch wenn wir nur Cache-Daten nutzen.
  // Falls keine channelId vorhanden ist, laden wir einmalig die Kanal-Metadaten (ID/Name).
  // Nur bei Channel-Suche relevant, nicht bei Keyword-Suche.
  useEffect(() => {
    // Bei Keyword-Suche gibt es keinen Kanal
    const searchType = favorite.searchType ?? SearchType.CHANNEL;
    if (searchType === SearchType.KEYWORD) return;

    let cancelled = false;
    // Ohne API-Key kein Versuch, die Metadaten zu laden
    const hasKey = typeof window !== 'undefined' && !!localStorage.getItem('yt_api_key');
    if (!hasKey) return;
    if (channelId) return; // bereits vorhanden

    (async () => {
      try {
        const { id, name } = await findChannelInfo(favorite.query);
        if (!cancelled) {
          setChannelId(id);
          setChannelTitle(name);
        }
      } catch {
        // stiller Fallback – Link bleibt dann einfach deaktiviert
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [favorite.query, favorite.searchType, channelId]);

  const channelUrl = useMemo(() => {
    // Bei Keyword-Suche gibt es keinen Kanal-Link
    const searchType = favorite.searchType ?? SearchType.CHANNEL;
    if (searchType === SearchType.KEYWORD) return null;
    
    if (channelId) return `https://www.youtube.com/channel/${channelId}`;
    const q = (favorite.query || '').trim();
    if (q.startsWith('@')) return `https://www.youtube.com/${q}`;
    return null;
  }, [channelId, favorite.query, favorite.searchType]);

  // Bestimme ob es eine Keyword-Suche ist
  const isKeywordSearch = (favorite.searchType ?? SearchType.CHANNEL) === SearchType.KEYWORD;

  // Klick ausserhalb von Menüs schließt diese
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;

      if (showTfMenu) {
        const clickedTfButton = !!tfButtonRef.current && tfButtonRef.current.contains(target);
        const clickedTfMenu = !!tfMenuRef.current && tfMenuRef.current.contains(target);
        if (!clickedTfButton && !clickedTfMenu) {
          setShowTfMenu(false);
        }
      }

      if (showMaxMenu) {
        const clickedMaxButton = !!maxButtonRef.current && maxButtonRef.current.contains(target);
        const clickedMaxMenu = !!maxMenuRef.current && maxMenuRef.current.contains(target);
        if (!clickedMaxButton && !clickedMaxMenu) {
          setShowMaxMenu(false);
        }
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showTfMenu, showMaxMenu]);

  const handleChangeTimeFrame = (tf: TimeFrame) => {
    setShowTfMenu(false);
    if (tf === currentTimeFrame) return;
    const updated = favoritesService.update(currentFavId, { timeFrame: tf });
    if (updated) {
      setCurrentTimeFrame(updated.timeFrame);
      setCurrentMax(updated.maxResults);
      setCurrentFavId(updated.id);
      setLocalRefreshToken(v => v + 1);
    }
  };

  const handleChangeMax = (value: number) => {
    setShowMaxMenu(false);
    if (value === currentMax) return;
    const updated = favoritesService.update(currentFavId, { maxResults: value });
    if (updated) {
      setCurrentTimeFrame(updated.timeFrame);
      setCurrentMax(updated.maxResults);
      setCurrentFavId(updated.id);
      setLocalRefreshToken(v => v + 1);
    }
  };

  return (
    <section className="mb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {isKeywordSearch ? (
              // Keyword-Suche: Hash-Icon, kein Link
              <span className="inline-flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-indigo-500" aria-hidden="true" />
                {channelTitle}
              </span>
            ) : channelUrl ? (
              // Kanal-Suche mit Link
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-red-500 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300 hover:underline underline-offset-2"
                title={t('results.openChannelTitle', { channel: channelTitle })}
              >
                <Youtube className="w-4 h-4" aria-hidden="true" />
                {channelTitle}
              </a>
            ) : (
              // Kanal-Suche ohne Link (noch kein channelId)
              <span className="inline-flex items-center gap-1.5">
                <Youtube className="w-4 h-4 text-red-500" aria-hidden="true" />
                {channelTitle}
              </span>
            )}
          </h3>
          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 relative z-40">
            {/* Timeframe Tag als Button */}
            <button
              ref={tfButtonRef}
              type="button"
              onClick={() => { setShowTfMenu(v => !v); setShowMaxMenu(false); }}
              className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200/70 dark:hover:bg-slate-700/70"
              title={t('favorites.changeTimeFrame')}
            >
              {timeFrameLabel(currentTimeFrame)}
            </button>
            {showTfMenu && (
              <div
                ref={tfMenuRef}
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute z-50 mt-2 left-0 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-1"
              >
                <div className="max-h-60 overflow-auto">
                  {TIME_FRAMES.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleChangeTimeFrame(opt.value)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm ${opt.value === currentTimeFrame ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      {t(opt.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Max Results Tag als Button */}
            <button
              ref={maxButtonRef}
              type="button"
              onClick={() => { setShowMaxMenu(v => !v); setShowTfMenu(false); }}
              className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200/70 dark:hover:bg-slate-700/70"
              title={t('favorites.changeMaxResults')}
            >
              {displayMax}
            </button>
            {showOverflowWarning && (
              <span
                className="inline-flex items-center gap-1 text-yellow-500 dark:text-yellow-400"
                title={t('favorites.overflowWarning', { total: totalInTimeFrame, shown: currentMax })}
              >
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              </span>
            )}
            {showMaxMenu && (
              <div
                ref={maxMenuRef}
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute z-50 mt-2 left-44 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-1"
              >
                <div className="max-h-60 overflow-auto">
                  {MAX_RESULTS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleChangeMax(opt.value)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm ${opt.value === currentMax ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      {t(opt.labelKey, opt.n ? { n: opt.n } : undefined)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <span
              className="px-2 py-0.5 rounded-full bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
              title={lastFetchedAt ? new Date(lastFetchedAt).toLocaleString() : undefined}
            >
              {loading
                ? t('favorites.status.refreshing')
                : lastFetchedAt
                  ? t('favorites.status.asOf', { time: formatTimeAgo(lastFetchedAt) })
                  : t('favorites.status.asOfUnknown')}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLocalRefreshToken(v => v + 1)}
            disabled={loading}
            className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors ${
              loading
                ? 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={t('favorites.refresh')}
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> {t('actions.refresh')}
          </button>

          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove?.(currentFavId)}
              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-red-500/30 text-red-400 dark:text-red-300 hover:bg-red-500/10 transition-colors"
              title={t('favorites.remove')}
            >
              <Trash2 className="w-3 h-3" /> {t('actions.remove')}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> {t('loading')}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-500 dark:text-red-200">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && videos && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {videos.map((video, idx) => {
            const isFresh = typeof video?.publishedTimestamp === 'number'
              && (Date.now() - video.publishedTimestamp) < 24 * 60 * 60 * 1000;
            return (
              <div key={video.id} className={isFresh ? 'fresh-green-border rounded-xl' : ''}>
                <VideoCard video={video} rank={idx + 1} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
