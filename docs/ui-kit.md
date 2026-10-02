# QueueSmart UI kit

Visit `/ui-kit` for the live gallery. The shared kit adapts TailAdmin’s free Next.js template to the team’s existing Next.js 16 / React 19 / TypeScript / Tailwind 4 app. Use these components before adding page-specific styles. This is Assignment 2: examples use React state and static data only.

## What is ready

| Route                | Purpose                                                            |
| -------------------- | ------------------------------------------------------------------ |
| `/`                  | Public introduction, login/register links, gallery link            |
| `/login`             | Validated preview; opens the fixed user demo, discards credentials |
| `/register`          | Validated registration preview; does not create an account         |
| `/ui-kit`            | Shared components, examples, states, and layout previews           |
| `/user`              | User dashboard: mock queue, available services, and notifications  |
| `/user/join-queue`   | Validated service selection and simulated join/leave actions       |
| `/user/queue-status` | Position, estimated wait, status, and manual demo controls         |
| `/user/history`      | Example and simulated participation outcomes                       |
| `/admin`             | Independent administrator service/queue-management simulation      |
| Route            | Purpose                                                    |
| ---------------- | ---------------------------------------------------------- |
| `/`              | Public introduction, login/register links, gallery link    |
| `/login`         | Validated login preview; does not authenticate             |
| `/register`      | Validated registration preview; does not create an account |
| `/notifications` | In-app notification center: feed, filters, and settings    |
| `/ui-kit`        | Shared components, examples, states, and layout previews   |

There are no API handlers, real accounts, persisted queue data, queue ordering rules, or backend permissions in this kit. Login validates and clears the form, then opens the fixed user demo. Registration acknowledges valid inputs and clears the form. Neither stores credentials nor sets an authenticated role. The administrator and user demos are currently independent; their services and queues do not synchronize.

## User workspace demo

The user layout mounts one provider and `AppShell` around all four screens. Internal navigation preserves the React state; refreshing, leaving the workspace, or **Reset demo** restores the populated fixtures. Each screen displays a frontend-demo notice identifying the account, services, queues, history, and notifications as simulated.

The initial account is Alex Morgan (`alex@example.com`), waiting in Student services at position 3 with a 15-minute estimated wait. Student services (5-minute duration, Medium priority) and Technology support (10 minutes, High) are open; Academic advising (15 minutes, Low) is closed. Three dated example history records and two matching demo notifications make the initial displays useful for screenshots.

Only one waiting/almost-ready participation is permitted. **Leave queue** opens a confirmation dialog; **Keep waiting**, Escape, or backdrop dismissal preserves it. **Confirm leave** records Canceled and clears it. Joining validates the selected open service, updates the shared state, and opens Queue Status. Dashboard service links preselect the service through the `service` query parameter; invalid or repeated parameters display a selection error.

**Advance demo queue** moves through predefined snapshots: Student services 3/15 minutes → 2/10 → 1/5 → Served/0; Technology support 3/30 → 2/20 → 1/10 → Served/0. Position 1 means the next waiting user and displays Almost ready. These sample waits are not an estimator. Priority is displayed as metadata, not an ordering algorithm.

Advancement, joining, leaving, and service completion supply in-app updates to the header and dashboard. Completion records one Served history outcome and allows joining again; the served summary remains until another join or reset. History uses the original join date and newest-first ordering. The empty fixture is available to QA no-queue/history/notification states.

Shared types and fixtures live in `src/types/user-demo.ts` and `src/data/user-demo.ts`. Transitions live in the frontend demo controller, separate from `QueueSummary`, table, notification, and field presentation. This is A2 simulation, not an API or future storage boundary.

## Component map

