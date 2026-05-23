/**
 * Formatting utilities
 */

import type { TFunction } from "i18next";
import { getLocale } from "./locale";

/**
 * Format a number with locale-aware thousands separators.
 * Defaults to the active i18n language so output follows the user's
 * chosen UI language rather than a fixed locale.
 */
export function formatNumber(value: number, locale: string = getLocale()): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Format a number in compact notation (e.g., 1.2K, 3.5M)
 */
export function formatCompactNumber(value: number, locale = "en"): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Format bytes to human readable size
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Format duration in milliseconds to human readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a past timestamp as a localized relative time string.
 * Uses the timeAgo.* i18n keys present in all supported locales.
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @param t         - i18next TFunction from useTranslation()
 */
export function formatTimeAgo(timestamp: number, t: TFunction): string {
  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return t("timeAgo.justNow");
  const sec = Math.floor(diffMs / 1000);
  if (sec < 10) return t("timeAgo.justNow");
  if (sec < 60) return t("timeAgo.seconds", { count: sec });
  const min = Math.floor(sec / 60);
  if (min < 60) return t("timeAgo.minutes", { count: min });
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return t("timeAgo.hours", { count: hrs });
  const days = Math.floor(hrs / 24);
  if (days < 7) return t("timeAgo.days", { count: days });
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return t("timeAgo.weeks", { count: weeks });
  const months = Math.floor(days / 30);
  if (months < 12) return t("timeAgo.months", { count: months });
  const years = Math.floor(days / 365);
  return t("timeAgo.years", { count: years });
}
