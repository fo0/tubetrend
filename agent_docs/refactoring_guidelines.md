# Refactoring Guidelines

Refactoring does NOT happen automatically. Only when:

- Explicit user request
- Repeated code smells across multiple files in review
- Feature implementation is significantly hindered by code structure

## Principles

1. **No over-engineering** — Only refactor what provides measurable benefit
2. **AI-optimized structure** — Code is primarily maintained by AI agents:
   - Explicit > implicit (easier for AI to parse)
   - Focused files: >300 lines -> evaluate split, >500 lines -> split strongly recommended
   - Descriptive names > clever abstractions
   - Consistent patterns across similar components (AI can pattern-match)
   - Inline comments for non-obvious decisions (AI has no project history context)
3. **Follow framework idioms** — Use current React 19 + TypeScript best practices, no custom abstractions
4. **Incremental** — Small chunks, each goes through the full review cycle
5. **Extract, don't abstract** — Prefer extracting into focused files over building abstract base classes
6. **Verify** — Every refactoring step must pass all automated checks before the next one begins

## Known Refactoring Targets

- **`FavoriteRow.tsx` (~670 lines)** — God component handling data fetching, caching, UI menus, state management, and event handling. Should be split into sub-components (`FavoriteRowHeader`, `FavoriteRowMenus`, `FavoriteRowVideos`) and a custom `useFavoriteRowData()` hook.
- **Duplicate event listener patterns** — Multiple components use raw `window.addEventListener('favorites-changed', ...)` instead of the type-safe `useEventBus()` hook from `eventBus.ts`. Should be migrated consistently.
- **Hard-coded German strings in API client** — `youtubeApiClient.ts` contains German error messages instead of i18n translation keys. Should use `t()` or throw error codes that the UI translates.
- **Magic numbers in trend analysis** — `trendAnalysisService.ts` uses hardcoded thresholds (e.g., `viewsPerHour > 10000`, `engagementRate > 10`, `ageInHours < 2`) and scoring weights (`0.7`, `0.3`). Should be extracted to named constants.
- **Module-level API key state** — `youtubeApiClient.ts` stores the API key both in a module-level variable and localStorage, risking sync issues. Could be simplified to read from storage directly.
- **No test coverage** — No test setup exists. Critical services (`favoritesService`, `trendAnalysisService`, `quotaService`, `eventBus`) would benefit from unit tests.
- **Complex `useEffect` chains in FavoriteRow** — Multiple interdependent `useEffect` hooks with complex dependency arrays and refs for synchronization. Should be extracted into a custom hook.

## GitNexus-Assisted Refactoring (read-only analysis)

When GitNexus is available, use it to *plan and verify* refactors — **read-only**. GitNexus never edits files; you make the edits with normal tools. (See the Read-Only Analysis Policy in CLAUDE.md.)

1. **Before refactoring:** `gitnexus_impact` to map the blast radius
2. **For renames:** `gitnexus_impact` + `gitnexus_context` to enumerate every reference, then edit them yourself — never `gitnexus_rename` (it writes files)
3. **After refactoring:** `gitnexus_detect_changes` to verify only expected files changed
4. **For extraction:** `gitnexus_context` to understand all incoming/outgoing references

See `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` for detailed read-only workflows.
