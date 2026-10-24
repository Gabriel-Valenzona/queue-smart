# QueueSmart

COSC 4353 Assignment 2 frontend, using Next.js, TypeScript, and Tailwind CSS 4.

The shared UI kit adapts [TailAdmin](https://github.com/TailAdmin/free-nextjs-admin-dashboard) with UH colors and optional university branding. See the [component guide](docs/ui-kit.md), the [notification and wait-time guide](docs/notifications-and-wait-time.md), and [license and attribution](LICENSE).

Available routes:

- `/` — public landing page.
- `/login` — validated login preview that opens the fixed Alex Morgan demo account; submitted credentials are discarded.
- `/register` — validated registration preview; does not create an account.
- `/user` — user dashboard with a current mock queue, open services, and notification summary.
- `/user/join-queue` — service selection, sample waits, and simulated joining/leaving.
- `/user/queue-status` — current position/status and manual demo progression.
- `/user/history` — example participation history and simulated Served/Canceled outcomes.
- `/user/notifications` — queue updates and status changes shared with the user header and dashboard.
- `/admin` — administrator dashboard with client-side service and queue-management simulations.
- `/notifications` — independent notification component demo with sample feeds, filters, and settings.
- `/ui-kit` — interactive shared-component gallery.

Authentication, services, queues, history, and notifications are served by the API routes under `src/app/api`. Data lives in in-memory stores on the server, so administrator actions do reach the user screens, and everything resets when the server restarts; a database arrives in Assignment 4.

## User demo

Each user screen identifies its data as simulated. The initial Alex Morgan account is waiting for Student services at position 3, with a 15-minute estimated wait, three example history records, and two matching example notifications (one unread). Student services and Technology support are open; Academic advising is closed.

Only one waiting/almost-ready participation is allowed. Leave the initial queue or finish it with **Advance demo queue** before joining another. Positions, statuses, and estimated waits come from the queue API: an estimate is the position times the expected service duration, blended with how long that service has actually been taking once it has completions to learn from. Leaving or serving creates an in-app notification and a history record.

Runyelle's notification module powers the bell, dashboard summary, and full user notification feed. Those screens now read the Notification API: the server raises a notification when someone joins, becomes next, is served, leaves, is removed, or has their estimated wait move, and read/unread changes and dismissals are saved for that account. Each account also has category switches and quiet hours. The standalone `/notifications` demo keeps its own sample feed and does not change the user workspace. See the [notification and wait-time guide](docs/notifications-and-wait-time.md).

State remains shared while navigating among `/user` routes. **Reset demo**, refreshing the browser, or leaving and returning to the user workspace restores the initial examples, including the notification feed and read state. Reset also clears visible toasts. Queue/account data and credentials are not stored in browser storage. The existing theme preference is separate.

## Getting Started

Install the locked dependencies, then run the development server:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The landing page is `src/app/page.tsx`. Shared components are in `src/components`; use the component guide before adding page-specific styles.

This project uses `next/font` to load Outfit, matching TailAdmin's typography. A clean build needs access to Google Fonts. Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` to check changes.

Set `showUniversityLogo` in `src/config/branding.ts` to control UH logos throughout the site. This affects the favicon too. The UI gallery's branding toggle changes previews only.
