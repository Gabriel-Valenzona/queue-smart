# A4 integration verification

This work retains the repository's SQLite implementation as explicitly requested.
The local project notes select PostgreSQL; these changes do not constitute a
PostgreSQL migration. Profile authorization, session redesign, reporting, and
schema redesign are outside this work.

## Baseline (2026-11-06)

- Source Vitest: 20 files, 330 tests; 325 passed and 5 service API tests failed.
  Failures cover missing no-store/auth, frontend error fields, and form creation.
- Separate Node authentication runner: 63 tests passed.
- Separate Node database runner: 34 tests passed.
- `npm test` short-circuited after the source failures, so it never ran auth/db.
- Coverage omitted auth/database suites and backend authentication modules;
  it had text/HTML output, no JSON summary and no acceptance thresholds.
- Initial TypeScript check failed on stale generated notification route types
  and service API tests passing a Request to the zero-argument GET handler.

## Milestone validation

Implementation proceeds through independently reviewed gates and local commits.
Known baseline service failures may remain until their owning milestone, but new
failures and regressions must be resolved before committing.

### 1 — Test consolidation

- Independent validator: **PASS**. `npm test`: 427 tests, 422 passed and the
  same five recorded baseline failures. `npm run test:auth`: 63 passed;
  primary `npm run test:db`: 34 passed. Test/config ESLint and diff checks passed.
- All original suites/assertions remain; no skipped failures. Memory database
  configuration precedes application imports. Repository and global connections
  close through hooks; API fixtures replace order-dependent restoration.
- Follow-up: harden existing reconnection tests' failure-path connection cleanup
  in the persistence-testing milestone.

### 2 — Service creation

- Creates `service-<UUID>` identifiers for current form submissions; preserves
  explicit IDs, legacy aliases, success fields, and partial updates.
- API services default closed; explicit availability requires a boolean.
- Repository creation writes service and empty queue in one transaction.
  Trigger-based regression verifies rollback leaves no partial service/queue or
  runtime changes. A temporary-file test verifies both survive reconnection.
- Queue resets retain custom service definitions and restore an empty queue.
- Primary focused checks: 62 tests, 59 passed and only the three baseline
  auth/no-store failures. Complete suite: 442 tests, 439 passed with the same
  three deferred failures. Route type generation and TypeScript passed.
- ESLint passed with one unused optional GET request warning, consumed by the
  authentication wrapper in milestone 4. Diff checks passed.
- Independent validator: **PASS**, 57 focused tests passed; actual administrator
  form submitted only name/description/duration/priority and returned 201 with a
  generated ID and `open: false`. After reload its table row remained closed
  with an empty queue. Screenshot: `/tmp/queuesmart-validator-m2-created.png`.
- Browser plugin unavailable; reused cached Playwright with installed Chrome.
  Existing AccountMenu authentication hydration mismatch, React script-tag
  render error, brand-image and smooth-scroll warnings were observed during
  browser QA. Creation/reload worked without a framework overlay. These
  frontend/authentication defects remain outside this integration scope;
  this is not a claim of a console-clean application.

### 3 — Availability consistency

- A shared SQL helper writes both availability values on the caller's connection;
  repository and queue operations each own one transaction. Runtime refresh and
  rollback hydration read committed data without another transaction or writes.
- Removed the queue path's separate global repository write and swallowed errors.
  Pure test stores no longer read or mutate global service storage; persisted
  stores load services from their own connection.
- Connection/store initialization reconciles mismatches to saved queue status,
  preserving queue identifiers, timestamps, entries, and completed outcomes.
- New checks exercise PUT/PATCH services and PATCH queues in both directions,
  joins, API/runtime views, no-op updates, per-table UPDATE/INSERT failures,
  runtime rollback, transaction count, reconnection, and startup reconciliation.
- Primary focused checks: 56 passed before the final additional failure cases;
  all 17 availability tests passed afterward. TypeScript and diff checks passed.
- Complete suite: 459 tests, 456 passed; only the three deferred permission/cache
  baseline failures remained. Independent validator: **PASS**, latest 86 focused
  tests passed; focused ESLint/diff checks passed.
- Actual administrator UI toggled closed→open→closed→open; reloads and direct SQL
  showed `services.open`/`queues.status` pairs `1/open`, `0/closed`, `1/open`.
  A server restart with the same temporary database retained Open in the UI/API.
  Screenshots: `/tmp/queuesmart-validator-m3-toggle.png` and
  `/tmp/queuesmart-validator-m3-restart.png`.

### 4 — Service permissions

- All service routes use the existing session/role wrapper. User/Administrator
  reads and Administrator-only mutations preserve cookie/Bearer authentication.
  Authorization precedes parsing/lookup; every response gets `no-store`.
- Positive workflows and negative cases cover all methods, missing/invalid/
  removed sessions, request/token role spoofing, and unchanged SQL/runtime data.
- Primary focused tests: 60 passed. Complete coverage run: **475/475 passed**,
  resolving every baseline failure. TypeScript, ESLint and diff checks passed.
