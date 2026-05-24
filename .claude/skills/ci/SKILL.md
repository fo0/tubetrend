---
name: ci
description: "Use when the user wants CI status, failed-job logs, or help fixing a red build. Triggered by /ci, 'CI status', 'check the build', 'fix CI', 'why is CI failing', 'look at the build'. Auto-routes by state: status / logs / fix-proposal. Reads logs locally — never re-triggers builds without explicit user command."
---

# CI — Continuous Integration Workflow

## When to Use

- After `git push` when CI may be running
- User says "/ci", "CI status", "check the build", "fix CI", "why is CI red", "look at the build"
- Triaging a failing branch / PR before merging

## Prerequisites

```bash
gh auth status && gh repo view --json name,owner
```

If `gh` is missing or unauthenticated → print install/login instructions, stop. CI providers other than GitHub Actions: see "Other CI Providers" at the bottom.

## Project CI Workflows

TubeTrend uses these GitHub Actions workflows (per `.github/workflows/`):

- `pr-checks.yml` — typecheck, build, lint, security audit on every PR
- `docker-publish.yml` — Docker image to ghcr.io on main push
- `electron-release.yml` — Electron Win/Mac/Linux + Chromebook .deb + Android APK + Chrome Extension on tag
- `android-release.yml` — Android APK artifact on main push
- `extension-release.yml` — Chrome Extension ZIP artifact on main push

## Auto-Routing (default `/ci`)

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
HEAD_SHA=$(git rev-parse HEAD)
RUNS=$(gh run list --branch "$BRANCH" --limit 5 --json databaseId,status,conclusion,headSha,name,workflowName)
```

Decision matrix:

| State                                            | Action                             |
| ------------------------------------------------ | ---------------------------------- |
| No runs found for branch                         | Phase A — report "no CI runs yet"  |
| Latest run still `in_progress` / `queued`        | Phase B — show running status      |
| Latest run `success`                             | Phase C — green report             |
| Latest run `failure` / `cancelled` / `timed_out` | Phase D — fetch logs + propose fix |
| Latest run is for `headSha != HEAD_SHA` (stale)  | Phase E — note stale               |

Print detected phase before acting:

```
Detected: latest CI run failed (run #123, workflow "pr-checks"). Fetching failed-job logs.
```

## Phase A — No runs

```
No CI runs found for branch <branch>. Possible reasons:
- Branch not yet pushed → git push -u origin <branch>
- Workflow not configured for this branch → check .github/workflows/*.yml
- Workflow disabled → gh workflow list
```

## Phase B — In progress

```bash
gh run watch <run-id> --exit-status   # only if user opted into wait
gh run view <run-id>                  # default (no waiting)
```

Report:

```
🟡 Run #<id> "<workflow>" in progress — <N>/<M> jobs done.
URL: <url>
```

## Phase C — Green

```bash
gh run view <run-id> --json conclusion,createdAt,updatedAt,workflowName
```

Report:

```
🟢 Run #<id> "<workflow>" passed (<duration>).
URL: <url>
```

## Phase D — Failed

1. **Identify failed jobs:**
   ```bash
   gh run view <run-id> --json jobs --jq '.jobs[] | select(.conclusion == "failure") | {name, databaseId, conclusion}'
   ```
2. **Fetch failed-step logs only:**
   ```bash
   gh run view <run-id> --log-failed
   ```
3. **Classify failure** by signal in the log:
   - `npm ERR!` / `npm ci` errors → build/install error
   - `tsc` errors → type error
   - eslint patterns → lint failure
   - `FAIL` / test runner patterns → test failure
   - timeouts, OOM, runner shutdown → infra failure (NOT a code defect)
4. **Propose fix:**
   - Code defect → propose minimal patch, apply only on user confirm
   - Infra failure → propose `gh run rerun <run-id> --failed`. **Never auto-rerun.**
   - Flaky test → log to BACKLOG.md as P1, do NOT silently retry
5. **Verify fix locally** before any push (`npm ci && npm run typecheck && npm run build`).

Report:

```
🔴 Run #<id> "<workflow>" failed.
Failed job: <name>
Failure type: <build | lint | test | type | infra>
Root cause: <one sentence>
Proposed fix: <patch summary OR "rerun (infra issue)">
Local verification: <results>
URL: <url>
```

## Phase E — Stale run

```
Latest CI run was for <stale-sha> (now HEAD is <head-sha>). Push and wait for fresh run, or use /ci --include-stale to inspect old runs.
```

## Explicit Sub-Commands

| Command         | Behavior                                                       |
| --------------- | -------------------------------------------------------------- |
| `/ci` (default) | Auto-route per matrix above                                    |
| `/ci status`    | Force Phase B/C report, no log fetching                        |
| `/ci logs`      | Force Phase D log fetch even if green                          |
| `/ci fix`       | Force Phase D fix workflow                                     |
| `/ci rerun`     | Confirm-then-`gh run rerun --failed` for the latest failed run |

## Hard Rules

- **Never `gh run rerun` without explicit user confirmation.**
- **Never propose a fix without reading the actual failed-step log.**
- **Always verify locally** before pushing a CI fix.
- **Infra failures are NOT code defects.** Don't apply code changes for runner timeouts, network blips, or OOM kills.
- **Flaky tests go to BACKLOG.md, not silent retry.**

## Other CI Providers (informational)

This skill targets GitHub Actions via `gh`. Not used in this project. If the project ever moves: print fallback note and let user inspect provider UI.

<!-- Generated by claude-code-optimizer v1.8.0 -->
