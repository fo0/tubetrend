# Backlog

Review findings not immediately fixed. **Only work on these upon explicit request.**

## Open

| # | Date | Category | Sev | Location | Finding | Status | Source |
|---|------|----------|-----|----------|---------|--------|--------|
| 1 | 2026-02-14 | Performance | P2 | src/main.tsx -> font imports | @fontsource/inter loads all unicode ranges (latin, cyrillic, greek, vietnamese). Could reduce to latin-only for smaller bundle. | Deferred | Electron setup + Tailwind bundling |
| 5 | 2026-02-15 | Code Smells | P2 | postcss.config.js | File contains only empty config after Tailwind v4 migration to @tailwindcss/vite. Could be deleted since no PostCSS plugins remain. | Deferred | Tailwind 3->4 migration (PR #13) |
| 6 | 2026-02-15 | Standards | P2 | package.json -> devDependencies | `postcss: ^8.5.8` may be unnecessary — Vite 7 bundles its own PostCSS, Tailwind v4 uses @tailwindcss/vite. Safe to remove but test first. | Deferred | Tailwind 3->4 migration (PR #13) |
| 7 | 2026-02-15 | Standards | P2 | package.json -> devDependencies | `@types/node: ^25.5.0` but runtime is Node 22. No actual issues (tsc passes), but mismatch could surface if code uses Node 25-only APIs. | Accepted | @types/node migration (PR #10) |
| 8 | 2026-02-15 | Performance | P2 | dist/ (build output) | CSS bundle increased from 56.45 KB to 76.98 KB (gzip) after Tailwind v4 migration. Expected — v4 includes more comprehensive base/reset styles. Net gzip impact: +0.6 KB total. | Accepted | Tailwind 3->4 + Vite 6->7 migration |
| 9 | 2026-04-25 | i18n | P2 | `src/shared/components/ui/ApiQuotaIndicator.tsx` -> `getOptimalTimeWindow` and `formatNumber` | Hardcoded German labels (`'30 Min.'`, `'1 Std.'`, `'3 Std.'`, `'6 Std.'`, `'12 Std.'`, `'24 Std.'`) and `'de-DE'` locale break i18n consistency for the 13 supported languages. Needs translation keys + locale-aware formatting. | Deferred | Round 3 polish — too broad to bundle |
| 10 | 2026-04-25 | i18n | P2 | `VideoCard.tsx`, `HighlightVideoCard.tsx`, `VideoListTable.tsx`, `HiddenHighlightsModal.tsx` -> `toLocaleString('de-DE')` | Direct `toLocaleString('de-DE')` calls in 5 components ignore active i18n language. Should route through `formatters.formatNumber` (now defaults to active locale) or use `useTranslation`/`getLocale`. | Deferred | Round 3 polish — touched only the formatter default; component-level cleanup separate |
| 11 | 2026-04-25 | Code Smells | P2 | `FavoriteRow.tsx` (~635 lines), `useDashboard.ts` -> raw `window.addEventListener` | Six raw `window.addEventListener` sites for typed bus events (`favorites-cache-updated`, `favorites-changed`, `favorite-refresh-start/end`, `hidden-highlights-changed`) bypass the `useEventBus` hook. Inconsistent with the rest of the app and miss type-safety. | Deferred | Round 3 polish — refactor depth |
| 12 | 2026-04-25 | Performance | P3 | `src/features/youtube/services/channelService.ts:320` -> `Math.max(effectiveMax, 50)` | Over-fetches up to 50 videos to give the post-filter (shorts removal) headroom. Wastes API quota when `effectiveMax < 50`. Likely intentional safety margin but unhandled when explicit `effectiveMax` is small. Document or make adaptive. | Deferred | Pre-existing — comment-only fix |

## Done

| # | Date | Done | Category | Location | Finding |
|---|------|------|----------|----------|---------|
| 2 | 2026-02-14 | 2026-02-14 | Security | index.html -> import map | Pre-existing import map references aistudiocdn.com CDN incl. unused @google/genai. Removed in vite-plugin-electron migration. |
| 3 | 2026-02-15 | 2026-04-03 | Readability | CLAUDE.md -> Tech Stack table | 13+ stale version/config references after dependency migrations. Fixed: all versions updated, Tailwind v4 architecture corrected. |
| 4 | 2026-02-15 | 2026-05-16 | Readability | README.md -> Tech stack section | Tech stack line said "Vite 6 \| Tailwind CSS" — corrected to "Vite 7 \| Tailwind CSS 4". |