- Interim complete-suite coverage (56 substantive modules): 93% statements,
  90.04% branches, 95.19% functions, 92.87% lines. Remaining work addresses
  meaningful persistence gaps despite already exceeding the aggregate target.
- Independent validator: **PASS**, 62 focused tests passed; live HTTP checks
  confirmed all six endpoints return 401 without sessions, User reads return 200
  and mutations 403, and Administrator create/update/delete succeeds. Every
  response had `no-store`; rejected mutations left stored services unchanged.

### 5a — Credentials persistence gaps

- Added real-file registration/login/reconnection checks for normalized unique
  email, verifiable salted password hashing without plaintext, sanitized API
  users, and associated profile/preferences persistence.
- Covered UserRepository mappings, default profiles, missing lookups, uniqueness,
  idempotent protected seeding, and reset persistence with seeding disabled.
- Hardened the previous user-store reconnection test to close both connections
  even when assertions fail. Primary authentication suite: 66 tests passed;
  TypeScript, test ESLint and diff checks passed.
- Independent validator: **PASS**, authentication suite 66/66 passed, fixtures
  and persisted assertions reviewed, focused ESLint/diff checks passed.

### 5b — Profile persistence gaps

- Extended existing profile tests with explicit optional-field preservation and
  clearing, raw SQL preferences serialization, legacy strings/corrupt JSON,
  upsert identity, missing lookups, counts, uniqueness and both implemented
  parent references, email update/delete cascades and parent display names.
- A real-file test verifies changes, optional clears and deletion after fresh
  connections, including AuthService/UserStore access and other-account data.
- Primary focused profile/API tests: 27 passed. TypeScript, ESLint and diff
  checks passed. Profile authorization remains outside scope.
- Independent validator: **PASS**, all 27 focused tests, fixture review, ESLint
  and diff checks passed. No authorization/application changes were made.

### 5c — Queue outcomes and rollback gaps

- Extended existing queue persistence tests to retain priority insertion,
  administrator reorder, one-based positions, served/canceled history and a
  subsequent rejoin across real reconnection.
- A completion-write trigger verifies rollback restores saved rows, runtime
  order and completed history. Existing memory/file tests now close connections
  on assertion failures.
- Primary queue/API suites: 107 passed; TypeScript, ESLint and diff checks passed.
- Latest repository-only rerun: 23 passed. Independent validator: **PASS**, all
  107 queue/API tests, cleanup/assertion review, ESLint and diff checks passed.

### 5d — Notification persistence and transaction gaps

- Extended real-file coverage to wait baselines, messages/read state/deletion,
  per-account preferences, account isolation and baseline foreign-key cascades.
- Verified failed baseline replacement retains prior values. A publisher SQL
  trigger fails a later delivery after earlier writes, proving messages and
  announced estimates roll back together while the queue remains committed;
  retry then succeeds without cross-account changes or duplicate deliveries.
- Hardened file connection and mock cleanup. TypeScript, ESLint and diff checks
  passed; focused notification/API results are recorded below.
- Primary and independent notification/API runs: **121/121 passed**.
  Independent validator: **PASS** on persisted assertions, rollback/retry,
  isolation, cleanup, focused ESLint and diff checks.

### 5e — Initialization and transaction gaps

- Added all-eight-table/view/index checks, schema idempotence without erasing
  saved records, disabled seeding, seed-once startup with retained edits/queues,
  foreign-key enforcement, rollback followed by a successful transaction, and
  configured path precedence. File databases remain in temporary directories;
  the real default path is inspected only as a string.
- Primary and independent database suites: **51/51 passed**. TypeScript,
  ESLint/diff checks and environment/resource cleanup review passed.
  Independent validator: **PASS**.

## Final acceptance

Primary final checks passed:

- `npm test`: **37 files, 493 tests passed**, no failures/skips.
- `npm run test:coverage`: **493 tests passed**, enforced aggregate minimum
  **70% for statements, branches, functions and lines**.
- `npm run lint`: passed without warnings.
- `QUEUESMART_DB_PATH=:memory: npm run typecheck`: regenerated Next.js route
  types and passed TypeScript.
- `QUEUESMART_DB_PATH=<temporary>/build.sqlite npm run build`: production build
  passed. Production workflow QA uses a separate temporary application database.
- No new dependencies, schema definitions, remote pushes or branches.
  Verification opens only in-memory or temporary file databases; the existing
  application database is not used or changed.

| Coverage metric | Result | Covered / total |
| --- | ---: | ---: |
| Statements | 95.46% | 1473 / 1543 |
| Lines | 95.46% | 1367 / 1432 |
| Functions | 99.43% | 352 / 354 |
| Branches | 93.02% | 1000 / 1075 |

Coverage includes 56 substantive modules: persistence, backend authentication,
API routes, queue/history/notification/service business logic and existing API
clients/helpers. Tests, declarations, type-only modules, barrels and the browser
authentication state/hook module are excluded. No substantive backend module is
excluded to obtain these results. Thresholds are aggregate project acceptance
criteria, not separate professor-prescribed per-module requirements.

