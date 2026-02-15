import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Activity, AlertTriangle, AtSign, Hash, Search, User, X, Zap} from 'lucide-react';
import {quotaService} from '@/src/features/youtube';
import type {QuotaHistoryEntry} from '@/src/shared/types';
import {useTranslation} from 'react-i18next';

// Determine optimal time window based on actual data
const getOptimalTimeWindow = (history: QuotaHistoryEntry[]): { windowMs: number; label: string } => {
  if (history.length === 0) return { windowMs: 24 * 60 * 60 * 1000, label: '24h' };

  const now = Date.now();
  const oldestEntry = Math.min(...history.map(h => h.timestamp));
  const dataSpan = now - oldestEntry;

  // Choose time window based on data span with some buffer
  if (dataSpan < 30 * 60 * 1000) {
    // Less than 30 min -> show last 30 minutes
    return { windowMs: 30 * 60 * 1000, label: '30 Min.' };
  } else if (dataSpan < 60 * 60 * 1000) {
    // Less than 1 hour -> show last hour
    return { windowMs: 60 * 60 * 1000, label: '1 Std.' };
  } else if (dataSpan < 3 * 60 * 60 * 1000) {
    // Less than 3 hours -> show last 3 hours
    return { windowMs: 3 * 60 * 60 * 1000, label: '3 Std.' };
  } else if (dataSpan < 6 * 60 * 60 * 1000) {
    // Less than 6 hours -> show last 6 hours
    return { windowMs: 6 * 60 * 60 * 1000, label: '6 Std.' };
  } else if (dataSpan < 12 * 60 * 60 * 1000) {
    // Less than 12 hours -> show last 12 hours
    return { windowMs: 12 * 60 * 60 * 1000, label: '12 Std.' };
  }
  // Default: 24 hours
  return { windowMs: 24 * 60 * 60 * 1000, label: '24 Std.' };
};

