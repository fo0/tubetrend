import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FavoriteConfig, TimeFrame, VideoData } from '../types';
import { favoritesService } from '../services/favoritesService';
import { analyzeVideoStats } from '../services/geminiService';
import { findChannelInfo, getVideosFromChannel } from '../services/youtubeService';
import { VideoCard } from './VideoCard';
import { AlertCircle, ChevronRight, Loader2, Trash2, RefreshCw, Youtube } from 'lucide-react';

interface FavoriteRowProps {
  favorite: FavoriteConfig;
  onRemove?: (id: string) => void;
  // Wird vom Dashboard erhöht, um alle Reihen neu zu laden
  globalRefreshToken?: number;
}

export const FavoriteRow: React.FC<FavoriteRowProps> = ({ favorite, onRemove, globalRefreshToken = 0 }) => {
  const [videos, setVideos] = useState<VideoData[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [channelTitle, setChannelTitle] = useState<string>(favorite.query);
  const [channelId, setChannelId] = useState<string | null>(null);
  // Lokaler Refresh-Zähler für diese Reihe
  const [localRefreshToken, setLocalRefreshToken] = useState<number>(0);

  // Vorherige Token, um zu erkennen, ob ein erzwungener Refresh nötig ist
  const prevGlobalTokenRef = useRef<number>(globalRefreshToken);
  const prevLocalTokenRef = useRef<number>(localRefreshToken);

  const displayMax = useMemo(() => (favorite.maxResults === 0 ? 'Alle' : `Top ${favorite.maxResults}`), [favorite.maxResults]);

  // Letztes Cache-Datum ermitteln (für Anzeige "wie alt")
  const lastFetchedAt = useMemo(() => {
    const entry = favoritesService.getCache(favorite.id);
    return entry?.fetchedAt ?? null;
  }, [favorite.id, videos, loading, globalRefreshToken, localRefreshToken]);

  const formatTimeAgo = (ts: number): string => {
    const diffMs = Date.now() - ts;
    if (diffMs < 0) return 'gerade eben';
    const sec = Math.floor(diffMs / 1000);
    if (sec < 10) return 'gerade eben';
    if (sec < 60) return `vor ${sec} Sek.`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `vor ${min} Min.`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `vor ${hrs} Std.`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `vor ${days} Tg.`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `vor ${weeks} Wo.`;
    const months = Math.floor(days / 30);
    if (months < 12) return `vor ${months} Mon.`;
    const years = Math.floor(days / 365);
    return `vor ${years} J.`;
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setError(null);
      // Entscheiden, ob wir Cache ignorieren sollen (erzwungener Refresh)
      const forced = prevGlobalTokenRef.current !== globalRefreshToken || prevLocalTokenRef.current !== localRefreshToken;
      // Cache verwenden, wenn frisch und kein erzwungener Refresh
      if (!forced) {
        const cachedOk = favoritesService.isCacheValid(favorite.id);
        const cached = favoritesService.getCache(favorite.id);
        if (cachedOk && cached) {
          if (!cancelled) setVideos(cached.videos);
          return;
        }
      }

      setLoading(true);
      try {
        const { id, name, uploadsPlaylistId } = await findChannelInfo(favorite.query);
        if (!cancelled) setChannelTitle(name);
        if (!cancelled) setChannelId(id);
        const apiVideos = await getVideosFromChannel(uploadsPlaylistId, favorite.timeFrame as TimeFrame, favorite.maxResults);
        const analyzed = await analyzeVideoStats(apiVideos, name, favorite.timeFrame);
        const top6 = analyzed.sort((a, b) => b.trendingScore - a.trendingScore).slice(0, 6);
        if (!cancelled) setVideos(top6);
        favoritesService.setCache(favorite.id, top6);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Fehler beim Laden der Favoriten-Daten.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    // Gesehene Tokens aktualisieren
    prevGlobalTokenRef.current = globalRefreshToken;
    prevLocalTokenRef.current = localRefreshToken;
    return () => { cancelled = true; };
  }, [favorite.id, favorite.maxResults, favorite.query, favorite.timeFrame, globalRefreshToken, localRefreshToken]);

  // Sicherstellen, dass der Kanal-Titel klickbar ist – auch wenn wir nur Cache-Daten nutzen.
  // Falls keine channelId vorhanden ist, laden wir einmalig die Kanal-Metadaten (ID/Name).
  useEffect(() => {
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
  }, [favorite.query, channelId]);

  const channelUrl = useMemo(() => {
    if (channelId) return `https://www.youtube.com/channel/${channelId}`;
    const q = (favorite.query || '').trim();
    if (q.startsWith('@')) return `https://www.youtube.com/${q}`;
    return null;
  }, [channelId, favorite.query]);

  return (
    <section className="mb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-slate-100">
            {channelUrl ? (
              <a
                href={channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 hover:underline underline-offset-2"
                title={`YouTube-Kanal öffnen: ${channelTitle}`}
              >
                <Youtube className="w-4 h-4" aria-hidden="true" />
                {channelTitle}
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Youtube className="w-4 h-4 text-red-500" aria-hidden="true" />
                {channelTitle}
              </span>
            )}
          </h3>
          <ChevronRight className="w-4 h-4 text-slate-500" />
          <div className="text-sm text-slate-400 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">{favorite.timeFrame}</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">{displayMax}</span>
            <span
              className="px-2 py-0.5 rounded-full bg-slate-800/70 border border-slate-700 text-slate-400"
              title={lastFetchedAt ? new Date(lastFetchedAt).toLocaleString() : undefined}
            >
              {loading
                ? 'Aktualisiere…'
                : lastFetchedAt
                  ? `Stand: ${formatTimeAgo(lastFetchedAt)}`
                  : 'Stand: —'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLocalRefreshToken(t => t + 1)}
            disabled={loading}
            className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-colors ${
              loading
                ? 'border-slate-700 text-slate-500 cursor-not-allowed'
                : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title="Kanal aktualisieren"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Aktualisieren
          </button>

          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove?.(favorite.id)}
              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-colors"
              title="Favorit entfernen"
            >
              <Trash2 className="w-3 h-3" /> Entfernen
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Lädt…
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-200">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && videos && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {videos.map((video, idx) => (
            <VideoCard key={video.id} video={video} rank={idx + 1} />
          ))}
        </div>
      )}
    </section>
  );
};