Reports generated by `npm run test:coverage` (ignored by Git):

- Terminal output: printed by Vitest.
- HTML: `coverage/index.html`.
- JSON summary: `coverage/coverage-summary.json`.

## Reproduce safely

Requires the locked dependencies and Node.js 22.13+ (validated with Node 24.18.1).
Tests configure `QUEUESMART_DB_PATH=:memory:` before application imports, isolate
files, use temporary directories for reconnection, and close connections in hooks
or `finally` blocks. Auth/database subset commands remain available.

```sh
npm test
npm run test:auth
npm run test:db
npm run test:coverage
npm run lint
QUEUESMART_DB_PATH=:memory: npm run typecheck
QUEUESMART_DB_PATH=:memory: npm run build
```

Run builds without a concurrent dev server sharing `.next`. A clean production
build needs access to Google Fonts, as documented in the README. For browser QA,
start the app with `QUEUESMART_DB_PATH` pointing to a new temporary file, then log
in with a seeded account; do not use the normal application database.

## Validated local commits

| Work | Commit | Independent validation |
| --- | --- | --- |
| Test consolidation | `62d602e` | PASS; 427 tests represented, only five baseline failures |
| Service creation | `54bd553` | PASS; 57 focused tests and actual administrator form/reload |
| Availability consistency | `d37e4c4` | PASS; 86 focused tests and toggle/reload/restart with SQL checks |
| Service permissions | `1584693` | PASS; 62 focused tests and live HTTP role/cache checks |
| Credentials persistence | `1f2bb56` | PASS; 66 authentication tests |
| Profile persistence | `af22a27` | PASS; 27 profile/API tests |
| Queue outcomes/rollback | `3681a09` | PASS; 107 queue/API tests |
| Notifications/baselines | `4fa34e8` | PASS; 121 notification/API tests |
| Initialization/transactions | `0a9cc97` | PASS; 51 database tests |
| Final coverage/guidance | This commit | Final combined validation recorded below |

## Question 3 summary

QueueSmart's existing Next.js/TypeScript APIs now support form-compatible service
creation with generated identifiers and atomic creation of the service and empty
queue. Service and queue availability are saved together with transaction
rollback, runtime recovery and startup reconciliation. The service endpoints use
the existing sessions to allow authenticated reads and Administrator-only
mutations. SQLite remains the explicitly requested persistence implementation.
All 493 tests pass, including persistent credentials/profiles, queue ordering and
outcomes, notifications/read state/preferences, foreign keys, reconnection and
failure recovery. Overall coverage is 95.46% statements/lines, 93.02% branches
and 99.43% functions. Type checks, lint and the production build pass. Each
milestone has independent validation and a focused local commit.

Profile authorization, session redesign, reporting and schema redesign remain
outside this work. Previously observed UI/session hydration and console issues
are recorded above; passing integration tests do not approve those defects.

## Final independent validation and browser QA

Independent validator: **PASS**. Reproduced all 493 tests across 37 files and the
exact four coverage percentages across 56 modules; threshold configuration,
substantive-module inclusion, fixture isolation, production-build log, regenerated
route types/TypeScript, ESLint and diff checks passed.

Production environment: `http://127.0.0.1:3107`, isolated temporary SQLite file,
Chrome at 1440×1000 (administrator), 1280×900 (user), and 390×844 (mobile history).
Browser plugin unavailable; reused cached Playwright with installed Chrome.

| QA check | Result |
| --- | --- |
| Page identity and meaningful rendered content | PASS |
| No blocking framework error overlay | PASS |
| Actual form creates generated-ID, closed service | PASS |
| Admin toggle and direct SQL availability agreement | PASS |
| User joins through UI at position 1; Administrator serves via API | PASS |
| User history, notifications, read state and account isolation | PASS |
| Server restart retains availability, empty queue, served history and read state | PASS |
| Foreign-key integrity after combined workflows | PASS |
| Console health | Known existing React hydration error #418; not console-clean |
| Screenshot and desktop/mobile evidence | PASS |

The production interaction path was administrator login → create service → open
queue → register dedicated User → join via UI → Administrator serves via API →
User history/notification checks → update read state → restart → verify retained
values and another account's notification update returning 404. User service
mutations returned 403.

Local screenshots were saved outside Git:

- Administrator: `/tmp/queuesmart-validator-final-admin.png`.
- User queue: `/tmp/queuesmart-validator-final-user.png`.
- History after restart: `/tmp/queuesmart-validator-final-mobile-history.png`.

The unchanged “Assignment 3 workspace” banner says queues/history reset on
restart. That copy contradicts the persistence verified here and is left outside
this integration scope along with the existing hydration issue. Other browsers
and viewports were not tested. The disposable QA server is stopped and its
SQLite directory removed after acceptance; screenshots and coverage reports
remain available locally. No normal application data was used or changed.