// Group history entries by time buckets for the timeline
const groupHistoryByTimeBuckets = (history: QuotaHistoryEntry[], timeWindowMs: number, bucketCount: number = 24) => {
  if (history.length === 0) return [];

  const now = Date.now();
  const bucketSize = timeWindowMs / bucketCount;

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

// Group recent calls by context (favoriteType + name, or source for non-favorite calls)
interface GroupedCall {
  /** Display type: favoriteType if available, otherwise source */
  displayType: 'channel' | 'handle' | 'keyword' | 'autocomplete' | 'unknown';
  name: string;
  totalUnits: number;
  callCount: number;
  lastTimestamp: number;
  favoriteId?: string;
}

const groupCallsByContext = (history: QuotaHistoryEntry[]): GroupedCall[] => {
  const grouped = new Map<string, GroupedCall>();

  // Process in reverse order (newest first)
  [...history].reverse().forEach(entry => {
    const favoriteType = entry.context?.favoriteType;
    const source = entry.context?.source || 'unknown';
    const name = entry.context?.name || '';

    // Determine display type:
    // 1. Use favoriteType if available (new entries)
    // 2. Fallback to source-based mapping for backward compatibility with old entries
    let displayType: GroupedCall['displayType'];
    if (favoriteType) {
      displayType = favoriteType;
    } else if (source === 'autocomplete') {
      displayType = 'autocomplete';
    } else if (source === 'channel' || source === 'channel-info' || source === 'video-stats') {
      // Old entries without favoriteType - check if name starts with @ for handle detection
      displayType = name.startsWith('@') ? 'handle' : 'channel';
    } else if (source === 'keyword') {
      // Old keyword entries
      displayType = 'keyword';
    } else {
      displayType = 'unknown';
    }

    const key = `${displayType}:${name}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        displayType,
        name,
        totalUnits: 0,
        callCount: 0,
        lastTimestamp: entry.timestamp,
        favoriteId: entry.context?.favoriteId,
      });
    }

    const group = grouped.get(key)!;
    group.totalUnits += entry.units;
    group.callCount += 1;
    // Keep the most recent timestamp
    if (entry.timestamp > group.lastTimestamp) {
      group.lastTimestamp = entry.timestamp;
    }
  });

  // Sort by most recent activity
  return Array.from(grouped.values()).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
};

// Format relative time - returns translation key params, actual formatting done in component
const getRelativeTimeParts = (timestamp: number): { key: string; count?: number } => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return { key: 'quota.timeJustNow' };
  if (minutes < 60) return { key: 'quota.timeMinutesAgo', count: minutes };
  const hours = Math.floor(minutes / 60);
  return { key: 'quota.timeHoursAgo', count: hours };
};

// Format bucket time for tooltip - returns translation key params
const getBucketTimeParts = (bucket: { startTime: number; endTime: number }, timeWindowMs: number): { key: string; count?: number } => {
  const now = Date.now();
  const diffMs = now - bucket.endTime;

  // For short time windows (< 1 hour), show minutes
  if (timeWindowMs <= 60 * 60 * 1000) {
    const minutesAgo = Math.round(diffMs / (60 * 1000));
    if (minutesAgo <= 0) return { key: 'quota.now' };
    return { key: 'quota.timeMinutesAgo', count: minutesAgo };
  }

  // For medium time windows (< 6 hours), show minutes or hours
  if (timeWindowMs <= 6 * 60 * 60 * 1000) {
    const minutesAgo = Math.round(diffMs / (60 * 1000));
    if (minutesAgo < 60) {
      if (minutesAgo <= 0) return { key: 'quota.now' };
      return { key: 'quota.timeMinutesAgo', count: minutesAgo };
    }
    const hoursAgo = Math.round(diffMs / (60 * 60 * 1000));
    return { key: 'quota.timeHoursAgo', count: hoursAgo };
  }

  // For longer time windows, show hours
  const hoursAgo = Math.round(diffMs / (60 * 60 * 1000));
  if (hoursAgo === 0) return { key: 'quota.now' };
  return { key: 'quota.timeHoursAgo', count: hoursAgo };
};

export const ApiQuotaIndicator: React.FC = () => {
  const { t } = useTranslation();
  const [quota, setQuota] = useState(quotaService.getInfo());
  const [history, setHistory] = useState<QuotaHistoryEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial load
    setQuota(quotaService.getInfo());
    setHistory(quotaService.getHistory());

    // Listen for quota updates
    const handleQuotaUpdate = () => {
      setQuota(quotaService.getInfo());
      setHistory(quotaService.getHistory());
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

  // Determine optimal time window for chart
  const timeWindow = useMemo(() => getOptimalTimeWindow(history), [history]);

  // Group history into time buckets for chart
  const timeBuckets = useMemo(() => groupHistoryByTimeBuckets(history, timeWindow.windowMs), [history, timeWindow.windowMs]);
  const maxUnitsInBucket = useMemo(() => Math.max(...timeBuckets.map(b => b.units), 1), [timeBuckets]);

  // Grouped calls by context (for better overview)
  // Show all sources - the container is scrollable (max-h-48 overflow-y-auto)
  const groupedCalls = useMemo(() => groupCallsByContext(history), [history]);

  // Color based on percentage and exhausted state
  const getColorClasses = () => {
    if (quota.exhausted) {
      return {
        bg: 'bg-red-600',
        border: 'border-red-500/50',
        text: 'text-red-400',
        glow: 'shadow-red-500/30',
        bar: 'bg-red-500',
        stroke: '#f87171'
      };
    }
    if (quota.percentage >= 90) {
      return {
        bg: 'bg-red-500',
        border: 'border-red-500/30',
        text: 'text-red-400',
        glow: 'shadow-red-500/20',
        bar: 'bg-red-400',
        stroke: '#f87171'
      };
    }
    if (quota.percentage >= 70) {
      return {
        bg: 'bg-amber-500',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        glow: 'shadow-amber-500/20',
        bar: 'bg-amber-400',
        stroke: '#fbbf24'
      };
    }
    return {
      bg: 'bg-emerald-500',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      glow: 'shadow-emerald-500/20',
      bar: 'bg-emerald-400',
      stroke: '#34d399'
    };
  };

  const colors = getColorClasses();

  // Format numbers with locale
  const formatNumber = (n: number) => n.toLocaleString('de-DE');

  // Get icon for display type (favoriteType or autocomplete)
  const getDisplayTypeIcon = (displayType: GroupedCall['displayType']) => {
    switch (displayType) {
      case 'channel':
        return <User className="w-3 h-3" />;
      case 'handle':
        return <AtSign className="w-3 h-3" />;
      case 'keyword':
        return <Hash className="w-3 h-3" />;
      case 'autocomplete':
        return <Search className="w-3 h-3" />;
      default:
        return <Activity className="w-3 h-3" />;
    }
  };

  // Get color for display type
  const getDisplayTypeColor = (displayType: GroupedCall['displayType']): string => {
    switch (displayType) {
      case 'channel':
        return 'text-red-400';
      case 'handle':
        return 'text-orange-400';
      case 'keyword':
        return 'text-indigo-400';
      case 'autocomplete':
        return 'text-cyan-400';
      default:
        return 'text-slate-400';
    }
  };

  // Get label for display type
  const getDisplayTypeLabel = (displayType: GroupedCall['displayType']): string => {
    switch (displayType) {
      case 'channel':
        return t('quota.sourceChannel');
      case 'handle':
        return t('quota.sourceHandle');
      case 'keyword':
        return t('quota.sourceKeyword');
      case 'autocomplete':
        return t('quota.sourceAutocomplete');
      default:
        return t('quota.sourceUnknown');
    }
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
        <div className="absolute top-full right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50">
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

          {/* Timeline line chart - pure line chart showing usage over time */}
          <div className="px-3 py-3 border-b border-slate-700/50">
            <div className="text-[10px] text-slate-500 mb-2">{t('quota.lastTimeWindow', { time: timeWindow.label })}</div>
            <div className="relative h-16">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Grid lines */}
                <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" className="text-slate-700/20" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" className="text-slate-700/30" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="0" y1="75" x2="100" y2="75" stroke="currentColor" className="text-slate-700/20" strokeWidth="0.5" strokeDasharray="2,2" />

                {/* Line chart */}
                {timeBuckets.length > 0 && (
                  <polyline
                    points={timeBuckets.map((bucket, i) => {
                      const width = 100;
                      const height = 100;
                      const padding = 4;
                      const x = (i / (timeBuckets.length - 1)) * (width - padding * 2) + padding;
                      const y = height - padding - (bucket.units / maxUnitsInBucket) * (height - padding * 2);
                      return `${x},${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data points */}
                {timeBuckets.map((bucket, i) => {
                  if (bucket.units === 0) return null;
                  const width = 100;
                  const height = 100;
                  const padding = 4;
                  const x = (i / (timeBuckets.length - 1)) * (width - padding * 2) + padding;
                  const y = height - padding - (bucket.units / maxUnitsInBucket) * (height - padding * 2);
                  const isRecent = i === timeBuckets.length - 1 && bucket.calls > 0;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="3"
                      fill={colors.stroke}
                      className={isRecent ? 'animate-pulse' : ''}
                    />
                  );
                })}
              </svg>

              {/* Hover overlay for tooltips */}
              <div className="absolute inset-0 flex">
                {timeBuckets.map((bucket, index) => (
                  <div
                    key={index}
                    className="flex-1 relative group/point"
                  >
                    {bucket.units > 0 && (
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-[10px] text-slate-300 whitespace-nowrap opacity-0 group-hover/point:opacity-100 transition-opacity pointer-events-none z-[100]">
                        <div className="font-medium">{(() => {
                          const { key, count } = getBucketTimeParts(bucket, timeWindow.windowMs);
                          return t(key, { count });
                        })()}</div>
                        <div>{bucket.units} {t('quota.units')} ({bucket.calls} {t('quota.calls')})</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* Time labels - dynamic based on time window */}
            <div className="flex justify-between mt-1 text-[9px] text-slate-600">
              <span>-{timeWindow.label}</span>
              <span>-{timeWindow.label.replace(/(\d+)/, (m) => String(Math.round(parseInt(m) / 2)))}</span>
              <span>{t('quota.now')}</span>
            </div>
          </div>

          {/* Grouped calls by source/context */}
          <div className="px-3 py-2 max-h-48 overflow-y-auto">
            <div className="text-[10px] text-slate-500 mb-1.5">{t('quota.usageBySource')}</div>
            {groupedCalls.length === 0 ? (
              <div className="text-xs text-slate-500 italic py-2">{t('quota.noCalls')}</div>
            ) : (
              <div className="space-y-1.5">
                {groupedCalls.map((group, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between text-[11px] py-1 px-2 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <span className={`${getDisplayTypeColor(group.displayType)} mt-0.5 shrink-0`}>
                        {getDisplayTypeIcon(group.displayType)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-medium ${getDisplayTypeColor(group.displayType)}`}>
                            {getDisplayTypeLabel(group.displayType)}
                          </span>
                        </div>
                        {group.name && (
                          <div className="text-slate-400 truncate text-[10px]" title={group.name}>
                            {group.name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-slate-300 font-medium">
                        {formatNumber(group.totalUnits)} {t('quota.units')}
                      </div>
                      <div className="text-slate-600 text-[9px]">
                        {group.callCount}x · {(() => {
                          const { key, count } = getRelativeTimeParts(group.lastTimestamp);
                          return t(key, { count });
                        })()}
                      </div>
                    </div>
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
