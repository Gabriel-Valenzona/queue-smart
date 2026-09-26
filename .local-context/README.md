# Local QueueSmart Codex Context

These files are designed to stay **local to your clone** while keeping `AGENTS.md` short.

## Files
- `REQUIREMENTS.md` — source-grounded A1/A2/A3/A4/final requirements and submission reminders
- `ARCHITECTURE.md` — required A1 system boundary plus the clearly labeled working implementation proposal
- `DOMAIN_RULES.md` — source-grounded domain behavior and unresolved queue details
- `DEVELOPMENT_GUIDE.md` — coding/testing/security/team-work guidance
- `DECISIONS.md` — confirmed decisions, proposals, and unresolved choices

## How Codex should use them
Do not read every file for every task.

Typical mapping:
- frontend/A2 task -> `REQUIREMENTS.md`
- API/queue logic task -> `REQUIREMENTS.md` + `DOMAIN_RULES.md` + relevant architecture section
- database/A4 task -> `REQUIREMENTS.md` + `ARCHITECTURE.md` + `DECISIONS.md`
- testing/refactor task -> `DEVELOPMENT_GUIDE.md` + the relevant requirement/domain file

The repository is the source of truth for **what is actually implemented**. These local files describe requirements, confirmed decisions, and guidance.

## Keep these local
Recommended local Git exclude entries:

```gitignore
AGENTS.md
.local-context/
```

Put those entries in `.git/info/exclude` if you want them ignored only in your clone and not pushed to teammates.

If either path was already committed/tracked, an ignore rule alone will not untrack it.
