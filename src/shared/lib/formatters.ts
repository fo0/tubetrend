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
export function formatCompactNumber(value: number, locale: string = getLocale()): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
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
