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
