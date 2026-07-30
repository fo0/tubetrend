# Coding Conventions & Architecture Notes — Detail

Offloaded from `CLAUDE.md` (2026-07-26) per `agent_docs/context_budget.md` ladder steps 7 + 9. CLAUDE.md keeps the ~8 essential bullets; the full set, the path-alias table and the project-specific architecture notes live here.

## Conventions

- **Language** — UI text uses i18n translation keys (`t('key')`). Code comments and documentation in English. No hardcoded German strings remain in the API layer.
- **Naming** — PascalCase for components and types; camelCase for functions, variables and hooks; kebab-case for CSS classes.
- **Files** — PascalCase for React components (`ThemeProvider.tsx`); camelCase for services, hooks and utils (`favoritesService.ts`, `useSearch.ts`).
- **Imports** — cross-module imports use the `@/src/…` alias; relative paths stay inside a module. Use `import type` for type-only imports. See the alias table below for what is configured vs. what is actually used.
- **Exports** — feature modules export through barrel files (`index.ts`). Never deep-import another feature's internals.
- **Components** — functional components with hooks. `ErrorBoundary` is the single exception (React requires a class for error boundaries).
- **Styling** — Tailwind CSS v4 utility classes with `dark:` variants via the `@tailwindcss/vite` plugin. No CSS modules, no styled-components.
- **State** — distributed via custom hooks + `localStorage`. React Context only for theme. No external state library.
- **Error handling** — try-catch with fallback values for storage; custom `YouTubeApiError` for API errors.
- **Max file length** — ~300 lines (split), ~500 lines (strongly recommended). TS/React convention.

## Path Aliases

Configured in **both** `tsconfig.json` and `vite.config.ts` — keep the two in sync when adding one.

| Alias          | Maps to             | Actually used                    |
| -------------- | ------------------- | -------------------------------- |
| `@/*`          | `./` (project root) | **Yes — the convention** (~132×) |
| `@features/*`  | `./src/features/*`  | No                               |
| `@shared/*`    | `./src/shared/*`    | Once (`ThemeProvider.tsx`)       |
| `@providers/*` | `./src/providers/*` | No                               |
| `@i18n/*`      | `./src/i18n/*`      | No                               |

**Write `@/src/shared/lib/storage`, not `@shared/lib/storage`.** Because `@/*` maps to the project root, the
directory-specific aliases are redundant — and the codebase settled on the `@/src/…` form almost everywhere.
The four short aliases still resolve, so existing code compiles, but new imports that use them read as
inconsistent next to their ~132 neighbours. Relative imports (`./`, `../`) remain correct **within** a single
feature or component folder; only cross-module hops take the alias.

## TubeTrend-specific architecture notes

These are deliberate choices, not oversights. Grep `docs/adr/` before contradicting one.

- **No router library** — simple state-based page switching (`activePage` state in `App.tsx`). Sufficient for a 2-page app; adding a router would be net negative here.
- **Tailwind via `@tailwindcss/vite`** — Tailwind CSS v4 as a Vite plugin, not PostCSS. Gives tree-shaking, offline capability and custom font bundling. Both `tailwind.config.js` and `postcss.config.js` were deleted in the v4 migration.
- **No external state library** — distributed hooks + event bus. Works well at the app's current complexity.
- **Trend scoring is pure math** — no external AI API. A comment in `trendAnalysisService.ts` confirms this is intentional.
- **Electron as an optional wrapper** — `vite-plugin-electron` is only active when `ELECTRON=true`. Web/Docker is the primary delivery method; desktop is additive.
