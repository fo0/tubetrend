# MCP Catalog

This file documents:

1. **Common MCPs** the agent may encounter in any Claude Code environment.
2. **This project's intended MCPs** — declared by the user, not detected from the host.

> **Cross-machine rule:** the optimizer never auto-detects which MCPs are installed locally. The catalog reflects intent + reference, not host probe. If a listed MCP isn't installed on the current machine, the agent silently falls back to non-MCP equivalents (Read / Bash / WebFetch / etc.) and notes once: `MCP <name> not available locally — falling back to standard tools.`

## Project MCPs (intended for this project)

> Edit this list when adding/removing MCP integrations from the project. The optimizer preserves user edits on re-run.

| MCP        | Purpose in this project                                                                           | Notes                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `gitnexus` | Code intelligence — symbol graph, impact analysis, safe refactor on the TypeScript/React codebase | Skills in `.claude/skills/gitnexus/`. Optional — workflows must work without it. |
| `github`   | Issue / PR / repo metadata via API (alternative to `gh` CLI)                                      | Useful when running in environments without `gh` installed (CI, sandboxes).      |
| `beacon`   | Dependency compatibility verdicts (`compat_*`) before a version bump; repo onboarded in #334      | Drives `.claude/skills/beacon/SKILL.md`. Optional — skip the skill when absent.  |

## Common MCPs (reference — not necessarily used here)

| MCP                             | Typical use                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gitnexus`                      | Code intelligence — symbol graph, impact, refactor (manifest-driven feature in this optimizer)                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `filesystem`                    | Sandboxed file access beyond CWD                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `github`                        | Issue / PR / repo metadata via API (alternative to `gh`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `claude-code-remote`            | Claude Code web/remote session management — scheduled Routines/triggers, `send_later` self check-ins, PR-activity subscriptions. All of its tools are pre-approved in `.claude/settings.json` → `permissions.allow` via a per-spelling `mcp__…__*` glob (optimizer feature "Agent trigger permissions"), so autonomous check-ins never stall on approval prompts — no per-tool carve-outs. PR-activity subscribe/unsubscribe may register under the `github` server instead — both spellings are covered. See _Prompt-free triggers everywhere_ below |
| `postgres` / `mysql` / `sqlite` | Live DB schema introspection + read queries                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `puppeteer` / `playwright`      | Headless browser, used for UI automation, scraping, e2e                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `fetch`                         | HTTP fetch wrapper                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `slack`                         | Read/post messages — for ops integrations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `sentry`                        | Error tracking lookup                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `notion` / `linear` / `jira`    | Work tracking integrations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `aws` / `gcp` / `azure`         | Cloud resource queries (use carefully — non-zero cost)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## Allowlist shape (project `.claude/settings.json` → `permissions.allow`)

Binding rules for this repo's allowlist:

- **One `mcp__<server>__*` glob per server spelling** — that glob is the whole entry for that server. It already
  matches every tool the server exposes, present and future.
- **Per-tool entries a glob already covers are redundant.** They were pruned from this repo (2026-08-02, owner
  decision). Do not re-add them, and never "restore" one because a single tool prompted.
- **Narrow exception while no glob exists:** `mcp__github__subscribe_pr_activity` and
  `mcp__github__unsubscribe_pr_activity` stay listed because there is no `mcp__github__*` glob. If that glob is ever
  added, both entries become redundant — drop them in the same edit.
- **Self-heal = append a glob.** A tool that still prompts means its server spelling has no glob yet: append
  `mcp__<that server>__*` and commit it on the current branch/PR. Never reorder or delete a glob.
- **Never write a `deny` or `ask` block.** Unconditional, no exceptions.

## Prompt-free triggers everywhere (one-time)

This repo's `.claude/settings.json` pre-approves every Claude Code Remote trigger tool — but a **project** allowlist
grants capability, so Claude Code applies it only after this repo's **workspace-trust dialog** has been accepted. That
single fact splits the two surfaces:

| Surface                                                             | What actually happens                                                                                                                                                                                                                                                      | The one-time fix                                                                                                   |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Local CLI**                                                       | The trust dialog appears on the first interactive run in the repo; accept it and the repo block is live                                                                                                                                                                    | Accept the dialog — or put the rules in user settings below and cover every repo at once                           |
| **Claude Code web / cloud** (routines, Claude Tag, mobile included) | No trust dialog exists and every session starts from a fresh container, so the block is dropped at startup — `Ignoring N permissions.allow entries from .claude/settings.json: this workspace has not been trusted` — and `delete_trigger` & friends prompt on every merge | User settings, installed by the environment's **setup script** (below). Nothing inside the repo fixes this surface |

Same rules either way, in `~/.claude/settings.json` — user scope carries no trust gate and applies to every repo:

```json
{
  "permissions": {
    "allow": [
      "mcp__claude-code-remote__*",
      "mcp__Claude_Code_Remote__*",
      "mcp__claude_code_remote__*",
      "mcp__github__subscribe_pr_activity",
      "mcp__github__unsubscribe_pr_activity"
    ]
  }
}
```

**Cloud/web — paste this into the environment's _Setup script_** (claude.ai → Claude Code → cloud environment settings).
It runs as root before Claude Code launches, and what it writes survives in the environment snapshot, so later sessions
start with the file already in place. Merge-safe: it adds only what is missing.

```bash
python3 - <<'PY'
import json, os, pathlib
d = pathlib.Path(os.environ.get("CLAUDE_CONFIG_DIR") or (pathlib.Path.home() / ".claude"))
d.mkdir(parents=True, exist_ok=True)
f = d / "settings.json"
cfg = json.loads(f.read_text()) if f.exists() else {}
allow = cfg.setdefault("permissions", {}).setdefault("allow", [])
for rule in ["mcp__claude-code-remote__*", "mcp__Claude_Code_Remote__*", "mcp__claude_code_remote__*",
             "mcp__github__subscribe_pr_activity", "mcp__github__unsubscribe_pr_activity"]:
    if rule not in allow:
        allow.append(rule)
