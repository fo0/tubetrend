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
├── .junie/                           # JetBrains Junie agent guidelines
├── capacitor.config.ts               # Capacitor config
├── vite.config.ts                    # Vite config
├── tsconfig.json                     # TypeScript strict config with path aliases
├── Dockerfile / docker-compose.yml   # Container build + run
└── README.md / CONTRIBUTING.md / SECURITY.md / LICENSE
```

## Feature Module Pattern

Each `src/features/` module follows the same internal layout:

- `services/` — pure business logic
- `hooks/` — React-state composition
- `types.ts` — module-local types
- `index.ts` — barrel export (the only public surface other modules import from)
