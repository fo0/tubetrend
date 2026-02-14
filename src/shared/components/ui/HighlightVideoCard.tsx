import React from 'react';
import type {VideoData} from '@/src/features/videos';
import {Clock, Eye, EyeOff, Sparkles, Zap} from 'lucide-react';
import {useTranslation} from 'react-i18next';

interface HighlightVideoCardProps {
  video: VideoData;
  highlightRank: number;
  sourceLabel: string;
  sourceRank: number;
  sourceId: string;
  // Wenn true, wird die Karte visuell als "wird aktualisiert" markiert
  isRefreshing?: boolean;
  // Callback zum Ausblenden der Karte (mit optionalen Metadaten für die Liste)
  onHide?: (sourceId: string, videoId: string, meta: { videoTitle: string; thumbnailUrl: string; sourceLabel: string }) => void;
}

export const HighlightVideoCard: React.FC<HighlightVideoCardProps> = ({
  video,
  highlightRank,
  sourceLabel,
  sourceRank,
  sourceId,
  isRefreshing = false,
  onHide,
}) => {
  const { t } = useTranslation();
  // Frische Videos (jünger als 24h) mit grünem Rand hervorheben
  const isFresh = typeof video?.publishedTimestamp === 'number' &&
    (Date.now() - video.publishedTimestamp) < 24 * 60 * 60 * 1000;

  return (
    <div
      className={`bg-white border-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden border dark:border-slate-700 shadow-lg hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 group flex flex-col h-full relative ${isFresh ? 'fresh-green-border' : ''} ${isRefreshing ? 'opacity-60' : ''}`}
      aria-busy={isRefreshing}
    >
      {/* Thumbnail Area */}
      <div className="relative h-40 overflow-hidden bg-slate-100 dark:bg-slate-900">
        <a href={video.url} target="_blank" rel="noopener noreferrer" className="block w-full h-full cursor-pointer">
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
            loading="lazy"
          />
        </a>

        <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1 pointer-events-none">
          <Clock className="w-3 h-3 text-slate-300" />
          {video.uploadTime}
        </div>

        <div
          className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold border border-indigo-200/70 bg-indigo-600/90 text-white backdrop-blur-md flex items-center gap-1 pointer-events-none"
          title={`${sourceLabel} • Top ${sourceRank}`}
        >
          <Sparkles className="w-3 h-3" />
          #{highlightRank}
        </div>

        {/* Ausblenden-Button */}
        {onHide && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onHide(sourceId, video.id, {
                videoTitle: video.title,
                thumbnailUrl: video.thumbnailUrl,
                sourceLabel,
              });
            }}
            className="absolute top-1.5 right-1.5 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white/70 hover:text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            title={t('dashboard.highlights.hide')}
            aria-label={t('dashboard.highlights.hide')}
          >
            <EyeOff className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="mb-2">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate" title={`${sourceLabel} • Top ${sourceRank}`}>
            {sourceLabel} <span className="text-slate-400 dark:text-slate-500">•</span> Top {sourceRank}
          </div>
          <h3 className="text-base font-bold leading-snug line-clamp-2 min-h-[2.75rem]">
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-800 dark:text-slate-100 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors hover:underline decoration-indigo-400/30 underline-offset-2"
              title={video.title}
            >
              {video.title}
            </a>
          </h3>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="flex flex-col justify-center bg-slate-100/50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold mb-0.5">
              <Eye className="w-3 h-3 text-indigo-500 dark:text-indigo-400" /> Views
            </div>
            <span className="text-slate-700 dark:text-slate-200 font-mono text-sm">{video.views.toLocaleString('de-DE')}</span>
          </div>
          <div className="flex flex-col justify-center bg-slate-100/50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold mb-0.5">
              <Zap className="w-3 h-3 text-yellow-500 dark:text-yellow-400" /> Velocity
            </div>
            <span className="text-slate-700 dark:text-slate-200 font-mono text-sm">
              {video.viewsPerHour ? `~${video.viewsPerHour.toLocaleString('de-DE')}/h` : 'N/A'}
            </span>
          </div>
        </div>
      </div>
      {isRefreshing && (
        <div className="absolute inset-0 bg-slate-200/40 dark:bg-slate-700/30 pointer-events-none" />
      )}
    </div>
  );
};
