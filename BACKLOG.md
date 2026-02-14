# Backlog

Open review findings that were not immediately fixed.

**Only work on these upon explicit request!**

## Open

| # | Date | Category | File:Line | Finding | Severity | Status | Source |
|---|------|----------|-----------|---------|----------|--------|--------|
| 1 | 2026-02-14 | Performance | src/main.tsx:3-7 | @fontsource/inter loads all unicode ranges (latin, cyrillic, greek, vietnamese). Could reduce to latin-only for smaller bundle. | Low | Deferred | Electron setup + Tailwind bundling |

## Done

| # | Date | Done at | Category | File:Line | Finding | Severity |
|---|------|---------|----------|-----------|---------|----------|
| 2 | 2026-02-14 | 2026-02-14 | Security | index.html:25-35 | Pre-existing import map references `aistudiocdn.com` CDN incl. unused `@google/genai`. Removed in vite-plugin-electron migration. | Low |
