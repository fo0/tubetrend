import type { YouTubeVideoItem } from "@/src/shared/types";
import type { VideoData } from "../types";

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
    const velocityScore = Math.min(100, Math.log10(viewsPerHour + 1) * 20);
    const engagementScore = Math.min(100, engagementRate * 10);
    const trendingScore = Math.round(velocityScore * 0.7 + engagementScore * 0.3);

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
      trendingScore: Math.max(0, Math.min(100, trendingScore)),
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

  if (viewsPerHour > 10000) {
    parts.push("Extremely high velocity");
  } else if (viewsPerHour > 1000) {
    parts.push("Very high velocity");
  } else if (viewsPerHour > 100) {
    parts.push("Good velocity");
  }

  if (engagementRate > 10) {
    parts.push("exceptional engagement");
  } else if (engagementRate > 5) {
    parts.push("high engagement");
  } else if (engagementRate > 2) {
    parts.push("good engagement");
  }

  if (ageInHours < 2) {
    parts.push("very fresh content");
  } else if (ageInHours < 6) {
    parts.push("fresh content");
  }

  if (parts.length === 0) {
    if (views > 100000) {
      return "Established performance with steady views";
    }
    return "Moderate performance";
  }

  return parts.join(", ");
}
