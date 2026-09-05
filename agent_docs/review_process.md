# Review Process

This file defines the review process. **It runs on demand only**, via `.claude/skills/review/SKILL.md` (`/review`, "review this"). The done-skill does NOT auto-run it — see CLAUDE.md → Workflow Triggers. Everything below describes how a review executes once it has been invoked.

## Core Rules

1. **A review covers all categories** — once invoked, no category is skipped because it "looks fine".
2. **Never commit with unfixed P0/P1 findings** — if a review ran, its P0/P1 findings are fixed (or explicitly deferred with reasoning in BACKLOG.md) before the commit.
3. **Deterministic checks run first** — linter/types/tests catch what they catch. The review covers what tools cannot.
4. **Fix, don't list** — when a finding is actionable, fix it immediately. Don't just document it.
5. **Re-review after fixes** — if fixes touched code, re-run automated checks and re-review affected categories only.

## TODO Structure

When a review is invoked, its TODO list contains these steps:

```
1. Run automated checks (see Automated Checks)
2. CODE-REVIEW (see Review Categories)                     <- SEPARATE TODO!
3. Auto-fix findings (P0/P1 immediately, P2 by judgment)
4. Unfixed findings (Accepted/Deferred) -> BACKLOG.md      <- SEPARATE TODO!
5. UI review (if UI was changed)                           <- SEPARATE TODO!
```

**Rules:**

- Step 1 and Step 2 are SEPARATE TODOs — NEVER combine them
- When issues are found: **Fix immediately** -> re-run checks -> repeat review until clean
- Committing is the done-skill's job (`.claude/skills/done/SKILL.md`), not the review's

## Severity Definitions

Severity is based on impact, not category:

| Severity              | Definition                                                 | Examples                                                                                                        |
| --------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **P0 — Critical**     | Can cause data loss, security breach, or production crash  | SQL injection, unvalidated user input to exec(), missing auth checks on write endpoints, null deref in hot path |
| **P1 — Important**    | Functionally incorrect, poor DX, or fast-growing tech debt | Wrong error handling, missing edge cases, unsafe type casts, deprecated APIs                                    |
| **P2 — Nice-to-have** | Code smells, performance optimizations, style improvements | Duplicated code, missing memoization, magic numbers, long parameter lists                                       |

## Workflow

```
Run automated checks -> Fix failures ->
Code Review (all categories) -> Fix P0/P1 -> Re-check if needed ->
Regression & Complexity QA ->
Unresolved findings -> BACKLOG.md ->
Learnings/context -> MEMORY.md / SCRATCHPAD.md ->
UI Review (if UI changed)
```

### Error Recovery

- **Automated checks fail and fix is unclear:** Document the failure, inform the user, do NOT commit. Suggest possible causes.
- **Review finds issue outside current scope:** Log to BACKLOG.md with context, do not fix unless trivial.
- **Circular fix loop (fix breaks something else):** After 2nd iteration -> inform user. After 3rd -> invoke `.claude/skills/stuck/SKILL.md` — the 4th attempt without user input is forbidden.

## Automated Checks

