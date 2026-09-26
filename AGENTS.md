# QueueSmart — Local Codex Instructions

QueueSmart is a COSC 4353 team project. The **selected stack** is Next.js + TypeScript for the web application and PostgreSQL for A4/final persistence. Do not assume a feature or dependency is already implemented unless the repository shows it.

## Before changing code
1. Inspect `package.json`, relevant source files, tests, and existing conventions.
2. Identify the assignment stage for the task.
3. Read only the relevant files in `.local-context/`.
4. Make the smallest coherent change that satisfies the requirement.
5. Preserve teammates' working code and avoid unrelated rewrites.

## Assignment-stage constraints
- **A1:** design/architecture only.
- **A2:** frontend/UI; mock/static data is allowed; forms, navigation, and client-side validation must work.
- **A3:** real backend logic/APIs, integration, validation, and unit tests; **do not use a real database**.
- **A4:** introduce real PostgreSQL persistence and database integration.
- **Final:** integrated system plus administrator reporting, at least one smart feature, testing, and demo.

Do not silently pull later-stage infrastructure into an earlier assignment. If a request conflicts with an explicit rubric constraint (especially A3's no-database rule), flag the conflict before implementing it.

## Architecture guidance
Repository conventions take precedence. If the repo does not already establish a clean structure, use the working proposal:

`UI -> Next.js API/Route Handler -> business logic -> data-access boundary -> storage`

Keep queue rules, wait estimation, authorization, reporting, and notification-trigger decisions out of UI components. A3 storage is in-memory/mock; A4/final storage is PostgreSQL.

## Implementation rules
- Preserve the assignment's User and Administrator role concepts; use the repo's existing representation.
- Queue ordering must consider arrival time and applicable priority; exact priority/tie-breaking rules are not yet confirmed.
- A3 may use the assignment's basic example of position × expected service duration; define the position convention when implementing it.
- Never store plaintext passwords.
- Enforce critical validation and permissions on the server when backend work is in scope.
- Do not invent unconfirmed scope, libraries, vendors, or implementation status.

## Dependencies, testing, and Git
- Inspect existing dependencies before adding another; explain why a new dependency is needed.
- Keep core business logic independently testable.
- Prioritize meaningful backend tests and the course's stated ~70–80% coverage target.
- Keep edits/commits focused because Git history is used to evaluate contributions.
- Run configured tests/type checks/linting when relevant, then inspect the diff.

## Local reference files
- `.local-context/REQUIREMENTS.md` — A1 through final requirements and deliverables
- `.local-context/ARCHITECTURE.md` — system boundary and working implementation direction
- `.local-context/DOMAIN_RULES.md` — roles, services, queues, wait estimates, notifications, validation
- `.local-context/DEVELOPMENT_GUIDE.md` — implementation/testing/security/team-work guidance
- `.local-context/DECISIONS.md` — confirmed decisions vs unresolved choices

When information conflicts, use this order:
1. explicit assignment constraints for the current submission
2. current user/team instruction that does not conflict with those constraints
3. current repository implementation/conventions
4. latest confirmed project decision
5. these local instructions/reference files

If the user intentionally wants to depart from a rubric constraint, state the conflict and follow the clarified intent rather than silently treating it as assignment-compliant.
