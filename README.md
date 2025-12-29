<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# TubeTrend

A YouTube trend analysis tool built with Vite + React + TypeScript. Analyze video performance, track favorites, and discover trending content across channels.

## Features

- **Dashboard**: Track your favorite YouTube channels and keywords with cached video data
- **Analyser**: Search and analyze videos by channel or keyword with trend scoring
- **Highlights**: Automatically surface top-performing videos across all favorites
- **Multi-language**: Supports 13 languages with automatic browser detection
- **Dark Mode**: System-aware theme with manual toggle
- **API Quota Tracking**: Monitor YouTube API usage with visual indicators

## Project Structure

```
src/
├── app/                          # Application shell
│   ├── App.tsx                   # Main app component (~220 lines)
│   └── routes/
│       ├── DashboardPage.tsx     # Dashboard view
│       └── AnalyserPage.tsx      # Analyser view
├── features/                     # Feature modules
│   ├── dashboard/                # Dashboard-specific logic
│   │   ├── hooks/
│   │   └── services/
│   ├── favorites/                # Favorites management
│   │   ├── services/
│   │   └── types.ts
│   ├── search/                   # Search functionality
│   │   └── hooks/
│   ├── videos/                   # Video data & analysis
│   │   ├── services/
│   │   └── types.ts
│   └── youtube/                  # YouTube API integration
│       └── services/
├── shared/                       # Shared utilities
│   ├── components/
│   │   ├── layout/               # Header, navigation
│   │   ├── ui/                   # Reusable UI components
│   │   └── feedback/             # Error boundaries
│   ├── constants/
│   ├── hooks/
│   ├── lib/                      # Utility functions
│   └── types/
├── providers/                    # React context providers
├── i18n/                         # Internationalization
│   ├── config.ts
│   └── locales/
└── styles/                       # Global styles
```

## Run Locally

**Prerequisites:** Node.js (v22 recommended)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the app:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000

## Build

```bash
npm run build
npm run preview
```

## Docker

```bash
docker-compose up
```

The app will be available at http://localhost:8889

## Environment Variables

This project uses Vite. Client-exposed variables must be prefixed with `VITE_`.

1. Copy the example env file:
   ```bash
   cp .env.example .env.local
   ```
   On Windows (PowerShell):
   ```powershell
   Copy-Item .env.example .env.local
   ```

2. Available variables:
   - `VITE_DEFAULT_SEARCH` — Default value shown in the search input when the app loads.
     - If not set, the app falls back to:
       - Dev mode: `TEDx`
       - Production builds: empty string

3. After changing env vars, restart the dev server so Vite reloads them.

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **i18n**: i18next with browser language detection
- **API**: YouTube Data API v3

## License

MIT
