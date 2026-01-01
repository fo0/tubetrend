import React, {useEffect, useMemo, useRef, useState} from 'react';
import type {FavoriteConfig} from '@/src/features/favorites';
import type {VideoData} from '@/src/features/videos';
import {SearchType} from '@/src/shared/types';
import type {TimeFrame} from '@/src/shared/types';
import {favoritesService} from '@/src/features/favorites';
import {analyzeVideoStats} from '@/src/features/videos';
import {findChannelInfo, getChannelQueryType, getVideosFromChannel, searchVideosByKeyword} from '@/src/features/youtube';
import {VideoCard} from './VideoCard';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  ChevronRight,
  Hash,
  Loader2,
  RefreshCw,
  Trash2,
  Youtube
} from 'lucide-react';
import {MAX_RESULTS_OPTIONS, TIME_FRAMES} from '@/src/shared/constants';
import {useTranslation} from 'react-i18next';

interface FavoriteRowProps {
  favorite: FavoriteConfig;
  onRemove?: (id: string) => void;
  // Callback um diesen Favoriten im Analyser zu öffnen (mit Cache-Daten)
  onAnalyze?: (favorite: FavoriteConfig, cachedVideos: VideoData[] | null, channelTitle: string, channelId: string | null) => void;
  // Wird vom Dashboard erhöht, um alle Reihen neu zu laden
  globalRefreshToken?: number;
  // Optimierung: Index für gestaffelten Refresh (verhindert gleichzeitige API-Calls)
  staggerIndex?: number;
}

// Optimierung: Gestaffelter Refresh - Delay zwischen den Favorites (in ms)
const STAGGER_DELAY_MS = 300;

