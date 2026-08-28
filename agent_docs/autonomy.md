# Autonomy — full wording

Offloaded from `CLAUDE.md` (2026-08-28) per `agent_docs/context_budget.md` ladder step 10. CLAUDE.md keeps the four
rules an agent must apply on every turn; this file carries the reasoning, the edge cases and the mode reference.

## Which session am I in?

`$CLAUDE_CODE_REMOTE` is `"true"` in Claude Code web/cloud sessions — routine runs included — and unset in the local
CLI. That makes the mode **resolvable with a tool the agent already has**, so it is a rule and not a guess. Never infer
the mode from "it feels like nobody is watching", from the absence of recent user messages, or from the task's wording.

## Unattended (`CLAUDE_CODE_REMOTE=true`, or the initial instructions are a routine)

Nobody is there to answer, and a routine run has **no permission prompts at all** — a session that "waits for approval"
waits forever and the whole run is wasted.

- **Never end a turn with a question.** Decide under an assumption you state in the report, finish every part that is
  not blocked, and carry the open point into the final report or `BACKLOG.md`.
- A blocked step is reported as blocked with the reason, not silently skipped and not retried indefinitely.
- The _Handoff Prompt_ block (CLAUDE.md) is **not** written in an unattended run — nobody is there to paste it, and the
  question it would follow is ruled out in the first place.

## Interactive (local CLI)

Asking is cheap and a wrong assumption is expensive.

- Ask when two readings of the task produce **materially different work** — different files, different scope, a
  different definition of done.
- Otherwise decide and mention the call in one clause, so the user can correct it without being asked to choose.
- A turn that hands the decision back carries one ready-to-send prompt: CLAUDE.md → _Handoff Prompt_.

## Report against evidence, not against intent

Before stating that something is done, tie the claim to a **tool result from this session** — a command's exit code, a
diff, a CI status, an MCP response.

- Unverified work is named as unverified. A skipped step is reported as skipped. A failing check is reported with its
  output, quoted verbatim.
- "Should work" and "the change is straightforward" are not evidence.
- This binds hardest in unattended runs, where the final report is the only thing anyone reads and there is nobody to
  notice an optimistic summary.

## Both modes — the destructive-action rule

An action that is **destructive** _and_ **not ordered** _and_ **not standard practice** gets the same answer in either
mode: skip it, put it in the report with the recommendation, and finish everything it does not block. Never guess at it,
and never "just try it and revert if wrong" — a revert is not free once something is pushed, published or deleted.

Each instance keeps its own gate — these are the single sources of truth, never relaxed here:

| Action                                                 | Gate                                     |
| ------------------------------------------------------ | ---------------------------------------- |
| Merging a PR                                           | `.claude/skills/pr/SKILL.md → /pr merge` |
| Reverting, resetting, force-pushing, deleting a branch | `.claude/skills/rollback/SKILL.md`       |
| Production deploys, tag pushes, releases               | `CLAUDE.md → Deployment`                 |
| Secrets (reading, writing, `gh secret set`)            | `agent_docs/env-vars.md`                 |

## Branch rule for cloud and routine runs

A `claude/`-prefixed branch is always accepted. A push to **any other** branch is rejected when the branch:

- is protected, **or**
- carries someone else's open PR, **or**
- holds commits authored by someone else.

Unattended work therefore starts on `claude/<topic>` unless the task explicitly names a branch. This is why the branch
name is decided before the first commit, not after the work is done.

## Mode reference

| Mode                  | How it is set                                                                              | Scope                               |
| --------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------- |
| Model                 | `/model` mid-session; never pinned in `.claude/settings.json`                              | that session                        |
| Fast (`/fast`)        | user command — same Opus model, faster output, not a downgrade                             | that session                        |
| Caveman               | default `full` every session; `caveman lite\|full\|ultra` switches, `stop caveman` ends it | that session, never carries forward |
| Orchestrator (`orca`) | default, width 5; `/orca <N>` changes width, `/orca off` drops to plain behavior           | that session only                   |
| Plan                  | `Plan` subagent or `EnterPlanMode` — non-trivial strategy only, not single-step tasks      | that turn                           |

Rules for each: CLAUDE.md → _Performance / Modes_, _Caveman Mode_, _Subagents_; contract for `orca`:
`.claude/skills/orca/SKILL.md`.
