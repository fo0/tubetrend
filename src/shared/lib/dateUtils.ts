import { TimeFrame } from "../types";

/**
 * Date and time utilities
 */

// Built once, like `pacificWallClock` below: the locale and time zone are
// fixed, so a fresh instance per call only repeated the costly construction.
// Every quota read calls it — track() on each API call, then getInfo() and
// getHistory() again in the quota indicator when the update event lands.
const pacificDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Get today's date as YYYY-MM-DD string in America/Los_Angeles timezone.
 * YouTube API quota resets at midnight Pacific Time, so daily tracking
 * must be anchored to that timezone — not UTC.
 */
export function getTodayDateString(): string {
  return pacificDate.format(new Date()); // en-CA produces YYYY-MM-DD
}

const pacificWallClock = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

/** Pacific wall-clock time at `timestamp`, as the UTC epoch value of the same digits. */
function pacificWallClockAsUtc(timestamp: number): {
  wall: number;
  y: number;
  m: number;
  d: number;
} {
  const parts: Record<string, number> = {};
  for (const p of pacificWallClock.formatToParts(new Date(timestamp))) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  const { year: y, month: m, day: d } = parts;
  return { wall: Date.UTC(y, m - 1, d, parts.hour, parts.minute, parts.second), y, m, d };
}

/**
 * The instant of the next daily YouTube API quota reset — midnight in
 * America/Los_Angeles, the same anchor `getTodayDateString` uses.
 *
 * The UTC offset is taken at the candidate instant itself, not at `now`: on a
 * DST switch day the offset of "now" and of the coming midnight differ by an
 * hour, and using the current one would put the reset an hour off. Midnight is
 * never inside a Pacific DST gap (those happen at 02:00), so the second pass
 * always lands on it.
 */
export function getNextQuotaResetTime(now: number = Date.now()): number {
  const { wall, y, m, d } = pacificWallClockAsUtc(now);
  const nextMidnightWall = Date.UTC(y, m - 1, d + 1);
  const offsetNow = wall - Math.floor(now / 1000) * 1000;
  const candidate = nextMidnightWall - offsetNow;
  const offsetThen = pacificWallClockAsUtc(candidate).wall - candidate;
  return nextMidnightWall - offsetThen;
}

/**
 * Get a date N months ago.
 *
 * `setMonth` alone overflows when the current day does not exist in the target
 * month: on 2026-03-31, `setMonth(month - 1)` asks for "2026-02-31" and JS rolls
 * it forward to 2026-03-03 — the cutoff would land *after* the intended one and
 * silently shrink every LAST_*_MONTHS time frame on the 29th–31st of a month.
 * Pinning the day to 1 before shifting the month, then clamping to the target
 * month's last day, keeps the result inside the intended month.
 */
export function getDateMonthsAgo(n: number): Date {
  const d = new Date();
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  const lastDayOfTargetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDayOfTargetMonth));
  return d;
}

/**
 * Calculate cutoff time based on TimeFrame
 */
export function getCutoffTime(timeFrame: TimeFrame): number {
  const now = Date.now();
  const monthsAgo = (n: number) => getDateMonthsAgo(n).getTime();

  switch (timeFrame) {
    case TimeFrame.LAST_HOUR:
      return now - 60 * 60 * 1000;
    case TimeFrame.LAST_3_HOURS:
      return now - 3 * 60 * 60 * 1000;
    case TimeFrame.LAST_5_HOURS:
      return now - 5 * 60 * 60 * 1000;
    case TimeFrame.LAST_12_HOURS:
      return now - 12 * 60 * 60 * 1000;
    case TimeFrame.LAST_24_HOURS:
    case TimeFrame.TODAY:
      return now - 24 * 60 * 60 * 1000;
    case TimeFrame.LAST_2_DAYS:
      return now - 2 * 24 * 60 * 60 * 1000;
    case TimeFrame.LAST_3_DAYS:
      return now - 3 * 24 * 60 * 60 * 1000;
    case TimeFrame.LAST_4_DAYS:
      return now - 4 * 24 * 60 * 60 * 1000;
    case TimeFrame.LAST_5_DAYS:
      return now - 5 * 24 * 60 * 60 * 1000;
    case TimeFrame.LAST_6_DAYS:
      return now - 6 * 24 * 60 * 60 * 1000;
    case TimeFrame.LAST_WEEK:
      return now - 7 * 24 * 60 * 60 * 1000;
    case TimeFrame.LAST_2_WEEKS:
      return now - 14 * 24 * 60 * 60 * 1000;
    case TimeFrame.LAST_3_WEEKS:
      return now - 21 * 24 * 60 * 60 * 1000;
    case TimeFrame.LAST_4_WEEKS:
      return now - 28 * 24 * 60 * 60 * 1000;
    case TimeFrame.LAST_MONTH:
      return monthsAgo(1);
    case TimeFrame.LAST_2_MONTHS:
      return monthsAgo(2);
    case TimeFrame.LAST_3_MONTHS:
      return monthsAgo(3);
    case TimeFrame.LAST_4_MONTHS:
      return monthsAgo(4);
    case TimeFrame.LAST_5_MONTHS:
      return monthsAgo(5);
    case TimeFrame.LAST_6_MONTHS:
      return monthsAgo(6);
    default:
      return now - 24 * 60 * 60 * 1000;
  }
}

/**
 * Get ISO date string for publishedAfter API parameter
 */
export function getPublishedAfterDate(timeFrame: TimeFrame): string {
  const cutoffTime = getCutoffTime(timeFrame);
  return new Date(cutoffTime).toISOString();
}

/**
 * Check if a timestamp is within a given timeframe
 */
export function isWithinTimeFrame(timestamp: number, timeFrame: TimeFrame): boolean {
  const cutoffTime = getCutoffTime(timeFrame);
  return timestamp >= cutoffTime;
}

/**
 * Parse a YouTube ISO 8601 duration (e.g. "PT1H23M45S") into total seconds.
 * Returns null when the string cannot be parsed — callers decide the policy
 * (e.g. include or exclude videos with unknown duration).
 *
 * The pattern is anchored on purpose. All three component groups are optional,
 * so an unanchored `/PT(\d+H)?(\d+M)?(\d+S)?/` matches the bare literal "PT"
 * wherever it appears and can therefore never fail for any string containing
 * it — a malformed value ("PT", "PTx", "junkPT5M", a truncated field) returned 0
 * instead of null. Zero is not "unknown": the Shorts filter in searchService
 * keeps a video whose duration is null but drops anything under
 * SHORTS_DURATION_THRESHOLD_SECONDS, so a garbled duration silently deleted the
 * video from the results instead of leaving it in. The anchors reject trailing
 * and leading junk, and the `(?=\d)` lookahead requires at least one component,
 * which restores the documented contract. Well-formed "PT..." values parse
 * exactly as before, and day-carrying durations ("P1DT2H") still return null —
 * they contain no "PT" and did not parse before this change either.
 */
export function parseISO8601DurationToSeconds(duration: string | undefined | null): number | null {
  if (!duration) return null;
  const match = duration.match(/^PT(?=\d)(\d+H)?(\d+M)?(\d+S)?$/);
  if (!match) return null;
  const h = parseInt(match[1]?.replace("H", "") || "0", 10);
  const m = parseInt(match[2]?.replace("M", "") || "0", 10);
  const s = parseInt(match[3]?.replace("S", "") || "0", 10);
  return h * 3600 + m * 60 + s;
}