f.write_text(json.dumps(cfg, indent=2))
PY
```

Editing the setup script re-runs it and rebuilds the snapshot; the cache also expires after roughly seven days. Verify in
the next session with `cat ~/.claude/settings.json`. **Why not a `SessionStart` hook in the repo:** hooks do run in an
untrusted workspace, but settings are read _before_ hooks fire — the rules would apply to the session _after_ the one
that wrote them, and in the cloud there is no session after: each gets a new container. The web surface pre-approves the
GitHub MCP server on its own, which is why the prompts that survive there are the Claude Code Remote ones.

Merge additively into this **user-level** file; never remove entries the user put there. **The agent never writes
this file on its own** — it lives outside the repo, so applying it is the user's call. Re-gating a single tool (e.g.
`add_repo`) via `permissions.ask` is likewise the user's own call — `ask` is evaluated before `allow`, so it prompts
despite the glob. **The agent never writes a `deny` or `ask` block anywhere, project or user settings.**

Two more keys earn their place in that same user-level file:

| Key                                             | Effect on unattended work                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"askUserQuestionTimeout": "5m"`                | An unanswered `AskUserQuestion` auto-continues after 5 minutes with whatever was preselected, instead of holding the session open. The default `"never"` waits forever — that is what turns one ambiguous moment into a dead overnight run. Values: `"60s"`, `"5m"`, `"10m"`, `"never"`. **Read from user settings only**, which is why the optimizer never writes it |
| `"permissions": {"defaultMode": "acceptEdits"}` | Optional. File edits and common filesystem commands stop prompting; every other rule above still applies. Project settings _can_ carry this, but how much a machine may do unsupervised is the owner's call, not the repo's. `bypassPermissions` skips nearly all prompts and belongs only in a container or VM you are willing to lose                               |

## MCPs in cloud and routine runs

A cloud session — every routine run included — starts from a fresh clone of the repository. Nothing added locally with
`claude mcp add` travels with it, because that configuration lives on the machine, not in the repo. Two paths make a
server reachable in an unattended run:

1. **A committed `.mcp.json` at the repo root** (project scope). It is part of the clone, so it applies everywhere the
   repo goes:

   ```json
   {
     "mcpServers": {
       "example": { "type": "http", "url": "https://mcp.example.com/mcp" }
     }
   }
   ```

   stdio servers use `"command"` + `"args"` instead of `"type"`/`"url"`. `${VAR}` and `${VAR:-default}` expand in
   `command`, `args` and `env` — **use them for every credential**; a token committed in `.mcp.json` is a leaked token.
   Project servers need approval before they connect: `.claude/settings.json` → `enableAllProjectMcpServers: true`
   grants it, and like every project-level allow rule it applies only after the workspace-trust dialog is accepted.
   TubeTrend has **no `.mcp.json` today**, so that key is deliberately absent from `.claude/settings.json` — adding the
   file is what should add the key.

2. **claude.ai connectors.** A routine includes the account's connectors, and its own form is where you narrow them to
   what the run needs. Connector traffic goes through Anthropic's servers, so it is unaffected by the environment's
   allowed-domains list.

Neither path is a hard requirement — Selection Heuristic rule 3 still holds. A run whose MCP is missing falls back and
says so once.

## Selection Heuristic for the Agent

1. **Project MCPs first.** If the project intends an MCP for a task, use it.
2. **Common-MCP fallback.** For tasks that fit a common MCP, try it; if unavailable, fall back to standard tools.
3. **Never make MCP usage a hard requirement.** All workflows must work without MCPs (autonomy + cross-machine rule).
4. **Never call cost-incurring MCPs** (cloud, paid APIs) unless explicitly requested by the user.

## Adding a New Project MCP

1. Add a row to the **Project MCPs** table above with purpose + notes.
2. If the MCP needs setup, document the install/auth steps in CLAUDE.md "External Integrations" section.
3. If a workflow becomes MCP-dependent, add a fallback path that works without it.