export const FavoriteRow: React.FC<FavoriteRowProps> = ({ favorite, onRemove, onAnalyze, globalRefreshToken = 0, staggerIndex = 0 }) => {
  const { t } = useTranslation();
  const [videos, setVideos] = useState<VideoData[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [channelTitle, setChannelTitle] = useState<string>(favorite.query);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [totalInTimeFrame, setTotalInTimeFrame] = useState<number | null>(null);
  // Lokaler Refresh-Zähler für diese Reihe
  const [localRefreshToken, setLocalRefreshToken] = useState<number>(0);
  // Live-aktualisierter "vor X Min." Text
  const [liveTimeAgo, setLiveTimeAgo] = useState<string>('');

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

  // Vorherige Token, um zu erkennen, ob ein erzwungener Refresh nötig ist
  const prevGlobalTokenRef = useRef<number>(globalRefreshToken);
  const prevLocalTokenRef = useRef<number>(localRefreshToken);
  // Ref um zu tracken ob channelId bereits aus Cache/API gesetzt wurde (verhindert doppelte API-Calls)
  const channelIdLoadedRef = useRef<boolean>(false);
  // Ref um zu tracken ob refresh-start Event dispatched wurde (für cleanup)
  const dispatchedStartRef = useRef<boolean>(false);

  // Sync bei Prop-Wechsel (z.B. nach Seiten-Neuladen)
  useEffect(() => {
    setCurrentTimeFrame(favorite.timeFrame);
    setCurrentMax(favorite.maxResults);
    setCurrentFavId(favorite.id);
    // Reset channelId tracking wenn sich der Favorit ändert
    channelIdLoadedRef.current = false;
  }, [favorite.id]);

  const displayMax = useMemo(() => {
    if (currentMax === -1) return t('maxResults.auto');      // Auto
    if (currentMax === 0) return t('maxResults.noLimit');    // Ohne Limit
    return t('maxResults.topN', { n: currentMax });          // Top X
  }, [currentMax, t]);

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
  // Nur bei expliziten Limits (>0), nicht bei Auto (-1) oder Ohne Limit (0)
  // da der Video-Count Badge bereits die Gesamtzahl anzeigt
  const showOverflowWarning = useMemo(() => {
    if (!totalInTimeFrame) return false;
    if (currentMax <= 0) return false; // Auto (-1) oder Ohne Limit (0)
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

  // Live-Update für "vor X Min." Badge (aktualisiert alle 10 Sekunden)
  useEffect(() => {
    if (!lastFetchedAt || loading) {
      setLiveTimeAgo('');
      return;
    }
    // Initiale Berechnung
    setLiveTimeAgo(formatTimeAgo(lastFetchedAt));
    // Intervall für Live-Updates
    const interval = setInterval(() => {
      setLiveTimeAgo(formatTimeAgo(lastFetchedAt));
    }, 10000); // alle 10 Sekunden aktualisieren
    return () => clearInterval(interval);
  }, [lastFetchedAt, loading]);

  // Reagiere auf externe Cache-Updates (z.B. wenn ein anderer Prozess den Cache aktualisiert)
  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const e = ev as CustomEvent;
        const updatedId = e?.detail?.id as string | undefined;
        // Reagiere nur auf Updates für diesen Favoriten oder auf globale Updates ('*')
        if (updatedId && updatedId !== '*' && updatedId !== currentFavId) return;
        
        // Lade die Daten aus dem Cache neu
        const cached = favoritesService.getCache(currentFavId);
        if (cached) {
          setVideos(cached.videos);
          setTotalInTimeFrame(cached.meta?.totalInTimeFrame ?? null);
          if (cached.meta?.channelId) setChannelId(cached.meta.channelId);
          if (cached.meta?.channelTitle) setChannelTitle(cached.meta.channelTitle);
        }
      } catch {
        // stiller Fallback
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('favorites-cache-updated', handler as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('favorites-cache-updated', handler as EventListener);
      }
    };
  }, [currentFavId]);

  useEffect(() => {
    let cancelled = false;
    let staggerTimeout: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      setError(null);
      // Entscheiden, ob wir Cache ignorieren sollen (erzwungener Refresh)
      const isGlobalRefresh = prevGlobalTokenRef.current !== globalRefreshToken;
      const isLocalRefresh = prevLocalTokenRef.current !== localRefreshToken;
      const forced = isGlobalRefresh || isLocalRefresh;

      // Immer zuerst gecachte Daten anzeigen (auch wenn abgelaufen)
      // Das verhindert "Lädt..." bei abgelaufenem Cache
      const cached = favoritesService.getCache(currentFavId);
      if (cached) {
        if (!cancelled) setVideos(cached.videos);
        if (!cancelled) setTotalInTimeFrame(cached.meta?.totalInTimeFrame ?? null);
        if (!cancelled && cached.meta?.channelId) {
          setChannelId(cached.meta.channelId);
          channelIdLoadedRef.current = true;
        }
        if (!cancelled && cached.meta?.channelTitle) setChannelTitle(cached.meta.channelTitle);
      }

      // Cache verwenden, wenn frisch und kein erzwungener Refresh
      const cachedOk = favoritesService.isCacheValid(currentFavId);
      if (!forced && cachedOk && cached) {
        // Cache ist gültig, keine API-Calls nötig
        return;
      }

      // Nur "Lädt..." zeigen wenn keine gecachten Daten vorhanden
      if (!cached) {
        setLoading(true);
      }

      // Globales Event: Start des Refresh für diesen Favoriten
      // WICHTIG: Muss VOR dem Stagger-Delay gesendet werden, damit alle Icons
      // sofort die Lade-Animation zeigen beim "Alle aktualisieren"
      try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('favorite-refresh-start', { detail: { id: currentFavId } }));
          dispatchedStartRef.current = true;
        }
      } catch {
        // ignore
      }

      // Optimierung: Bei globalem Refresh gestaffelten Delay verwenden
      // um nicht alle API-Calls gleichzeitig zu starten
      if (isGlobalRefresh && staggerIndex > 0) {
        await new Promise<void>((resolve, reject) => {
          staggerTimeout = setTimeout(resolve, staggerIndex * STAGGER_DELAY_MS);
          // Speichere reject-Funktion für sauberes Cleanup
          (staggerTimeout as any).__reject = reject;
        }).catch(() => {
          // Timeout wurde abgebrochen - Ende-Event wird im Cleanup gesendet
        });
        if (cancelled) return;
      }
      try {
        let apiVideos: any[];
        let displayName: string;
        let fetchedChannelId: string | undefined;
        let totalInTimeFrame: number;

        const searchType = favorite.searchType ?? SearchType.CHANNEL;

        if (searchType === SearchType.KEYWORD) {
          // Keyword-Suche: Videos direkt nach Schlagwort suchen
          const result = await searchVideosByKeyword(favorite.query, currentTimeFrame as TimeFrame, currentMax, { favoriteId: currentFavId });
          apiVideos = result.videos;
          totalInTimeFrame = result.totalInTimeFrame;
          displayName = favorite.query; // Bei Keyword-Suche zeigen wir das Keyword als "Name"
          fetchedChannelId = undefined;
        } else {
          // Kanal-Suche: Erst Kanal finden, dann Videos aus Uploads-Playlist
          const queryType = getChannelQueryType(favorite.query);
          const { id, name, uploadsPlaylistId } = await findChannelInfo(favorite.query, { favoriteId: currentFavId });
          const result = await getVideosFromChannel(uploadsPlaylistId, currentTimeFrame as TimeFrame, currentMax, { name, favoriteId: currentFavId, favoriteType: queryType });
          apiVideos = result.videos;
          totalInTimeFrame = result.totalInTimeFrame;
          displayName = name;
          fetchedChannelId = id;
        }

        if (!cancelled) setChannelTitle(displayName);
        if (!cancelled) {
          setChannelId(fetchedChannelId ?? null);
          if (fetchedChannelId) channelIdLoadedRef.current = true;
        }
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
          if (dispatchedStartRef.current && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('favorite-refresh-end', { detail: { id: currentFavId } }));
            dispatchedStartRef.current = false;
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
      if (staggerTimeout) {
        clearTimeout(staggerTimeout);
        // Reject das Promise damit es nicht hängen bleibt
        if ((staggerTimeout as any).__reject) {
          (staggerTimeout as any).__reject();
        }
      }
      // Cleanup: Wenn Start-Event gesendet wurde aber noch kein End-Event, sende es jetzt
      if (dispatchedStartRef.current) {
        try {
          if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('favorite-refresh-end', { detail: { id: currentFavId } }));
          }
        } catch {
          // ignore
        }
        dispatchedStartRef.current = false;
      }
    };
  }, [currentFavId, currentMax, favorite.query, favorite.searchType, currentTimeFrame, globalRefreshToken, localRefreshToken, staggerIndex]);

  // Sicherstellen, dass der Kanal-Titel klickbar ist – auch wenn wir nur Cache-Daten nutzen.
  // Falls keine channelId vorhanden ist, laden wir einmalig die Kanal-Metadaten (ID/Name).
  // Nur bei Channel-Suche relevant, nicht bei Keyword-Suche.
  // WICHTIG: Verwendet channelIdLoadedRef um Race Condition mit dem Haupt-useEffect zu vermeiden
  // (verhindert doppelten findChannelInfo() Aufruf)
  useEffect(() => {
    // Bei Keyword-Suche gibt es keinen Kanal
    const searchType = favorite.searchType ?? SearchType.CHANNEL;
    if (searchType === SearchType.KEYWORD) return;

    // Prüfen ob channelId bereits vom Haupt-useEffect geladen wurde/wird
    if (channelIdLoadedRef.current) return;
    if (channelId) return; // bereits vorhanden

    let cancelled = false;
    // Ohne API-Key kein Versuch, die Metadaten zu laden
    const hasKey = typeof window !== 'undefined' && !!localStorage.getItem('yt_api_key');
    if (!hasKey) return;

    // Kurze Verzögerung um dem Haupt-useEffect Zeit zu geben, Cache-Daten zu laden
    const timeout = setTimeout(async () => {
      // Nochmal prüfen ob inzwischen geladen
      if (channelIdLoadedRef.current || cancelled) return;

      try {
        const { id, name } = await findChannelInfo(favorite.query, { favoriteId: currentFavId });
        if (!cancelled) {
          setChannelId(id);
          setChannelTitle(name);
          channelIdLoadedRef.current = true;
        }
      } catch {
        // stiller Fallback – Link bleibt dann einfach deaktiviert
      }
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
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
                : lastFetchedAt && liveTimeAgo
                  ? t('favorites.status.asOf', { time: liveTimeAgo })
                  : t('favorites.status.asOfUnknown')}
            </span>
            {!loading && totalInTimeFrame !== null && totalInTimeFrame > 0 && (
              <span
                className="px-2 py-0.5 rounded-full bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                title={t('favorites.status.videoCount', { count: totalInTimeFrame })}
              >
                {t('favorites.status.videoCount', { count: totalInTimeFrame })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Analyse-Button: Wechselt zum Analyser mit Cache-Daten */}
          {onAnalyze && (
            <button
              type="button"
              onClick={() => {
                // Alle verfügbaren Videos aus dem Cache holen (nicht nur die gecachten Top 6)
                const cached = favoritesService.getCache(currentFavId);
                onAnalyze(
                  { ...favorite, id: currentFavId, timeFrame: currentTimeFrame, maxResults: currentMax },
                  cached?.videos ?? videos,
                  channelTitle,
                  channelId
                );
              }}
              disabled={loading || (!videos && !favoritesService.getCache(currentFavId))}
              className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                loading || (!videos && !favoritesService.getCache(currentFavId))
                  ? 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  : 'border-indigo-500/30 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/10'
              }`}
              title={t('favorites.analyze')}
            >
              <BarChart3 className="w-3 h-3" /> {t('actions.analyze')}
            </button>
          )}

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
