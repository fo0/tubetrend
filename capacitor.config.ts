import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tubetrend.app",
  appName: "TubeTrend",
  webDir: "dist",
  server: {
    // Load from local files; https scheme ensures localStorage and Web APIs work correctly
    androidScheme: "https",
  },
  android: {
    // `allowMixedContent` is deliberately NOT set. It maps to the WebView's
    // MIXED_CONTENT_ALWAYS_ALLOW, which lets the https:// app scheme above pull
    // subresources over plain http:// — downgradeable, interceptable requests
    // from inside the origin whose localStorage holds the YouTube API key.
    // Nothing in the app needs it: the only outbound call is
    // https://www.googleapis.com (youtubeApiClient.ts) and thumbnails come from
    // https://i.ytimg.com. Leaving it unset keeps the Android default
    // (MIXED_CONTENT_NEVER_ALLOW), which is what the Docker target already
    // enforces through the nginx CSP.
    backgroundColor: "#0b1220",
  },
};

export default config;
