# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

TubeTrend is a YouTube trend analysis tool built with **Vite + React 19 + TypeScript**. It's a single-page app that analyzes video performance, tracks favorites, and discovers trending content across channels.

## Commands

```bash
npm install      # Install dependencies
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build to dist/
npm run preview  # Build and preview production
```

Docker: `docker-compose up` runs at http://localhost:8889

## Project Structure

```
src/
├── app/              # App shell & routes (App.tsx, DashboardPage, AnalyserPage)
├── features/         # Feature modules (domain logic)
│   ├── dashboard/    # Dashboard hooks & services
│   ├── favorites/    # Favorites management
│   ├── search/       # Search hooks
│   ├── videos/       # Video types & trend analysis
│   └── youtube/      # YouTube API client & services
├── shared/           # Shared code
│   ├── components/   # UI components (layout/, ui/, feedback/)
│   ├── constants/    # App constants
│   ├── hooks/        # Shared React hooks
│   ├── lib/          # Utilities (storage, eventBus, formatters)
│   └── types/        # Shared TypeScript types
├── providers/        # React context providers (ThemeProvider)
├── i18n/             # i18n config + locales (en, de)
└── styles/           # Global CSS
```

## Path Aliases

Configured in both `tsconfig.json` and `vite.config.ts`:

- `@/*` → project root (`./`)
- `@features/*` → `./src/features/*`
- `@shared/*` → `./src/shared/*`
- `@providers/*` → `./src/providers/*`
- `@i18n/*` → `./src/i18n/*`

## Key Architecture Notes

- **ESM Project**: `"type": "module"` in package.json
- **TypeScript**: Strict mode, `moduleResolution: "bundler"`, `allowImportingTsExtensions: true`
- **Styling**: Tailwind CSS (CDN in index.html)
- **Icons**: Lucide React
- **i18n**: i18next with browser language detection
- **API**: YouTube Data API v3

## Environment Variables

Copy `.env.example` to `.env.local`. Vite exposes only `VITE_` prefixed vars.

- `VITE_DEFAULT_SEARCH` — Default search input value (dev fallback: `TEDx`)

Restart dev server after changing env vars.

## localStorage Keys (Debugging)

Clear these when debugging "sticky" behavior:

| Key | Purpose |
|-----|---------|
| `yt_api_key` | YouTube API key |
| `yt_channel_cache` | Channel cache |
| `tt.favorites.v1` | Favorites list |
| `tt.favorites.cache.v1` | Favorites video cache |
| `tt.dashboard.sort.v1` | Dashboard sort field |
| `tt.dashboard.sortOrder.v1` | Dashboard sort order |
| `tt.dashboard.hiddenHighlights.v1` | Hidden highlights |
| `tt.search.timeframe` | Search timeframe preference |
| `tt.search.maxResults` | Search max results |
| `tt.search.history` | Search history |
| `tt.lang.explicit` | Explicit language selection |
| `tt.theme.explicit` | Theme preference |
| `tt.quota.tracking` | API quota tracking |

## Testing

No test setup by default. If tests are needed:

```bash
npm install -D vitest
# Add to package.json scripts: "test": "vitest run"
npm test
```

Place tests near source files: `foo.test.ts` next to `foo.ts`.

## Import Conventions

- Use path aliases for imports (`@features/`, `@shared/`, etc.)
- Feature modules export via barrel files (`index.ts`)
- Use `import type` for type-only imports
