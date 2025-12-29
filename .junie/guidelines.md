### Project overview

This repository is a Vite + React + TypeScript single-page app (`"type": "module"` in `package.json`). Production builds are static assets (`dist/`) that can be served by any static web server (Docker image uses Nginx).

Key entrypoints:

- `index.html` — Vite HTML entry with Tailwind CDN and theme initialization
- `src/main.tsx` — React bootstrap (renders App with providers)
- `src/app/App.tsx` — main UI/state (search, dashboard, favorites)

Project structure:

```
src/
├── app/                    # Application shell & routes
│   ├── App.tsx             # Main app component
│   └── routes/             # Page components (DashboardPage, AnalyserPage)
├── features/               # Feature modules (domain logic)
│   ├── dashboard/          # Dashboard hooks & services
│   ├── favorites/          # Favorites management
│   ├── search/             # Search hooks
│   ├── videos/             # Video types & trend analysis
│   └── youtube/            # YouTube API client & services
├── shared/                 # Shared code
│   ├── components/         # UI components (layout/, ui/, feedback/)
│   ├── constants/          # App constants & config
│   ├── hooks/              # Shared React hooks
│   ├── lib/                # Utility functions (storage, eventBus, etc.)
│   └── types/              # Shared TypeScript types
├── providers/              # React context providers (ThemeProvider)
├── i18n/                   # Internationalization (config + locales)
└── styles/                 # Global CSS
```

### Build & configuration (project-specific)

#### Prerequisites

- Node.js (Docker build uses `NODE_VERSION=22-alpine`, so Node 22 is a safe baseline).
- Package manager: `npm` (repo uses `package-lock.json`).

#### Install

```powershell
npm ci
```

(`npm install` is fine for local dev, but `npm ci` matches the lockfile and is what Docker uses.)

#### Run (dev)

```powershell
npm run dev
```

Vite dev server configuration is in `vite.config.ts`:

- Binds `host: "0.0.0.0"` and `port: 3000` (useful for Docker/VMs).
- Path alias: `@` points to the repo root (`@/*` → `./*`). This is configured in both:
  - `vite.config.ts` (`resolve.alias['@']`)
  - `tsconfig.json` (`compilerOptions.paths`)

#### Build / preview

```powershell
npm run build
npm run preview
```

`npm run preview` runs `vite build && vite preview` (see `package.json`).

#### Environment variables

Vite exposes only variables prefixed with `VITE_` to the client.

Repo includes `.env.example`:

```powershell
Copy-Item .env.example .env.local
```

Currently used:

- `VITE_DEFAULT_SEARCH` — default search value shown on load (see `README.md` and `.env.example`).

After changing env vars, restart the Vite dev server.

#### Docker

- `Dockerfile` is a multi-stage build: `node` builder runs `npm ci` + `npm run build`, then `nginx:alpine` serves `/app/dist`.
- `docker-compose.yml` runs the published image `ghcr.io/fo0/tubetrend:latest` and maps port `8889:80`.

### Testing

#### Default expectation for tasks

Unless a task/instruction explicitly asks for tests, **do not create new tests**. Only add tests when they're specifically requested (or when you're intentionally introducing a test setup for the project).

There is no dedicated test configuration file in the repo (no `vitest.config.ts`). If you want unit tests, the simplest approach is to use `vitest` with plain `.test.ts` files.

#### Suggested setup (Vitest)

1) Add the dependency:

```powershell
npm install -D vitest
```

2) Add a script in `package.json`:

```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

3) Run tests:

```powershell
npm test
```

Notes specific to this repo:

- The project is ESM (`"type": "module"`). In tests, prefer ESM imports.
- If a test needs filesystem access relative to the test file, use `import.meta.url` + `fileURLToPath` (works in ESM):
  - `const here = path.dirname(fileURLToPath(import.meta.url))`

#### Example test (works with the setup above)

Create `src/shared/lib/example.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('example', () => {
  it('adds numbers', () => {
    expect(1 + 2).toBe(3);
  });
});
```

Then:

```powershell
npm test
```

#### Adding new tests (conventions)

- Place tests near the code under test (e.g. `src/shared/lib/foo.test.ts` next to `src/shared/lib/foo.ts`).
- Keep unit tests deterministic:
  - Avoid relying on network calls (YouTube API) in unit tests.
  - For services, prefer testing pure helpers or injecting the fetch layer.

### Additional development / debugging notes (project-specific)

#### Client-side persistence (important for debugging)

This app stores multiple pieces of state in `localStorage`. When debugging "sticky" behavior, clear these keys.

- YouTube API key:
  - `src/features/youtube/services/youtubeApiClient.ts`: `yt_api_key`
  - Channel cache: `yt_channel_cache`
- Favorites:
  - `src/features/favorites/services/favoritesService.ts`: `tt.favorites.v1`
  - Favorites cache: `tt.favorites.cache.v1`
  - The UI listens for `window` event `favorites-cache-updated` (dispatched by `favoritesService.setCache`) to re-render/sort.
- Dashboard sorting:
  - `src/features/dashboard/hooks/useDashboard.ts`: `tt.dashboard.sort.v1`, `tt.dashboard.sortOrder.v1`
- Search UI preferences/history:
  - `src/shared/components/ui/InputSection.tsx`: `tt.search.timeframe`, `tt.search.maxResults`, `tt.search.history`
- i18n explicit language selection:
  - `src/i18n/config.ts`: `tt.lang.explicit`
- Theme:
  - `src/providers/ThemeProvider.tsx`: `tt.theme.explicit`
- Hidden highlights:
  - `src/features/dashboard/services/hiddenHighlightsService.ts`: `tt.dashboard.hiddenHighlights.v1`
- Quota tracking:
  - `src/features/youtube/services/quotaService.ts`: `tt.quota.tracking`

#### "AI" service behavior

`src/features/videos/services/trendAnalysisService.ts` does **not** call an external AI API anymore (comment: "Logic is pure math"). Trend scoring is deterministic and based on view velocity normalization.

#### TypeScript configuration quirks

`tsconfig.json` uses `"moduleResolution": "bundler"` and `"allowImportingTsExtensions": true` (Vite-style). If you add tooling that assumes Node-style resolution (older Jest configs, ts-node scripts), you may need additional configuration.

#### Import conventions

- Use path alias `@/` for imports from project root (e.g., `import { foo } from '@/src/shared/lib/foo'`)
- Feature modules export via barrel files (`index.ts`) for clean imports
- Types can be imported with `import type` for type-only imports
