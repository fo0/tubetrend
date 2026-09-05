# GitNexus — Read-Only Analysis Policy & Code Intelligence

Offloaded from `CLAUDE.md` (2026-07-26) per `agent_docs/context_budget.md` ladder step 10. The policy below is **non-negotiable and unchanged** — only its location moved, so CLAUDE.md stays inside its per-turn context budget. CLAUDE.md carries a one-line pointer here; `AGENTS.md` still mirrors the policy verbatim.

Read this file whenever a GitNexus tool or the `npx gitnexus` CLI comes up.

## GitNexus — Read-Only Analysis Policy (non-negotiable)

GitNexus is an **analysis/read-only** tool. It must never write to the repository.

- **Allowed:** read-only MCP tools only — `gitnexus_query`, `gitnexus_impact`,
  `gitnexus_context`, `gitnexus_detect_changes`, and `status`/`list`. Use these to
  understand code, assess blast radius, and navigate. They never modify files.
- **Forbidden:** creating, scaffolding, regenerating, or editing ANY file as a side
  effect of GitNexus — in particular `.claude/skills/**` (including GitNexus's own
  `gitnexus/*` skill files), `CLAUDE.md`, `AGENTS.md`, `docs/wiki/**`, or anything else.
- **`gitnexus analyze` / `index`:** only run when the index is genuinely missing or
  stale AND it is required for the current task. When you do, pass `--skip-agents-md`
  and treat it as index-only: it must NOT touch tracked files. If it modifies
  `.claude/skills/**`, `CLAUDE.md`, `AGENTS.md`, or any other tracked file, **revert
  those changes immediately** (`git checkout -- <paths>`). The index itself
  (`.gitnexus/`) stays gitignored and uncommitted.
- **Never** include GitNexus-generated skill/doc edits in a commit or PR. They are out
  of scope for every task unless I explicitly ask for them.
- **Pre-commit guard:** before any commit, run `git status` and verify no unexpected
  `.claude/**`, `CLAUDE.md`, `AGENTS.md`, or agent-doc changes are staged. If there
  are and they weren't the point of the task, revert them and proceed.

## Commands (read-only)

```bash
npx gitnexus status   # Check index freshness (read-only)
npx gitnexus list     # List indexed repos (read-only)
# Index rebuild is NOT routine. Run only if `status` reports the index missing/stale
# AND the task needs it. Treat it as index-only, then revert any tracked file it touched:
#   npx gitnexus analyze --skip-agents-md && git status
#   git checkout -- <any .claude/**, CLAUDE.md, AGENTS.md it changed>
```

<!-- gitnexus:start -->

# GitNexus — Code Intelligence

This project is indexed by GitNexus as **tubetrend** (stats: unknown — run `npx gitnexus status` to populate). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> **Read-only.** Every tool below only _reads_ the index — none modify files. The Read-Only Analysis Policy above governs this block.
> Rebuilding the index is **not routine**: only run `npx gitnexus analyze --skip-agents-md` when the task genuinely needs a fresh index, treat it as index-only, then `git status` and `git checkout --` any tracked file it touched. (`status`/`index`/`list` never write tracked files; `analyze` can, which is why the flag + revert are mandatory.)
> If `gitnexus_query` returns empty for a known symbol, the local index may not be in the global registry — `npx gitnexus index .` registers it (writes only `~/.gitnexus`, no tracked files).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER use GitNexus to write or modify files — no `gitnexus_rename`, no `wiki`, no skill/doc generation. GitNexus is read-only. To rename, use `gitnexus_impact` / `gitnexus_context` to enumerate every reference, then edit them yourself with normal tools.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.
- NEVER run `npx gitnexus analyze` without `--skip-agents-md`, and NEVER commit any file a GitNexus command touched — `git checkout --` them. GitNexus must never rewrite `.claude/**`, `CLAUDE.md`, `AGENTS.md`, or `docs/wiki/**`.

## Resources

| Resource                                   | Use for                                  |
| ------------------------------------------ | ---------------------------------------- |
| `gitnexus://repo/tubetrend/context`        | Codebase overview, check index freshness |
| `gitnexus://repo/tubetrend/clusters`       | All functional areas                     |
| `gitnexus://repo/tubetrend/processes`      | All execution flows                      |
| `gitnexus://repo/tubetrend/process/{name}` | Step-by-step execution trace             |

## Skill Files

| Task                                                                      | Read this skill file                                        |
| ------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Understand architecture / "How does X work?"                              | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md`       |
| Blast radius / "What breaks if I change X?"                               | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?"                                          | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md`       |
| Plan a refactor — read-only impact / reference mapping (you do the edits) | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md`     |
| Tools, resources, schema reference                                        | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md`           |
| Index status / list / register (read-only CLI)                            | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md`             |

<!-- gitnexus:end -->

<!-- Generated by claude-code-optimizer v1.37.0 -->
