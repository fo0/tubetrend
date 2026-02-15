# Backlog

Open review findings that were not immediately fixed.

**Only work on these upon explicit request!**

## Open

| # | Date | Category | File:Line | Finding | Severity | Status | Source |
|---|------|----------|-----------|---------|----------|--------|--------|
| 1 | 2026-02-14 | Performance | src/main.tsx:3-7 | @fontsource/inter loads all unicode ranges (latin, cyrillic, greek, vietnamese). Could reduce to latin-only for smaller bundle. | Low | Deferred | Electron setup + Tailwind bundling |
| 3 | 2026-02-15 | Readability | CLAUDE.md (multiple) | 13+ stale version/config references after dependency migrations. Details: Tech Stack table (lines ~231-243) has old versions for TypeScript (~5.8.2→~5.9.3), Vite (^6.2.0→^7.3.1), Tailwind (^3.4→^4.1.18, now via `@tailwindcss/vite` not PostCSS), Autoprefixer (removed), Lucide (^0.554→^0.564), i18next (^23→^25), react-i18next (^15→^16), i18next-browser-languagedetector (^7→^8), vite-plugin-electron (^0.28→^0.29), Electron (^35→^40). Project structure tree (line ~317) lists `tailwind.config.js` but file was deleted. `postcss.config.js` description says "Tailwind + Autoprefixer" but plugins are now empty. Architecture section (line ~501) says "Tailwind via PostCSS" but is now "@tailwindcss/vite". | Medium | Deferred | Dependency migration PRs #1-#14 |
| 4 | 2026-02-15 | Readability | README.md:~104 | Tech stack line says "Vite 6 \| Tailwind CSS" — should be "Vite 7 \| Tailwind CSS 4". | Low | Deferred | Dependency migration PRs #1-#14 |
| 5 | 2026-02-15 | Code Smells | postcss.config.js | File now contains only `export default { plugins: {} }` — empty config after Tailwind v4 migration to @tailwindcss/vite. Could be deleted entirely since no PostCSS plugins remain. Vite uses its own internal PostCSS. Keep only if future PostCSS plugins are planned. | Low | Deferred | Tailwind 3→4 migration (PR #13) |
| 6 | 2026-02-15 | Standards | package.json:53 | `postcss: ^8.5.6` in devDependencies may be unnecessary — Vite 7 bundles its own PostCSS, and Tailwind v4 uses @tailwindcss/vite instead of the PostCSS plugin. However, removing it could break if any tooling implicitly depends on it. Safe to remove but test first. | Low | Deferred | Tailwind 3→4 migration (PR #13) |
| 7 | 2026-02-15 | Standards | package.json:47 | `@types/node: ^25.2.3` but project runtime is Node 22 (Dockerfile, CI). @types/node v25 includes types for Node 25 APIs not available in Node 22 runtime. No actual issues found (tsc passes cleanly), but mismatch could surface if code accidentally uses Node 25-only APIs. Consider pinning to `^22.x` to match runtime, or accept the mismatch since this is a frontend project with minimal Node API usage. | Low | Accepted | @types/node migration (PR #10) |
| 8 | 2026-02-15 | Performance | dist/ (build output) | CSS bundle increased from 56.45 KB (gzip 9.64 KB) to 76.98 KB (gzip 12.27 KB) after Tailwind v4 migration. Expected — Tailwind v4 includes more comprehensive base/reset styles. JS bundle decreased 393→378 KB thanks to Vite 7. Net gzip impact: +2.6 KB CSS, -2 KB JS ≈ +0.6 KB total. Not actionable unless bundle size becomes critical. | Info | Accepted | Tailwind 3→4 + Vite 6→7 migration |

## Done

| # | Date | Done at | Category | File:Line | Finding | Severity |
|---|------|---------|----------|-----------|---------|----------|
| 2 | 2026-02-14 | 2026-02-14 | Security | index.html:25-35 | Pre-existing import map references `aistudiocdn.com` CDN incl. unused `@google/genai`. Removed in vite-plugin-electron migration. | Low |
