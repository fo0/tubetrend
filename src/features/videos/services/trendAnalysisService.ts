import type { YouTubeVideoItem } from "@/src/shared/types";
import type { VideoData } from "../types";

/**
 * Trend-score tuning constants. The score is a pure heuristic (no external
 * model): a weighted blend of view velocity and engagement, each capped.
 */
const SCORE_MAX = 100;
const VELOCITY_LOG_MULTIPLIER = 20;
const ENGAGEMENT_MULTIPLIER = 10;
const VELOCITY_WEIGHT = 0.7;
const ENGAGEMENT_WEIGHT = 0.3;

/** Thresholds driving the human-readable reasoning string. */
const VELOCITY_EXTREME_VPH = 10000;
const VELOCITY_VERY_HIGH_VPH = 1000;
const VELOCITY_GOOD_VPH = 100;
const ENGAGEMENT_EXCEPTIONAL_PCT = 10;
const ENGAGEMENT_HIGH_PCT = 5;
const ENGAGEMENT_GOOD_PCT = 2;
const AGE_VERY_FRESH_HOURS = 2;
const AGE_FRESH_HOURS = 6;
const VIEWS_ESTABLISHED = 100000;

/**
 * Pure math-based trend analysis (no AI API calls)
 */
export function analyzeVideoStats(
  videos: YouTubeVideoItem[],
  _channelName: string,
  _timeFrame: string,
): VideoData[] {
  const now = Date.now();

  return videos.map((video) => {
    const publishedAt = new Date(video.snippet.publishedAt).getTime();
    // Floor at 1 hour to avoid divide-by-near-zero spikes and to gracefully
    // handle unparseable publishedAt values (NaN propagates to false here).
    const rawAgeHours = Number.isFinite(publishedAt) ? (now - publishedAt) / (1000 * 60 * 60) : 1;
    const ageInHours = Math.max(1, rawAgeHours);
    const views = parseInt(video.statistics?.viewCount || "0", 10) || 0;
    const likes = parseInt(video.statistics?.likeCount || "0", 10) || 0;
    const comments = parseInt(video.statistics?.commentCount || "0", 10) || 0;

    // Calculate views per hour (velocity)
    const viewsPerHour = views / ageInHours;

    // Calculate engagement rate
    const engagementRate = views > 0 ? ((likes + comments) / views) * 100 : 0;

    // Calculate trending score (0-100)
    // Formula: weighted combination of velocity and engagement
    const velocityScore = Math.min(
      SCORE_MAX,
      Math.log10(viewsPerHour + 1) * VELOCITY_LOG_MULTIPLIER,
    );
    const engagementScore = Math.min(SCORE_MAX, engagementRate * ENGAGEMENT_MULTIPLIER);
    const trendingScore = Math.round(
      velocityScore * VELOCITY_WEIGHT + engagementScore * ENGAGEMENT_WEIGHT,
    );

    // Generate reasoning
    const reasoning = generateReasoning(viewsPerHour, engagementRate, ageInHours, views);

    // Get best available thumbnail
    const thumbnailUrl =
      video.snippet.thumbnails?.high?.url ||
      video.snippet.thumbnails?.medium?.url ||
      video.snippet.thumbnails?.default?.url ||
      "";

    return {
      id: video.id,
      title: video.snippet.title,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      thumbnailUrl,
      views,
      publishedTimestamp: publishedAt,
      trendingScore: Math.max(0, Math.min(SCORE_MAX, trendingScore)),
      reasoning,
      viewsPerHour: Math.round(viewsPerHour * 10) / 10,
      engagementRate: Math.round(engagementRate * 100) / 100,
    };
  });
}

function generateReasoning(
  viewsPerHour: number,
  engagementRate: number,
  ageInHours: number,
  views: number,
): string {
  const parts: string[] = [];

  if (viewsPerHour > VELOCITY_EXTREME_VPH) {
    parts.push("Extremely high velocity");
  } else if (viewsPerHour > VELOCITY_VERY_HIGH_VPH) {
    parts.push("Very high velocity");
  } else if (viewsPerHour > VELOCITY_GOOD_VPH) {
    parts.push("Good velocity");
  }

  if (engagementRate > ENGAGEMENT_EXCEPTIONAL_PCT) {
    parts.push("exceptional engagement");
  } else if (engagementRate > ENGAGEMENT_HIGH_PCT) {
    parts.push("high engagement");
  } else if (engagementRate > ENGAGEMENT_GOOD_PCT) {
    parts.push("good engagement");
  }

  if (ageInHours < AGE_VERY_FRESH_HOURS) {
    parts.push("very fresh content");
  } else if (ageInHours < AGE_FRESH_HOURS) {
    parts.push("fresh content");
  }

  if (parts.length === 0) {
    if (views > VIEWS_ESTABLISHED) {
      return "Established performance with steady views";
    }
    return "Moderate performance";
  }

  return parts.join(", ");
}
