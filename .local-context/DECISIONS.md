# QueueSmart — Decisions and Open Questions

This file prevents proposed ideas from being mistaken for confirmed team decisions.

## Confirmed
- Project: QueueSmart
- Course: COSC 4353 — Software Design
- Team: Group 32, four members
- Current direction: web application
- Selected application stack: Next.js + TypeScript
- Selected persistent database for A4/final: PostgreSQL
- Development methodology: Agile
- Primary role concepts: User and Administrator
- A2 may use mock/static data
- A3 must use in-memory/mocked storage and must not use a real database
- A4 introduces real persistent database integration
- Final requires administrator reporting
- Final requires at least one smart feature
- Final requires a team demo
- Git history/contributions and testing matter for grading

## Working proposal — not separately confirmed
The existing implementation guidance proposes:
- Next.js screens/components for UI
- Next.js Route Handlers/APIs
- a business-logic layer separated from storage
- a data-access boundary so A3 in-memory storage can later be replaced by PostgreSQL

Use this only if it fits the repository. Do not describe it as already implemented without inspecting the code.

## Not yet confirmed
- package manager and exact framework/package versions
- ORM/data-access library
- authentication/session approach
- how administrator privileges are granted
- CSS/styling approach
- test framework
- PostgreSQL hosting provider
- deployment provider
- notification vendor/channel
- polling vs SSE vs WebSockets
- exact queue priority rule
- exact tie-breaking rule
- multi-organization model
- appointment-scheduling scope
- final smart feature
- final report export format
- migrations/test-database approach

## Scope notes
The original problem statement mentions queue joining or appointment booking, but the later detailed assignments focus on queues. Treat a full appointment subsystem as unresolved rather than assumed.

The A1 narrative discusses an administrator of one organization potentially being a normal user elsewhere, but a complete multi-organization/tenant model has not been selected.

Do not introduce payment processing, premium queue purchases, native mobile architecture, microservices, or advanced ML unless a later requirement/team decision explicitly calls for them.

## Decision precedence
For assignment-compliant work, use this order:
1. explicit constraints in the current assignment rubric
2. current user/team instruction that does not conflict with those constraints
3. current repository implementation/conventions
4. latest confirmed project decision
5. older planning notes or suggestions

If the user intentionally requests a rubric departure, call out the conflict and follow the clarified intent without describing the result as rubric-compliant.
