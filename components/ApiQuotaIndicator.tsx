import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Zap, AlertTriangle, X, Activity } from 'lucide-react';
import { getQuotaInfo, getQuotaHistory, QuotaHistoryEntry } from '../services/youtubeService';
import { useTranslation } from 'react-i18next';

// Group history entries by time buckets for the timeline
const groupHistoryByTimeBuckets = (history: QuotaHistoryEntry[], bucketCount: number = 12) => {
  if (history.length === 0) return [];

  const now = Date.now();
  // Show last 2 hours of activity
  const timeWindow = 2 * 60 * 60 * 1000; // 2 hours in ms
  const bucketSize = timeWindow / bucketCount;

  const buckets: { startTime: number; endTime: number; units: number; calls: number }[] = [];

  for (let i = 0; i < bucketCount; i++) {
    const endTime = now - (i * bucketSize);
    const startTime = endTime - bucketSize;
    buckets.unshift({ startTime, endTime, units: 0, calls: 0 });
  }

  // Assign history entries to buckets
  history.forEach(entry => {
    const bucketIndex = buckets.findIndex(
      b => entry.timestamp >= b.startTime && entry.timestamp < b.endTime
    );
    if (bucketIndex >= 0) {
      buckets[bucketIndex].units += entry.units;
      buckets[bucketIndex].calls += 1;
    }
  });

  return buckets;
};

// Format time for tooltip
const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Format relative time
const formatRelativeTime = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  return `vor ${hours} Std.`;
};