| TailAdmin reference          | QueueSmart import                                  | Intended use                                                                                        |
| ---------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Buttons                      | `@/components/ui/Button`                           | Default `Button`, named `ButtonLink`, `IconButton`                                                  |
| Inputs/forms                 | `@/components/forms/Fields`                        | `Input`, `PasswordInput`, `TextArea`, `Select`, `Checkbox`, `Radio`, `Switch`, `Label`, `FormField` |
| ComponentCard / metric cards | `@/components/ui/Card`                             | Default `Card`, named `CardHeader`, `CardBody`, `StatCard`                                          |
| Badge                        | `@/components/ui/Badge`                            | Waiting, Almost ready, Served, Canceled, priorities                                                 |
| Alerts                       | `@/components/ui/Alert`                            | Queue updates, validation, notifications                                                            |
| Modal                        | `@/components/ui/Modal`                            | Controlled confirmation or form dialog                                                              |
| Dropdown                     | `@/components/ui/Dropdown`                         | Keyboard-operable disclosure containing links/buttons                                               |
| Table                        | `@/components/ui/Table`                            | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`                           |
| AvatarText                   | `@/components/ui/Avatar`                           | Initials avatar; sizes `sm`, `md`, `lg`                                                             |
| Card typography              | `@/components/ui/EmptyState`                       | Empty queues/history with an optional action                                                        |
| Sidebar/header               | `@/components/layout/AppShell`                     | Application layout and typed `NavItem[]`                                                            |
| PageBreadCrumb               | `@/components/layout/PageHeader`                   | Heading, description, breadcrumbs, optional action                                                  |
| Header dropdowns             | `@/components/layout/HeaderMenus`                  | `AccountMenu`, static `NotificationMenu`                                                            |
| Notification system          | `@/components/notifications/*`                     | `NotificationsProvider`, `NotificationBell`, `NotificationFeed`, `NotificationsSummary`             |
| Authentication layout        | `@/components/layout/AuthLayout`                   | Responsive form + brand panel                                                                       |
| Public layouts               | `@/components/layout/PublicHeader`, `PublicFooter` | Landing-page navigation and footer                                                                  |
| Branding/theme               | `@/components/layout/Brand`, `ThemeToggle`         | Shared logo/name and appearance control                                                             |

Import individual files directly. All interaction components stay small client components; static presentation can remain server-rendered. `AuthForm` is a preview composition, not an authentication service.

## Building a page

Wrap each user/admin route group once with `AppShell`. The user workspace already supplies this shell from its layout, so user page components should compose content without nesting another shell. Pass navigation for that role; the shell does not infer permissions. Only link to implemented routes.

```tsx
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import List from "@/components/icons/List";

const navigation: NavItem[] = [
  { label: "History", href: "/user/history", icon: <List /> },
];

// Example for a separate workspace; /user/history already inherits a shell:
export default function ExampleWorkspace() {
  return (
    <AppShell navigation={navigation} title="User">
      <PageHeader title="History" description="Your past queues." />
      {/* Compose the shared Table or EmptyState here. */}
    </AppShell>
  );
}
```

`AppShell` accepts `children`, `navigation`, optional `title`, and optional `headerActions`. Put `AccountMenu` and `NotificationMenu` in `headerActions` when page-owned example data is available. Navigation collapses at desktop widths and becomes a dismissible modal drawer below 1280px. Use ordinary links for routes and section fragments for gallery-style navigation.

## Forms and actions

Native props are forwarded: `name`, `required`, `maxLength`, `min`, `max`, `step`, `autoComplete`, `disabled`, and accessibility attributes. `Input`, `PasswordInput`, `Select`, and `TextArea` accept `label`, `hint`, string `error`, and boolean `success`. They connect labels/hints to generated IDs; an explicit `id` is also supported. A supplied `aria-describedby` is combined with the field's hint/error ID so both descriptions remain available.

```tsx
import { Input, Select } from "@/components/forms/Fields";
import Button from "@/components/ui/Button";

<Input label="Service name" name="name" required maxLength={100}
  value={name} onChange={event => setName(event.target.value)}
  error={errors.name} />
<Select label="Priority" value={priority}
  onChange={event => setPriority(event.target.value)}>
  <option value="low">Low</option>
  <option value="medium">Medium</option>
  <option value="high">High</option>
</Select>
<Button type="submit">Save service</Button>
```

Use native event handlers, including `event.target.checked` for checkbox/switch controls. Both controlled and uncontrolled inputs are supported; do not pass `value` and `defaultValue` together. Controlled forms must reset their React state in `onReset`. `ServiceFormExample` demonstrates required/whitespace validation, the service-name limit, positive duration, priority selection, and reset. Its duration permits positive fractional minutes; that is a UI example, not a new queue rule.

Buttons default to `type="button"`; explicitly use `type="submit"` or `type="reset"` in forms. `ButtonLink` is for navigation. Use `variant="primary" | "outline" | "danger"` and `size="sm" | "md"`. Every `IconButton` requires a descriptive `label`.

For custom controls, `FormField` takes `id`, `label`, `hint`, `error`, `required`, and children. Set the child's matching `id` and `aria-describedby={`${id}-help`}` when displaying a hint/error. Prefer the built-in labelled inputs when possible.

## Feedback and table conventions

- Suggested status colors: Waiting → `warning`; Almost ready → `info`; Served → `success`; Canceled → `light`; Closed → `error`. Labels always accompany color. These are display conventions, not status-transition logic.
- Badges accept `color`, `variant="light" | "solid"`, `size="sm" | "md"`, and optional start/end icons.
- Alerts take `variant="success" | "info" | "warning" | "error"`, `title`, and `message`. Only supply `showLink`, `linkHref`, and `linkText` together when an actual destination exists.
- `Modal` takes `open`, `onClose`, `title`, and `children`. Use its controlled state to close after an action. A shared native-dialog hook explicitly contains Tab and Shift+Tab focus; closing restores focus. Escape and backdrop dismiss it. Do not nest modal dialogs.
- `Dropdown` takes an accessible `label`, a non-interactive `trigger` element, and children. Put ordinary links/buttons inside; it is a disclosure, not an ARIA menu. Tab enters its contents; Escape closes and returns focus. Use `align="start"` for triggers near the left edge; the default `align="end"` suits header actions near the right edge. `panelWidth` replaces the panel's width utility (`w-64` by default) for wider panels such as the notification list. Check the opened panel on mobile, as well as the closed trigger.
- Use a table caption (visually hidden if appropriate) and `TableHead` for column labels. Tables scroll horizontally on small screens. Keep sorting, queue reordering, service lookup, and data ownership in the page/controller.
- `NotificationMenu` displays a supplied `NotificationItem[]` without state; pages that mount the notification system use `NotificationBell` instead. `AccountMenu` displays supplied identity and links; it does not grant a role.

## Notification system

In-app notifications live in `src/components/notifications`. `NotificationsProvider` holds the feed in React state, counts what is unread, and renders the floating `ToastStack`. Wrap a route's page (or its layout) once, above anything that reads notifications, and pass the role's example feed from `src/data/notifications.ts`.

```tsx
import NotificationsProvider from "@/components/notifications/NotificationsProvider";
import NotificationBell from "@/components/notifications/NotificationBell";
import NotificationsSummary from "@/components/notifications/NotificationsSummary";
import { sampleUserNotifications } from "@/data/notifications";

