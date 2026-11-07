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
