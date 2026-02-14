import React from 'react';
import type {VideoData} from '@/src/features/videos';
import {Clock, ExternalLink} from 'lucide-react';

interface VideoListTableProps {
  videos: VideoData[];
  startIndex: number;
}

export const VideoListTable: React.FC<VideoListTableProps> = ({ videos, startIndex }) => {
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-400 bg-red-400/10 border-red-400/20';
    if (score >= 50) return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
  };

  return (
    <div className="bg-white/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden backdrop-blur-sm shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 font-semibold">
              <th className="p-4 w-16 text-center">#</th>
              <th className="p-4">Video</th>
              <th className="p-4 hidden sm:table-cell">Upload</th>
              <th className="p-4 text-right">Views</th>
              <th className="p-4 text-right hidden md:table-cell">Velocity</th>
              <th className="p-4 text-center">Score</th>
              <th className="p-4 w-16 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50 text-sm">
            {videos.map((video, index) => {
              const rank = startIndex + index;
              return (
                <tr key={video.id} className="hover:bg-slate-100/40 dark:hover:bg-slate-800/40 transition-colors group">
                  <td className="p-4 text-center text-slate-500 font-mono font-medium">
                    {rank}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-4">
                      <a 
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative w-24 h-14 flex-shrink-0 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        <img 
                          src={video.thumbnailUrl} 
                          alt="" 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          loading="lazy"
                        />
                      </a>
                      <div className="min-w-0">
                        <a 
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer" 
                          className="font-medium text-slate-700 dark:text-slate-200 line-clamp-2 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors hover:underline decoration-indigo-400/30 underline-offset-2 block" 
                          title={video.title}
                        >
                          {video.title}
                        </a>
                        <div className="text-xs text-slate-500 mt-1 sm:hidden">
                          {video.uploadTime} • {video.views.toLocaleString()} Views
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400 whitespace-nowrap hidden sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                      {video.uploadTime}
                    </div>
                  </td>
                  <td className="p-4 text-right font-mono text-slate-600 dark:text-slate-300">
                    {video.views.toLocaleString('de-DE')}
                  </td>
                  <td className="p-4 text-right font-mono text-slate-500 dark:text-slate-400 hidden md:table-cell">
                    {video.viewsPerHour ? (
                      <span className="flex items-center justify-end gap-1 text-yellow-600/80 dark:text-yellow-500/80">
                         {video.viewsPerHour.toLocaleString('de-DE')}/h
                      </span>
                    ) : '-'}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getScoreColor(video.trendingScore)}`}>
                      {video.trendingScore}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <a 
                      href={video.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      title="Auf YouTube ansehen"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};