export const ApiQuotaIndicator: React.FC = () => {
  const { t } = useTranslation();
  const [quota, setQuota] = useState(getQuotaInfo());
  const [history, setHistory] = useState<QuotaHistoryEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial load
    setQuota(getQuotaInfo());
    setHistory(getQuotaHistory());

    // Listen for quota updates
    const handleQuotaUpdate = () => {
      setQuota(getQuotaInfo());
      setHistory(getQuotaHistory());
    };

    window.addEventListener('quota-updated', handleQuotaUpdate);

    // Also check on storage changes (for multi-tab sync)
    window.addEventListener('storage', handleQuotaUpdate);

    return () => {
      window.removeEventListener('quota-updated', handleQuotaUpdate);
      window.removeEventListener('storage', handleQuotaUpdate);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Group history into time buckets for chart
  const timeBuckets = useMemo(() => groupHistoryByTimeBuckets(history), [history]);
  const maxUnitsInBucket = useMemo(() => Math.max(...timeBuckets.map(b => b.units), 1), [timeBuckets]);

  // Recent calls (last 10)
  const recentCalls = useMemo(() => [...history].reverse().slice(0, 10), [history]);

  // Color based on percentage and exhausted state
  const getColorClasses = () => {
    if (quota.exhausted) {
      return {
        bg: 'bg-red-600',
        border: 'border-red-500/50',
        text: 'text-red-400',
        glow: 'shadow-red-500/30',
        bar: 'bg-red-500'
      };
    }
    if (quota.percentage >= 90) {
      return {
        bg: 'bg-red-500',
        border: 'border-red-500/30',
        text: 'text-red-400',
        glow: 'shadow-red-500/20',
        bar: 'bg-red-400'
      };
    }
    if (quota.percentage >= 70) {
      return {
        bg: 'bg-amber-500',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        glow: 'shadow-amber-500/20',
        bar: 'bg-amber-400'
      };
    }
    return {
      bg: 'bg-emerald-500',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      glow: 'shadow-emerald-500/20',
      bar: 'bg-emerald-400'
    };
  };

  const colors = getColorClasses();

  // Format numbers with locale
  const formatNumber = (n: number) => n.toLocaleString('de-DE');

  // Endpoint display names
  const getEndpointLabel = (endpoint: string): string => {
    const labels: Record<string, string> = {
      search: 'Suche',
      channels: 'Kanal',
      playlistItems: 'Playlist',
      videos: 'Videos'
    };
    return labels[endpoint] || endpoint;
  };

  // Endpoint colors
  const getEndpointColor = (endpoint: string): string => {
    const endpointColors: Record<string, string> = {
      search: 'text-red-400',
      channels: 'text-blue-400',
      playlistItems: 'text-purple-400',
      videos: 'text-green-400'
    };
    return endpointColors[endpoint] || 'text-slate-400';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Clickable indicator */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-700/50 transition-colors cursor-pointer"
        aria-label={t('quota.historyTitle')}
      >
        {/* Icon - warning when exhausted, otherwise battery */}
        {quota.exhausted ? (
          <AlertTriangle className={`w-3 h-3 ${colors.text} animate-pulse`} />
        ) : (
          <Zap className={`w-3 h-3 ${colors.text}`} />
        )}

        {/* Battery bar container */}
        <div className={`relative w-8 h-2.5 rounded-sm border ${colors.border} bg-slate-800/50 overflow-hidden`}>
          {/* Fill bar */}
          <div
            className={`absolute inset-y-0 left-0 ${colors.bg} transition-all duration-300 ${quota.exhausted ? 'animate-pulse' : ''}`}
            style={{ width: `${quota.percentage}%` }}
          />
        </div>

        {/* Percentage text */}
        <span className={`text-[10px] font-mono ${colors.text} opacity-60 group-hover:opacity-100 transition-opacity min-w-[2rem]`}>
          {quota.percentage}%
        </span>
      </button>

      {/* Dropdown popup with history */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50 bg-slate-800/50">
            <div className="flex items-center gap-2">
              <Activity className={`w-4 h-4 ${colors.text}`} />
              <span className="text-sm font-medium text-slate-200">{t('quota.historyTitle')}</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quota summary */}
          <div className="px-3 py-2 border-b border-slate-700/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{t('quota.label')}</span>
              <span className={colors.text}>
                {formatNumber(quota.used)} / {formatNumber(quota.limit)} {t('quota.units')}
              </span>
            </div>
            {/* Full-width progress bar */}
            <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${colors.bg} transition-all duration-300`}
                style={{ width: `${quota.percentage}%` }}
              />
            </div>
          </div>

          {/* Timeline chart */}
          <div className="px-3 py-3 border-b border-slate-700/50">
            <div className="text-[10px] text-slate-500 mb-2">{t('quota.last2Hours')}</div>
            <div className="flex items-end gap-0.5 h-12">
              {timeBuckets.map((bucket, index) => {
                const height = bucket.units > 0 ? Math.max(8, (bucket.units / maxUnitsInBucket) * 100) : 0;
                const isRecent = index === timeBuckets.length - 1;
                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center justify-end group/bar relative"
                  >
                    {/* Bar */}
                    <div
                      className={`w-full rounded-t transition-all duration-200 ${
                        bucket.units > 0 ? colors.bar : 'bg-slate-700/30'
                      } ${isRecent && bucket.units > 0 ? 'animate-pulse' : ''}`}
                      style={{ height: `${height}%`, minHeight: bucket.units > 0 ? '4px' : '2px' }}
                    />
                    {/* Tooltip on hover */}
                    {bucket.units > 0 && (
                      <div className="absolute bottom-full mb-1 px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-[9px] text-slate-300 whitespace-nowrap opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-10">
                        {bucket.units} {t('quota.units')} ({bucket.calls}x)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Time labels */}
            <div className="flex justify-between mt-1 text-[9px] text-slate-600">
              <span>-2h</span>
              <span>-1h</span>
              <span>{t('quota.now')}</span>
            </div>
          </div>

          {/* Recent calls list */}
          <div className="px-3 py-2 max-h-32 overflow-y-auto">
            <div className="text-[10px] text-slate-500 mb-1.5">{t('quota.recentCalls')}</div>
            {recentCalls.length === 0 ? (
              <div className="text-xs text-slate-500 italic py-2">{t('quota.noCalls')}</div>
            ) : (
              <div className="space-y-1">
                {recentCalls.map((call, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-[11px] py-0.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`font-medium ${getEndpointColor(call.endpoint)}`}>
                        {getEndpointLabel(call.endpoint)}
                      </span>
                      <span className="text-slate-500">
                        {call.units} {call.units === 1 ? 'Unit' : 'Units'}
                      </span>
                    </div>
                    <span className="text-slate-600 text-[10px]">
                      {formatRelativeTime(call.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
