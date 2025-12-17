import React from 'react';
import { VideoData } from '../types';
import { Clock, Eye, Sparkles, TrendingUp, Zap } from 'lucide-react';

interface HighlightVideoCardProps {
  video: VideoData;
  highlightRank: number;
  sourceLabel: string;
  sourceRank: number;
}

export const HighlightVideoCard: React.FC<HighlightVideoCardProps> = ({
  video,
  highlightRank,
  sourceLabel,
  sourceRank,
}) => {
  // Determine color based on score (gleiches Verhalten wie `VideoCard`)
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-400 bg-red-400/10 border-red-400/20 shadow-[0_0_15px_rgba(248,113,113,0.2)]';
    if (score >= 50) return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
  };

  // Frische Videos (jünger als 24h) mit grünem Rand hervorheben
  const isFresh = typeof video?.publishedTimestamp === 'number' &&
    (Date.now() - video.publishedTimestamp) < 24 * 60 * 60 * 1000;

  return (
    <div className={`bg-white border-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden border dark:border-slate-700 shadow-lg hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 group flex flex-col h-full relative ${isFresh ? 'fresh-green-border' : ''}`}>
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

        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md flex items-center gap-1 pointer-events-none ${getScoreColor(video.trendingScore)}`}>
          <TrendingUp className="w-3 h-3" />
          Score: {video.trendingScore}
        </div>

        <div
          className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold border border-indigo-200/70 bg-indigo-600/90 text-white backdrop-blur-md flex items-center gap-1 pointer-events-none"
          title={`${sourceLabel} • Top ${sourceRank}`}
        >
          <Sparkles className="w-3 h-3" />
          #{highlightRank}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="mb-2">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate" title={`${sourceLabel} • Top ${sourceRank}`}>
            {sourceLabel} <span className="text-slate-400 dark:text-slate-500">•</span> Top {sourceRank}
          </div>
          <h3 className="text-base font-bold leading-snug line-clamp-2">
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
    </div>
  );
};
