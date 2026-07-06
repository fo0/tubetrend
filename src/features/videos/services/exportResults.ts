/**
 * Export analyser results (a list of analysed videos) to a CSV string.
 *
 * Pure, dependency-free, and side-effect-free so it can be unit-tested and
 * reused across surfaces. The download/blob handling stays in the UI layer.
 */

import type { VideoData } from "../types";

/** Stable, machine-readable CSV column order. */
const CSV_COLUMNS = [
  "rank",
  "title",
  "url",
  "views",
  "viewsPerHour",
  "engagementRate",
  "trendingScore",
  "publishedAt",
] as const;

/**
 * Neutralize spreadsheet formula injection ("CSV injection"): a field whose
 * first character is a formula trigger (=, +, -, @, tab, or CR) is prefixed
 * with a single quote so Excel / LibreOffice / Google Sheets treat it as
 * literal text instead of evaluating it. Video titles and labels are
 * attacker-controllable via the YouTube Data API, so this runs on every field.
 * See OWASP "CSV Injection". Behavior-equivalent for normal values (only the
 * rare value starting with a trigger char is affected).
 */
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/**
 * Escape a single CSV field per RFC 4180: wrap in double quotes when the value
 * contains a comma, quote, or newline, and double any embedded quotes. Leading
 * formula triggers are neutralized first to prevent CSV/formula injection.
 */
function escapeCsvField(value: string): string {
  const safe = neutralizeFormula(value);
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Build a CSV document (header + one row per video) from analyser results.
 * Order is preserved exactly as passed in (the caller controls sorting).
 */
export function buildResultsCsv(videos: VideoData[]): string {
  const header = CSV_COLUMNS.join(",");
  const rows = videos.map((video, index) => {
    const fields = [
      String(index + 1),
      video.title,
      video.url,
      String(video.views),
      video.viewsPerHour != null ? String(video.viewsPerHour) : "",
      video.engagementRate != null ? String(video.engagementRate) : "",
      String(video.trendingScore),
      new Date(video.publishedTimestamp).toISOString(),
    ];
    return fields.map((f) => escapeCsvField(f)).join(",");
  });
  return [header, ...rows].join("\r\n");
}

/**
 * Build a filesystem-safe, timestamped export filename.
 * e.g. buildExportFilename("@MrBeast", "csv") -> "tubetrend-MrBeast_2026-06-08_12-30-00.csv"
 */
function buildExportFilename(
  label: string | null | undefined,
  extension: string,
  now: Date = new Date(),
): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const slug = (label ?? "")
    .replace(/^@/, "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const namePart = slug ? `-${slug}` : "";
  return `tubetrend${namePart}_${stamp}.${extension}`;
}

/**
 * Build a filesystem-safe, timestamped CSV filename for an analyser export.
 * e.g. buildResultsCsvFilename("@MrBeast") -> "tubetrend-MrBeast_2026-06-08_12-30-00.csv"
 */
export function buildResultsCsvFilename(
  label: string | null | undefined,
  now: Date = new Date(),
): string {
  return buildExportFilename(label, "csv", now);
}

/** One video entry in the JSON export (mirrors the CSV columns, plus the stable video id). */
interface JsonExportVideo {
  rank: number;
  id: string;
  title: string;
  url: string;
  views: number;
  viewsPerHour: number | null;
  engagementRate: number | null;
  trendingScore: number;
  publishedAt: string;
}

/** Structured envelope for a JSON results export (self-describing for downstream tooling). */
export interface ResultsJsonExport {
  exportedAt: string;
  channel: string | null;
  count: number;
  videos: JsonExportVideo[];
}

/**
 * Build a pretty-printed JSON document from analyser results. Unlike the flat CSV
 * export, this keeps the stable video id and wraps the rows in a self-describing
 * envelope (export time + channel + count) so the data is easy to consume
 * programmatically. Order is preserved exactly as passed in.
 */
export function buildResultsJson(
  videos: VideoData[],
  channel?: string | null,
  now: Date = new Date(),
): string {
  const payload: ResultsJsonExport = {
    exportedAt: now.toISOString(),
    channel: channel && channel.trim() ? channel.trim() : null,
    count: videos.length,
    videos: videos.map((video, index) => ({
      rank: index + 1,
      id: video.id,
      title: video.title,
      url: video.url,
      views: video.views,
      viewsPerHour: video.viewsPerHour ?? null,
      engagementRate: video.engagementRate ?? null,
      trendingScore: video.trendingScore,
      publishedAt: new Date(video.publishedTimestamp).toISOString(),
    })),
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Build a filesystem-safe, timestamped JSON filename for an analyser export.
 * e.g. buildResultsJsonFilename("@MrBeast") -> "tubetrend-MrBeast_2026-06-08_12-30-00.json"
 */
export function buildResultsJsonFilename(
  label: string | null | undefined,
  now: Date = new Date(),
): string {
  return buildExportFilename(label, "json", now);
}
