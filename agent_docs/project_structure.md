# Project Structure — Full Tree

Offloaded from `CLAUDE.md` (2026-07-26) per `agent_docs/context_budget.md` ladder step 5. CLAUDE.md keeps a two-level summary; the full tree lives here.

> Agents normally find files faster with `glob`/`grep` than with a static list. Use this file for orientation, not as an index to keep in sync line-by-line.

```
tubetrend/
├── src/
│   ├── app/                          # Application shell & routing
│   │   ├── App.tsx                   # Main app component (state, page switching, modals)
│   │   └── routes/                   # Page-level components
│   │       ├── AnalyserPage.tsx      # Video search & analysis page
│   │       ├── DashboardPage.tsx     # Favorites dashboard page
│   │       └── index.ts              # Barrel export
│   ├── features/                     # Feature modules (domain logic)
│   │   ├── dashboard/                # Dashboard feature (hooks + services)
│   │   ├── favorites/                # Favorites management (CRUD + cache)
│   │   ├── search/                   # Search functionality
│   │   ├── videos/                   # Video analysis (trend scoring)
│   │   └── youtube/                  # YouTube API integration
│   ├── shared/                       # Shared code across features
│   │   ├── components/               # UI / layout / feedback
│   │   ├── constants/                # STORAGE_KEYS, CACHE_TTL, timeFrames
│   │   ├── hooks/                    # useDebounce, useEventListener, useLocalStorage
│   │   ├── lib/                      # storage, eventBus, formatters, dateUtils
│   │   └── types/                    # Shared types
│   ├── providers/                    # React context providers (ThemeProvider)
│   ├── i18n/                         # Internationalization (en, de + 11 fallbacks)
│   ├── styles/                       # Global CSS (themes, scrollbars, animations)
│   ├── assets/                       # Bundled static assets (icon.svg)
│   └── main.tsx                      # React entry point
├── android/                          # Capacitor Android project (ChromeOS APK)
├── chrome-extension/                 # Chrome Extension source files (Manifest V3)
├── electron/                         # Electron desktop app wrapper
├── build/                            # Build resources (icons)
├── scripts/                          # Build/utility scripts
├── docs/
│   ├── ARCHITECTURE.mmd              # Mermaid architecture diagram
│   └── adr/                          # Architecture Decision Records
├── agent_docs/                       # Agent process docs (review, backlog, memory, ADR, MCP, hooks, API ref, refactoring, context budget)
├── .claude/
│   ├── settings.json                 # Tier-1 hooks + trigger permissions
│   └── skills/                       # done / pr / review / security-review / rollback / ci / stuck / beacon / gitnexus/
├── .github/                          # Workflows + dependabot + templates
├── index.html                        # Vite HTML entry (theme base styles: src/styles/index.css)
├── capacitor.config.ts               # Capacitor config
├── vite.config.ts                    # Vite config
├── tsconfig.json                     # TypeScript strict config with path aliases
├── electron-builder.json             # electron-builder targets (win/mac/linux → release/)
├── electron-builder.chromebook.json  # electron-builder .deb targets (x64/arm64)
├── Dockerfile / docker-compose.yml   # Container build + run
├── nginx.conf                        # Nginx config baked into the runtime image
└── README.md / CONTRIBUTING.md / SECURITY.md / LICENSE
```

> Root config files map 1:1 to the build channels: `electron-builder*.json` are consumed by the
> `electron:dist` / `build:win` / `build:chromebook` scripts, `nginx.conf` is copied into the runner
> stage by the `Dockerfile`, and `capacitor.config.ts` drives the `cap:*` scripts. Per-channel
> behaviour: `agent_docs/platform_builds.md`.

## Feature Module Pattern

A `src/features/` module draws from the same four parts, but takes only the ones it needs — `youtube` is currently the only one with all four:

- `services/` — pure business logic
- `hooks/` — React-state composition
- `types.ts` — module-local types
- `index.ts` — barrel export (the public surface other modules import from, where one exists)

| Module      | `services/` | `hooks/` | `types.ts` | `index.ts` |
| ----------- | ----------- | -------- | ---------- | ---------- |
| `dashboard` | ✅          | ✅       | —          | ✅         |
| `favorites` | ✅          | —        | ✅         | ✅         |
| `search`    | —           | ✅       | —          | —          |
| `videos`    | ✅          | —        | ✅         | ✅         |
| `youtube`   | ✅          | ✅       | ✅         | ✅         |

`search` has no barrel, so `App.tsx` and `AnalyserPage.tsx` import `hooks/useSearch` directly. Every other cross-module import goes through the barrel.
