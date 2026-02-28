import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tubetrend.app',
  appName: 'TubeTrend',
  webDir: 'dist',
  server: {
    // Load from local files; https scheme ensures localStorage and Web APIs work correctly
    androidScheme: 'https'
  },
  android: {
    // ChromeOS-optimized: allow mixed content for API calls
    allowMixedContent: true,
    backgroundColor: '#0b1220'
  }
};

export default config;