Canonical command list + order: **CLAUDE.md → Commands** (`format` write first, then `format:check` → `typecheck` → `lint` → `build`). Run them before the review; `npm ci` first if dependencies are missing. No test runner is configured, so those four commands are the whole gate — but a linter **is** configured: ESLint 9 (`eslint.config.js`, added in #376) runs as a hard step in `pr-checks.yml`. Its rule errors gate; `react-refresh/only-export-components` warnings do not (BACKLOG #14).

### Test execution constraints (autonomy + zero-cost)

Apps in this workspace are built and verified by AI agents end-to-end. Tests must therefore be:

- **Agent-runnable without setup** — no manual env-var injection, no credentials prompt, no interactive login.
- **Zero-cost** — no real YouTube API calls (would burn user quota), no real cloud resources, no production data writes.
- **Deterministic** — fake clocks, fake random, in-memory storage adapters, mocked event bus, mocked YouTube API client.
- **Self-contained** — runnable on every change as part of the standard test command.

External boundaries (YouTube API, localStorage, event bus) → always mock or use ephemeral in-memory fakes. Real-service smoke/E2E tests only on explicit user request, never as default automated check.

## Review Scope

### Default: Diff-based review

- Review is based on changed files (diff).
- Only changed and directly affected files are read.

### GitNexus-enhanced review (if available — read-only)

- Use `gitnexus_impact` on changed functions to identify affected downstream code beyond the diff.
- Use `gitnexus_detect_changes` after fixes to verify change scope matches expectations.
- GitNexus is read-only here: never let it edit files or regenerate skills/docs (Read-Only Analysis Policy: `agent_docs/gitnexus.md`, mirrored in `AGENTS.md`).

### Full-read review (when needed)

- New files are always read completely.
- Security-critical changes: also check adjacent files.
- On explicit user request.

### Large-scale changes (>30 changed files)

- Group by change type (refactoring, feature, config etc.).
- P0 categories for all files.
- P1/P2 only for feature-relevant files, rest by sampling.
- If GitNexus available: use `gitnexus_impact` to prioritize files by downstream dependency count.

## Review Categories

Ordered by priority.

Eight categories, fixed numbering — the report table indexes into them, so the set and the order do not change. What counts as a finding inside a category is current engineering knowledge applied to this stack (React 19 / TypeScript strict / Vite), not a list maintained here; the **scope line** is what fixes the boundary between neighbouring categories.

### P0 — Critical (always fix immediately)

| #   | Category                | Scope — where this category starts and stops                                                                                                                                  |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Security**            | Anything an attacker could reach: untrusted input crossing a trust boundary, authn/authz, secrets, unsafe execution, crypto misuse. Deeper audit: the `security-review` skill |
| 2   | **Bugs & Logic Errors** | Code that is wrong for inputs it is _meant_ to handle — control flow, state, concurrency, resource lifetime, unhandled failure at boundaries                                  |

### P1 — Important (fix by default, defer only if disproportionate effort)

| #   | Category                    | Scope — where this category starts and stops                                                                                                                            |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3   | **Edge Cases**              | Code that is wrong for inputs it is _not_ meant to handle — empty, absent, boundary, malformed, concurrent, slow, failing                                               |
| 4   | **Typing & Type Safety**    | Whether the type system is actually carrying its weight: honest signatures, no escape hatches without a reason, exhaustiveness where the language offers it             |
| 5   | **Modern Coding Standards** | Idiom and currency for _this_ project's stack and version — including APIs deprecated since the code was written. Judge against what is current now, not against a list |

### P2 — Contextual (review when relevant, defer freely)

| #   | Category                          | Scope — where this category starts and stops                                                                                                                                  |
| --- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | **Code Smells**                   | Structure that will cost the next change: duplication, dead weight, oversized units, coupling                                                                                 |
| 7   | **Performance**                   | Cost that scales the wrong way — per-item work that should be batched, repeated work that should be cached, unbounded growth. Measured or clearly reasoned, never speculative |
| 8   | **Readability & Maintainability** | Whether the next agent can follow it: naming, organization, and comments where the _why_ is not in the code                                                                   |

## Pre-Report Gate

The category tables decide _what_ is worth looking for. This gate decides what is worth **reporting** — and it applies to every finding, in every category, P0 included.

A review whose findings are half taste and half guesswork is worse than no review: the reader stops trusting the table, and the two real defects in it are read as fast as the eleven opinions. So each candidate finding answers all four questions before it gets a row. **Any "no" or "not sure" drops it, or downgrades it one severity.**

| #   | Question                                                                            | Why it disqualifies                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Can I name file and line?**                                                       | A finding that cannot be located cannot be acted on. "Somewhere in the search feature" is a hunch with a category attached                                        |
| 2   | **Can I state the concrete failure — this input, this state, this wrong outcome?**  | If the trigger cannot be named, the pattern was matched, not the code. This is the question that separates a bug from a resemblance to one                        |
| 3   | **Did I read the surrounding context — callers, imports, the hooks it runs under?** | Most apparent defects are already handled one frame up or made impossible by a type. Reporting without looking spends the author's time to save the reviewer's    |
| 4   | **Is it in the diff?**                                                              | Findings in untouched code are out of scope — **except at P0**, which is reported wherever it is found. Everything else goes to `BACKLOG.md` instead of the table |

Two more rules that keep the table readable:

- **Confidence floor: report at ~80% or better.** Below that, either look until you are above it or leave it out. A maybe-finding costs a real investigation and returns nothing.
- **Consolidate by cause, not by occurrence.** Twelve call sites missing the same guard are **one** finding with a count and one representative location — never twelve rows. Twelve rows hide the single fix behind twelve decisions.

Taste is not a finding. A different-but-equivalent way to write something is only reportable when it violates a convention this project has actually written down (`CLAUDE.md` → _Coding Conventions_, `agent_docs/coding_conventions.md`); otherwise it is the reviewer's preference wearing a severity.

**The gate is reported, not silent.** The summary line names how many candidates it dropped — that number is the evidence the filter ran, and a review that drops nothing across a large diff is a filter that was skipped, not a clean diff.

## Review Execution

1. **Re-read every changed file** with the Read tool — completely, not from memory. New files in full.
2. Evaluate each file against all categories (P0 first, then P1, then P2 where relevant).
3. **Run every candidate finding through the Pre-Report Gate** — before fixing anything. A finding that does not survive it is not worth a fix either, and fixing first is how the gate gets skipped in practice.
4. Fix findings inline where possible.
5. Present results:

```
### Code Review Results

| # | Category | Sev | Status | Finding | Action |
|---|----------|-----|--------|---------|--------|
| 1 | Security | P0 | ✅ Pass | — | — |
| 2 | Bugs & Logic | P0 | ⚠️ Fixed | Unvalidated input in X | Added validation |
| 3 | Edge Cases | P1 | ✅ Pass | — | — |
| ... | ... | ... | ... | ... | ... |

Summary: X categories checked | Y fixed | Z deferred -> Backlog | N dropped at the Pre-Report Gate
```

**Status:** ✅ Pass | ⚠️ Fixed | ❌ Blocked (needs user input) | 💡 Deferred -> Backlog

## Fixing Rules

| Severity    | Action                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------ |
| P0 findings | Fix immediately, always                                                                          |
| P1 findings | Fix by default. Defer only if effort is clearly disproportionate — document reasoning in Backlog |
| P2 findings | Fix if trivial (<5 min). Otherwise defer to Backlog                                              |

## Regression & Complexity QA

After all review fixes are applied, re-read the full implementation one more time:

| Check                      | What to look for                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| **Regressions**            | Did a fix break existing behavior? Changed return values, removed fallbacks, altered control flow? |
| **Unnecessary complexity** | Did the implementation add indirection or branching that isn't needed?                             |
| **Consistency**            | Do the changes fit the patterns in surrounding code?                                               |

Rules:

- Re-read every changed file again (not from memory).
- If this pass finds issues, fix them and re-run automated checks. Do NOT loop more than once.

## UI Review (only when UI code changed)

Three axes, in this priority order: **accessibility** → **responsiveness** → **consistency with the project's existing patterns** (Tailwind v4 design system, `dark:` variants, Inter font). Apply current standards for each; findings take the severity the definitions above give them (an unreachable control is a bug, not a nit).

## Subagent Delegation

**Delegation is the default, not a decision per task** — orchestrator mode is on from session start (`CLAUDE.md → Subagents`, contract in `.claude/skills/orca/SKILL.md`), so every unit of task work goes to a subagent at width 5. Where the surface allows it, **run them asynchronously and keep working** — spawn-and-block gives up most of the benefit — and step in when one goes off track or is missing context it cannot discover.

**The review itself is delegated, and to a different agent than wrote the code.** A fresh-context reviewer reads the diff without holding the author's intent, which is why it finds what self-critique does not; the author re-reading its own work verifies what it meant, not what it wrote. Where a change can fail in more than one way, seat _distinct_ lenses from the roster (`architect`, `domain`, `security`, `docs`) rather than a second reviewer with the same one — agreement between identical lenses is not evidence of correctness. The orchestrator still owns the process: it reads the returned diffs, decides what the findings mean, and holds the commit gate.

| Task                                                      | Matching `subagent_type`                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Locate code / find symbols**                            | `Explore` (read-only, fast, doesn't pollute main context)                    |
| **Design an approach**                                    | `Plan`                                                                       |
| **Write tests · docs · refactoring chunks · boilerplate** | `general-purpose`                                                            |
| **Independent code review**                               | `general-purpose`, or a project-specific reviewer subagent if one is defined |
| **Q about Claude Code/SDK/API**                           | `claude-code-guide`                                                          |

### The role roster — which change earns which seat

Offloaded from `CLAUDE.md → Subagents` (2026-08-28) per `agent_docs/context_budget.md` ladder step 10. CLAUDE.md keeps
the orchestrator default, the width and the role names; the seating conditions live here. The role is _how the
assignment is framed_, not a separate mechanism: it goes to a `general-purpose` subagent whose brief names the lens, the
standard it answers to, and what its return must contain. Closed vocabulary — the wave report names the role it used, so
two runs over the same work stay comparable.

| Role          | Lens it applies                                        | Earns a seat when                                   |
| ------------- | ------------------------------------------------------ | --------------------------------------------------- |
| `implementer` | the change itself, in this repo's idiom                | always, for any code change                         |
| `reviewer`    | correctness of the diff, against a fresh reading       | any code change — **never the agent that wrote it** |
| `architect`   | structural fit, boundaries, what this makes hard later | the change adds, moves or crosses a boundary        |
| `domain`      | whether this matches how the subject actually works    | it encodes a domain or business rule                |
| `product`     | is this what was asked, is the scope right             | the request is ambiguous or scope could drift       |
| `docs`        | what a reader needs that the diff does not say         | a documented interface or contract changes          |
| `security`    | trust boundaries, untrusted input, secrets             | it touches any of them → `security-review` skill    |

**Roles are lenses, not a standing panel.** Seat the ones the change actually calls for — a typo fix needs
`implementer` and `reviewer`, a new integration may need five. Never seat two agents with the same lens hoping agreement
means correctness; distinct lenses catch failure modes that redundancy cannot.

## Subagent Selection Rules

- **Use `Explore` for read-only search.** Specify breadth: `quick` / `medium` / `very thorough`. Do NOT use for code review — it reads excerpts, will miss content past its window.
- **Use `Plan` before non-trivial implementation.** Then act on the plan in main thread, or hand the plan to `general-purpose`.
- **Use `general-purpose` for write+execute** tasks. Default for "do this work" delegations.
- **Use `claude-code-guide` for tooling questions** about Claude Code itself.
- **Parallelize independent work** — multiple Agent calls in one message when no dependencies exist.
- **Orchestrator mode changes what "known target" means.** Reading a file for its content is task work and goes to a subagent like anything else; the orchestrator's own reads are the _verification_ kind — `git status`, `git diff`, reading a returned change. `/orca off` is what restores direct-tool-first behavior, not a judgment per call.
- **Pass full context** — subagents have no conversation history.
- **Trust but verify** — inspect diffs after write-capable subagents finish.

The main agent retains responsibility for the review process itself.

## Commit Gate

Only commit when:

- [ ] All automated checks pass
- [ ] All P0/P1 findings are fixed (or explicitly deferred with reasoning)
- [ ] Deferred findings are logged in BACKLOG.md
- [ ] Learnings/context captured in MEMORY.md or SCRATCHPAD.md (if applicable)
- [ ] Documentation updated if needed
- [ ] Commit message follows Conventional Commits
- [ ] UI review done (if UI changed)
- [ ] (If GitNexus available) `gitnexus_detect_changes()` confirmed scope

<!-- Generated by claude-code-optimizer v1.37.0 -->
