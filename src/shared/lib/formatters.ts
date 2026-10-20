/**
 * Formatting utilities
 */

import type { TFunction } from "i18next";
import { getLocale } from "./locale";

/**
 * One formatter per locale, built on first use. Constructing an
 * `Intl.NumberFormat` negotiates the locale on every call and costs more than
 * ten times a `format()` on an existing instance, and these helpers run for
 * every row of the result table and every video card on each render. A
 * formatter is immutable, so reusing it yields identical output; keying by
 * locale keeps a language switch correct. The keys are the resolved UI
 * languages, so the maps stay tiny.
 */
const plainFormatters = new Map<string, Intl.NumberFormat>();
const compactFormatters = new Map<string, Intl.NumberFormat>();

/**
 * Format a number with locale-aware thousands separators.
 * Defaults to the active i18n language so output follows the user's
 * chosen UI language rather than a fixed locale.
 */
export function formatNumber(value: number, locale: string = getLocale()): string {
  let formatter = plainFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale);
    plainFormatters.set(locale, formatter);
  }
  return formatter.format(value);
}

/**
 * Format a number in compact notation (e.g., 1.2K, 3.5M)
 */
export function formatCompactNumber(value: number, locale: string = getLocale()): string {
  let formatter = compactFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    });
    compactFormatters.set(locale, formatter);
  }
  return formatter.format(value);
}

const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * Format a timestamp as an exact, localized date and time ("Oct 12, 2026,
 * 3:04 PM" / "12.10.2026, 15:04") — the precise value behind a relative
 * "x ago". Cached per locale like the number formatters above, because the
 * result table calls it for every row. Returns "" for a timestamp that is not
 * a finite number (cached data from an older build), where `format()` would
 * throw a RangeError.
 */
export function formatExactDateTime(timestamp: number, locale: string = getLocale()): string {
  if (!Number.isFinite(timestamp)) return "";
  let formatter = dateTimeFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
    dateTimeFormatters.set(locale, formatter);
  }
  return formatter.format(timestamp);
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
  // Bounded by days, not by months: 360–364 days are 12 thirty-day months but
  // not yet a 365-day year, so `months < 12` let them through to the year
  // branch, which floored them to "0y ago".
  if (days < 365) return t("timeAgo.months", { count: months });
  const years = Math.floor(days / 365);
  return t("timeAgo.years", { count: years });
}
