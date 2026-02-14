import type {YouTubeVideoItem} from '@/src/shared/types';
import type {VideoData} from '../types';

/**
 * Pure math-based trend analysis (no AI API calls)
 */
export async function analyzeVideoStats(
  videos: YouTubeVideoItem[],
  _channelName: string,
  _timeFrame: string
): Promise<VideoData[]> {
  const now = Date.now();

  return videos.map((video) => {
    const publishedAt = new Date(video.snippet.publishedAt).getTime();
    const ageInHours = Math.max(1, (now - publishedAt) / (1000 * 60 * 60));
    const views = parseInt(video.statistics?.viewCount || '0', 10);
    const likes = parseInt(video.statistics?.likeCount || '0', 10);
    const comments = parseInt(video.statistics?.commentCount || '0', 10);

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
      '';

    return {
      id: video.id,
      title: video.snippet.title,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      thumbnailUrl,
      views,
      uploadTime: formatUploadTime(publishedAt),
      publishedTimestamp: publishedAt,
      trendingScore: Math.max(0, Math.min(100, trendingScore)),
      reasoning,
      viewsPerHour: Math.round(viewsPerHour * 10) / 10,
    };
  });
}

function generateReasoning(
  viewsPerHour: number,
  engagementRate: number,
  ageInHours: number,
  views: number
): string {
  const parts: string[] = [];

  if (viewsPerHour > 10000) {
    parts.push('Extremely high velocity');
  } else if (viewsPerHour > 1000) {
    parts.push('Very high velocity');
  } else if (viewsPerHour > 100) {
    parts.push('Good velocity');
  }

  if (engagementRate > 10) {
    parts.push('exceptional engagement');
  } else if (engagementRate > 5) {
    parts.push('high engagement');
  } else if (engagementRate > 2) {
    parts.push('good engagement');
  }

  if (ageInHours < 2) {
    parts.push('very fresh content');
  } else if (ageInHours < 6) {
    parts.push('fresh content');
  }

  if (parts.length === 0) {
    if (views > 100000) {
      return 'Established performance with steady views';
    }
    return 'Moderate performance';
  }

  return parts.join(', ');
}

function formatUploadTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  if (diffHours < 1) {
    const mins = Math.round(diffMs / (1000 * 60));
    return `${mins} min ago`;
  }
  if (diffHours < 24) {
    const hours = Math.round(diffHours);
    return `${hours}h ago`;
  }
  if (diffDays < 7) {
    const days = Math.round(diffDays);
    return `${days}d ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.round(diffDays / 7);
    return `${weeks}w ago`;
  }
  const months = Math.round(diffDays / 30);
  return `${months}mo ago`;
}
