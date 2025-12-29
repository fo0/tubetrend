import {TimeFrame, VideoData, YouTubeVideoItem} from "../types";

export const analyzeVideoStats = async (
  apiVideos: YouTubeVideoItem[], 
  channelName: string, 
  timeFrame: TimeFrame
): Promise<VideoData[]> => {
  // No AI API Key needed anymore. Logic is pure math.

  const now = Date.now();

  // 1. Pre-calculate basic stats and velocity for all videos
  const processedVideos = apiVideos.map(item => {
    const publishedAt = new Date(item.snippet.publishedAt).getTime();
    const viewCount = parseInt(item.statistics?.viewCount || "0", 10);
    
    // Prevent division by zero or extreme outliers for very new videos (< 15 mins)
    // treating them as if they are at least 0.25 hours (15 mins) old for calc purposes
    const hoursAgo = Math.max(0.25, (now - publishedAt) / (1000 * 60 * 60));
    
    // Calculate Velocity (Views per Hour)
    const viewsPerHour = Math.round(viewCount / hoursAgo);
    
    // Determine relative time string
    let timeString = "";
    if (hoursAgo < 1) timeString = `vor ${Math.round(hoursAgo * 60)} Min`;
    else if (hoursAgo < 24) timeString = `vor ${Math.round(hoursAgo)} Std`;
    else timeString = `vor ${Math.round(hoursAgo / 24)} Tagen`;

    // Select best thumbnail
    const thumbs = item.snippet.thumbnails;
    const thumbUrl = thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url || "";

    return {
      rawItem: item,
      publishedAt,
      viewCount,
      hoursAgo,
      viewsPerHour,
      timeString,
      thumbUrl
    };
  });

  // 2. Find the Maximum Velocity in this dataset to normalize scores
  // If no views exist, avoid division by zero by setting min maxVelocity to 1
  const maxVelocity = Math.max(...processedVideos.map(v => v.viewsPerHour), 1);

  // 3. Generate Final Data with Scores and Reasoning
  const finalResults: VideoData[] = processedVideos.map(ytVideo => {
    // Normalize Score: (VideoVelocity / MaxVelocity) * 100
    // This ensures the best video always gets 100 (or close to it)
    const rawScore = (ytVideo.viewsPerHour / maxVelocity) * 100;
    const trendingScore = Math.round(rawScore);

    // Generate deterministic reasoning text
    let reasoning = "";
    if (trendingScore >= 95) {
      reasoning = `Top-Performer: Generiert extrem schnell Views (${ytVideo.viewsPerHour.toLocaleString()}/h).`;
    } else if (trendingScore >= 80) {
      reasoning = `Viraler Trend: Wächst viel schneller als der Durchschnitt (${ytVideo.viewsPerHour.toLocaleString()}/h).`;
    } else if (trendingScore >= 60) {
      reasoning = `Starke Performance: Überdurchschnittliche Aufrufzahlen.`;
    } else if (trendingScore >= 40) {
      reasoning = `Solide: Sammelt stetig Aufrufe (${ytVideo.viewsPerHour.toLocaleString()}/h).`;
    } else if (trendingScore >= 20) {
      reasoning = `Moderat: Normale Wachstumsrate für diesen Kanal.`;
    } else {
      reasoning = `Ruhig: Geringe aktuelle Aktivität im Vergleich zu den Top-Videos.`;
    }

    return {
      id: ytVideo.rawItem.id,
      title: ytVideo.rawItem.snippet.title,
      url: `https://www.youtube.com/watch?v=${ytVideo.rawItem.id}`,
      thumbnailUrl: ytVideo.thumbUrl,
      views: ytVideo.viewCount,
      uploadTime: ytVideo.timeString,
      publishedTimestamp: ytVideo.publishedAt,
      trendingScore: trendingScore,
      reasoning: reasoning,
      viewsPerHour: ytVideo.viewsPerHour
    };
  });

  return finalResults;
};