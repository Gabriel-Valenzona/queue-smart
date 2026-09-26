# QueueSmart — Development Guide

This file contains implementation guidance. Where the assignment does not prescribe a choice, repository conventions and later team decisions take precedence.

## Repository-first workflow
Before a non-trivial change:
1. inspect `package.json`
2. inspect relevant routes/components/modules
3. inspect existing tests
4. identify current conventions/dependencies
5. identify the assignment stage
6. make the smallest coherent change

Do not claim a package, route, schema, deployment, or feature exists unless repository evidence or the user confirms it.

## Dependency policy
Not currently confirmed:
- ORM/data-access library
- authentication/session library
- CSS framework
- test framework
- PostgreSQL hosting provider
- deployment provider
- Email/SMS vendor
- polling/SSE/WebSocket transport

Before adding something:
- check whether the repo already has an equivalent
- confirm the task needs it
- prefer existing tooling when reasonable
- explain why the new dependency is useful

## TypeScript/code organization
Prefer readable, explicit code that teammates can explain during a course demo.

Guidance:
- use the repo's established types/naming
- avoid unnecessary `any`
- keep business rules out of presentation components
- prefer small functions with clear responsibilities
- avoid broad rewrites when a targeted change works

These are development preferences, not rubric requirements.

## Security
Project-supported constraints:
- never store plaintext passwords
- enforce backend permissions when backend work is in scope
- keep secrets out of committed source

Implementation guidance:
- use an established password-hashing library rather than custom cryptography when real authentication storage is introduced
- do not expose secrets or internal stack traces to clients

No specific auth or hashing library is confirmed.

## Testing
A3 requires unit tests for core business logic and validation and states a 70–80% coverage target. A4/final require rerunning/updating tests as persistence is introduced.

Prioritize meaningful tests for:
- validation
- role restrictions
- queue ordering/ties
- join/leave
- closed/empty queues
- serve-next
- wait estimation
- notification triggers
- history
- persistence behavior once A4 begins

A smart-feature fallback test becomes relevant only if that feature is selected.

## Git/team collaboration
This is a four-person project. GitHub history is used to validate meaningful contributions, and the assignment context states that members without meaningful contributions can receive zero.

Therefore:
- keep commits focused
- minimize unrelated formatting churn
- avoid unnecessary rewrites of teammates' work
- preserve clear contribution boundaries
- never fabricate contribution records

## Before reporting completion
When configured for the repo, run the relevant:
- tests
- TypeScript/type check
- lint
- formatter

Inspect the diff. Report what changed, why, what was checked, and any unresolved assumption. Do not say something was verified if it was not actually run/checked.
