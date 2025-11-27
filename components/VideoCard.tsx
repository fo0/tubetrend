import React from 'react';
import { VideoData } from '../types';
import { ExternalLink, TrendingUp, Eye, Clock, Zap } from 'lucide-react';

interface VideoCardProps {
  video: VideoData;
  rank: number;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, rank }) => {
  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-400 bg-red-400/10 border-red-400/20 shadow-[0_0_15px_rgba(248,113,113,0.2)]';
    if (score >= 50) return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
  };

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-lg hover:shadow-xl hover:border-slate-600 transition-all duration-300 group flex flex-col h-full relative">
      {/* Rank Badge for Top 3 */}
      {rank <= 3 && (
        <div className="absolute top-0 left-0 z-20 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-br-lg shadow-lg">
          #{rank}
        </div>
      )}

      {/* Thumbnail Area */}
      <div className="relative h-48 overflow-hidden bg-slate-900">
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
        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md flex items-center gap-1 ${getScoreColor(video.trendingScore)}`}>
          <TrendingUp className="w-3 h-3" />
          Score: {video.trendingScore}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 flex flex-col flex-grow">
        <div className="mb-3">
          <h3 className="text-lg font-bold leading-tight line-clamp-2">
            <a 
              href={video.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-slate-100 group-hover:text-indigo-400 transition-colors hover:underline decoration-indigo-400/30 underline-offset-2"
              title={video.title}
            >
              {video.title}
            </a>
          </h3>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex flex-col justify-center bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs uppercase font-semibold mb-0.5">
              <Eye className="w-3 h-3 text-indigo-400" /> Views
            </div>
            <span className="text-slate-200 font-mono text-sm">{video.views.toLocaleString('de-DE')}</span>
          </div>
          <div className="flex flex-col justify-center bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs uppercase font-semibold mb-0.5">
              <Zap className="w-3 h-3 text-yellow-400" /> Velocity
            </div>
            <span className="text-slate-200 font-mono text-sm">
              {video.viewsPerHour ? `~${video.viewsPerHour.toLocaleString('de-DE')}/h` : 'N/A'}
            </span>
          </div>
        </div>

        {/* AI Reasoning */}
        <div className="mt-auto">
          <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-3 relative">
            <div className="absolute -top-2 left-3 bg-slate-800 text-indigo-400 text-[10px] font-bold px-1.5 border border-indigo-500/20 rounded">
              ANALYSE
            </div>
            <p className="text-xs text-indigo-200/80 italic leading-relaxed pt-1">
              "{video.reasoning}"
            </p>
          </div>
          
          <a 
            href={video.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors text-sm font-medium gap-2 group/btn"
          >
            Auf YouTube ansehen
            <ExternalLink className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </div>
  );
};