export default function DashboardPage() {
  return (
    <NotificationsProvider initial={sampleUserNotifications}>
      <AppShell
        navigation={navigation}
        title="User"
        headerActions={<NotificationBell viewAllHref="/notifications" />}
      >
        <NotificationsSummary href="/notifications" />
      </AppShell>
    </NotificationsProvider>
  );
}
```

`useNotifications()` returns `notifications`, `unreadCount`, `notify`, `setRead`, `markRead`, `markAllRead`, `dismiss`, and `clearAll`. Call `notify` from your own interaction so the bell, the toast, and the feed all update together:

```tsx
const { notify } = useNotifications();

notify({
  category: "status-change",
  tone: "warning",
  title: "You’re almost ready",
  detail: "Please head to the service desk now.",
  service: "Student services",
});
```

| Component                 | Use                                                                        |
| ------------------------- | -------------------------------------------------------------------------- |
| `NotificationBell`        | Header action: unread count, newest items, mark all read, link to the page |
| `NotificationFeed`        | Full card list with category filters, mark-as-read, dismiss, and clearing  |
| `NotificationsSummary`    | Dashboard card with the newest items and an unread badge                   |
| `NotificationPreferences` | Category switches plus a validated quiet-hours time range                  |
| `NotificationRow`         | The shared row, with read toggle and dismiss, for your own lists           |
| `ToastStack`              | Rendered by the provider; pass `showToasts={false}` to leave it out        |

Each notification carries a `category` (`queue-update`, `status-change`, `service`, `system`) that selects its icon and label, and a `tone` (`info`, `success`, `warning`, `error`) that selects its color only. Keep the meaning in the title and detail so color is never the single cue. `time` is a display label the page supplies, with optional `createdAt` for `<time dateTime>`; nothing here formats relative time or decides when a notification should exist.

The provider is state, not storage: notifications reset on reload, and no page sends email, push, or SMS. Queue triggers, delivery, and read state belong to A3 and A4.

## Branding and styling

The shared theme is in `src/app/globals.css`. Keep TailAdmin's Outfit typography, gray canvas, white surfaces, spacing, and border/radius conventions. Primary actions use UH red `#C8102E`. Success, warning, information, and error colors remain independent. Use component variants instead of conflicting Tailwind color/spacing overrides; no class-merging library is installed.

Set `showUniversityLogo` in `src/config/branding.ts` to `false` to remove the UH mark everywhere while keeping QueueSmart text and the red palette; the favicon switches to a simple QS monogram. `Brand` supports `compact`, `inverse`, and an optional `showUniversityLogo` override for previews. The gallery switch changes only its preview instances. Official logo geometry/colors are preserved, with a 36px mark height and surrounding clear space. Do not recolor or stretch university marks.

Light mode is the default. `ThemeToggle` persists only the `queuesmart-theme` appearance preference; controls still work if browser storage is unavailable. The root layout applies a saved theme before rendering to avoid a flash of the wrong theme.

The original icons are copied SVG paths represented as TSX; no icon runtime or SVG loader is required. New components should reuse the same icon style and theme tokens. Shared controls/layouts need no new production dependencies.

## Assignment boundaries and checks

Use `src/data` for static fixtures and shared types when multiple feature pages actually need them. Do not put queue ordering, wait estimation, notification triggers, or future storage inside shared display components. The landing-page position and wait are illustrative values, not a wait estimator.

Run `npm run lint`, `npx tsc --noEmit`, and `npm run build`. If the local sandbox blocks Turbopack's worker ports, `npm run build -- --webpack` checks the same source with Next's alternative bundler without changing project scripts. Google font downloading requires network access during a clean build.

Check light/dark modes, mobile navigation, keyboard focus and Escape, required/invalid/valid inputs, controlled resets, table overflow, branding on/off, and all links. For user screens, also check shared state across navigation, join/leave confirmation, every demo stage, history/notification consistency, closed-service and duplicate prevention, and refresh/reset behavior.

See `LICENSE` for the MIT license, TailAdmin attribution and source revision, and UH logo provenance.
