# QueueSmart

QueueSmart is a queue management web application for COSC 4353, Group 32. The current A4 implementation uses Next.js, React, TypeScript, Tailwind CSS 4, and SQLite through Node.js's built-in `node:sqlite` driver.

Users can register, log in, join or leave a service queue, check their position and estimated wait, and view participation history and notifications. Administrators can create and edit services, open or close queues, reorder or remove waiting users, and serve the next person.

## Getting started

Requires Node.js **22.13 or newer** and npm.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The database schema and demo fixtures are initialized automatically on first use.

For a production build, stop any development server using the same `.next` directory, then run:

```bash
npm run build
npm start
```

The application uses `next/font` to load Outfit; a clean build needs access to Google Fonts.

## Development accounts

These accounts are seeded for local demonstration:

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@queuesmart.com` | `Admin123!` |
| User | `alex@example.com` | `User123!` |
| User | `user@queuesmart.com` | `User123!` |

Registration creates a persisted account and associated profile. The registration form currently offers both User and Administrator roles. Login returns a signed session cookie and redirects to the corresponding workspace. API authentication also supports Bearer tokens. Passwords are stored as salted PBKDF2 hashes. `AUTH_SECRET` overrides the built-in development session signing secret.

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Public landing page |
| `/login` | Authenticate an existing account |
| `/register` | Create an account |
| `/user` | Current participation, available services, and notification summary |
| `/user/join-queue` | Select a service and join its queue |
| `/user/queue-status` | Position, estimated wait, status, and leave action |
| `/user/history` | Persisted served/canceled participation records |
| `/user/notifications` | Signed-in user's feed, read state, and notification preferences |
| `/admin` | Service management, queue management, and administrator notifications |
| `/notifications` | Standalone notification component demo with its own sample feed |
| `/ui-kit` | Shared component gallery |

## Persistence and queue behavior

The default database is `data/queuesmart.sqlite`, which is ignored by Git. `QUEUESMART_DB_PATH` overrides the location; `DATABASE_PATH` is the fallback environment override. Set the path to `:memory:` for temporary, process-local storage.

For example, to keep demonstration data separate from the default database:

```bash
QUEUESMART_DB_PATH=./data/demo.sqlite npm run dev
```

Credentials, profiles, services, queues, entries, completed participation, notifications, notification preferences, and announced wait baselines are persisted. With file storage, saved changes survive page refreshes and server restarts.

- Service creation accepts the administrator form without a supplied ID, generates a `service-<UUID>` ID, and creates the service and empty queue in one transaction. API-created services default to closed.
- Service and queue APIs save availability together. Existing queue status is authoritative when startup reconciliation finds conflicting availability values.
- Each user can have one active queue entry. Normal insertion orders entries by priority, then arrival; administrators can override the order.
- Positions start at 1. The baseline wait is position multiplied by configured duration. Once served completions provide observed intervals, estimates blend recent intervals with the configured duration.
- Leaving or serving retains an outcome in history. Queue events generate in-app notifications, including approaching service and significant wait changes. Feed changes and preferences are saved per account.
- User and administrator screens poll the APIs for updates.

On a fresh demo database, Alex Morgan starts third in Student services with a configured 15-minute wait. Student services and Technology support are open; Academic advising is closed. Subsequent saved actions change these examples.

`POST /api/demo/reset` requires an Administrator. It restores demo queues and notifications, clearing queue history, notification preferences, and wait baselines. Custom service definitions and accounts remain. Refreshing a page does not invoke this reset.

The browser caches public account metadata in local storage for display. Queue data and participation history come from the server; passwords are not saved in browser storage.

## API and source organization

Route handlers call server modules and repositories for business rules and storage. Service reads require a signed-in User or Administrator; service mutations and queue administration require an Administrator. Service, queue, history, and notification routes use the existing session wrapper and return `Cache-Control: no-store`.

| Location | Responsibility |
| --- | --- |
| `src/app/api/auth/` | Registration, login, session lookup, and logout |
| `src/app/api/user/profile/` | Profile retrieval and updates |
| `src/app/api/services/` | Service CRUD |
| `src/app/api/queues/` | Queue listing, entries, availability, reordering, and serving |
| `src/app/api/participants/` | Current user's participation |
| `src/app/api/history/` | Current user's completed participation |
| `src/app/api/notifications/` | Feed, read/dismiss actions, and preferences |
| `src/server/db/` | SQLite connections, schema, fixtures, and repositories |
| `src/server/queue/`, `services/`, `history/`, `notifications/` | Server business logic and persistence boundaries |
| `src/lib/auth/` | Password hashing, session handling, validation, and account storage |
| `src/lib/api/` | Frontend API clients |
| `src/components/` | Shared UI and workspace components |
| `tests/auth/`, `tests/db/`, and colocated `*.test.ts` files | Automated tests |

Core table definitions are in `src/server/db/schema.ts`; notification tables are in `src/server/notifications/schema.ts`. Served/canceled queue entries provide participation history.

## Tests and checks

```bash
npm test
npm run test:auth
npm run test:db
npm run test:coverage
npm run lint
npm run typecheck
```

`npm test` runs all source, authentication, and database suites once under Vitest. Tests use isolated in-memory databases and temporary files for reconnection checks. `npm run typecheck` regenerates Next.js route types before running TypeScript.

Coverage includes backend authentication, persistence, business logic, API routes, and existing API clients/helpers. Aggregate minimums are 70% for statements, branches, functions, and lines. Tests, declarations, type-only modules, barrel exports, and the browser authentication state/hook module are excluded.

Coverage reports are written to:

- `coverage/index.html` — HTML report
- `coverage/coverage-summary.json` — JSON summary
- Terminal output — test and coverage results

The last complete verification passed **493 tests across 37 files**. Coverage was **95.46% statements/lines, 93.02% branches, and 99.43% functions**. Lint, route-type generation/TypeScript, and the production build also passed. Rerun these commands when preparing new submission evidence.

## Current limitations

The profile API still accepts email/user ID query parameters independently of session authorization. The browser authentication display can produce hydration errors. Some workspace copy still refers to Assignment 3 and incorrectly says data resets on restart; file-backed data persists as described above. These are known outstanding issues.

## UI and attribution

The shared UI kit adapts [TailAdmin](https://github.com/TailAdmin/free-nextjs-admin-dashboard) with UH colors and optional university branding. See the [component guide](docs/ui-kit.md) and [license and attribution](LICENSE).

Set `showUniversityLogo` in `src/config/branding.ts` to control UH logos, including the favicon. The UI gallery's branding toggle changes previews only.
