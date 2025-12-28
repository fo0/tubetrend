import React, { useState, useEffect } from 'react';
import { Zap, AlertTriangle } from 'lucide-react';
import { getQuotaInfo } from '../services/youtubeService';
import { useTranslation } from 'react-i18next';

export const ApiQuotaIndicator: React.FC = () => {
  const { t } = useTranslation();
  const [quota, setQuota] = useState(getQuotaInfo());

  useEffect(() => {
    // Initial load
    setQuota(getQuotaInfo());

    // Listen for quota updates
    const handleQuotaUpdate = () => {
      setQuota(getQuotaInfo());
    };

    window.addEventListener('quota-updated', handleQuotaUpdate);

    // Also check on storage changes (for multi-tab sync)
    window.addEventListener('storage', handleQuotaUpdate);

    return () => {
      window.removeEventListener('quota-updated', handleQuotaUpdate);
      window.removeEventListener('storage', handleQuotaUpdate);
    };
  }, []);

  // Color based on percentage and exhausted state
  const getColorClasses = () => {
    if (quota.exhausted) {
      return {
        bg: 'bg-red-600',
        border: 'border-red-500/50',
        text: 'text-red-400',
        glow: 'shadow-red-500/30'
      };
    }
    if (quota.percentage >= 90) {
      return {
        bg: 'bg-red-500',
        border: 'border-red-500/30',
        text: 'text-red-400',
        glow: 'shadow-red-500/20'
      };
    }
    if (quota.percentage >= 70) {
      return {
        bg: 'bg-amber-500',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        glow: 'shadow-amber-500/20'
      };
    }
    return {
      bg: 'bg-emerald-500',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      glow: 'shadow-emerald-500/20'
    };
  };

  const colors = getColorClasses();

  // Format numbers with locale
  const formatNumber = (n: number) => n.toLocaleString('de-DE');

  // Tooltip text
  const tooltipText = quota.exhausted
    ? t('quota.exhausted')
    : t('quota.tooltip', { used: formatNumber(quota.used), limit: formatNumber(quota.limit), percentage: quota.percentage });

  return (
    <div
      className="group relative flex items-center gap-1.5"
      title={tooltipText}
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

      {/* Hover tooltip with details */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
        <div className="flex items-center gap-1">
          {quota.exhausted ? (
            <span className="text-red-400">{t('quota.exhausted')}</span>
          ) : (
            <>
              <span className="text-slate-500">{t('quota.label')}:</span>
              <span className={colors.text}>{formatNumber(quota.used)}</span>
              <span className="text-slate-500">/</span>
              <span className="text-slate-400">{formatNumber(quota.limit)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
