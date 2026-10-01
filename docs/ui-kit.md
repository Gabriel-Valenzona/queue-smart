# QueueSmart UI kit

Visit `/ui-kit` for the live gallery. The shared kit adapts TailAdmin’s free Next.js template to the team’s existing Next.js 16 / React 19 / TypeScript / Tailwind 4 app. Use these components before adding page-specific styles. This is Assignment 2: examples use React state and static data only.

## What is ready

| Route       | Purpose                                                    |
| ----------- | ---------------------------------------------------------- |
| `/`         | Public introduction, login/register links, gallery link    |
| `/login`    | Validated login preview; does not authenticate             |
| `/register` | Validated registration preview; does not create an account |
| `/ui-kit`   | Shared components, examples, states, and layout previews   |

The user/admin feature pages remain for their assigned teammates. There are no API handlers, accounts, persisted queue data, queue ordering rules, or backend permissions in this kit. A successful authentication-form submission only acknowledges valid inputs and clears the form. It never stores credentials or sets an authenticated role.

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
| Header dropdowns             | `@/components/layout/HeaderMenus`                  | `AccountMenu`, `NotificationMenu`                                                                   |
| Authentication layout        | `@/components/layout/AuthLayout`                   | Responsive form + brand panel                                                                       |
| Public layouts               | `@/components/layout/PublicHeader`, `PublicFooter` | Landing-page navigation and footer                                                                  |
| Branding/theme               | `@/components/layout/Brand`, `ThemeToggle`         | Shared logo/name and appearance control                                                             |

Import individual files directly. All interaction components stay small client components; static presentation can remain server-rendered. `AuthForm` is a preview composition, not an authentication service.

## Building a page

Wrap each user/admin route group once with `AppShell` in its layout when those pages are implemented. Pass navigation for that role; the shell does not infer permissions. Do not nest shells. Only link to implemented routes.

```tsx
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import List from "@/components/icons/List";

const navigation: NavItem[] = [
  { label: "History", href: "/user/history", icon: <List /> },
];

// Example for the teammate implementing /user/history:
export default function HistoryPage() {
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
- `Dropdown` takes an accessible `label`, a non-interactive `trigger` element, and children. Put ordinary links/buttons inside; it is a disclosure, not an ARIA menu. Tab enters its contents; Escape closes and returns focus. Use `align="start"` for triggers near the left edge; the default `align="end"` suits header actions near the right edge. Check the opened panel on mobile, as well as the closed trigger.
- Use a table caption (visually hidden if appropriate) and `TableHead` for column labels. Tables scroll horizontally on small screens. Keep sorting, queue reordering, service lookup, and data ownership in the page/controller.
- `NotificationMenu` displays supplied `NotificationItem[]`; it does not trigger or mark notifications. `AccountMenu` displays supplied identity and links; it does not grant a role.

## Branding and styling

The shared theme is in `src/app/globals.css`. Keep TailAdmin's Outfit typography, gray canvas, white surfaces, spacing, and border/radius conventions. Primary actions use UH red `#C8102E`. Success, warning, information, and error colors remain independent. Use component variants instead of conflicting Tailwind color/spacing overrides; no class-merging library is installed.

Set `showUniversityLogo` in `src/config/branding.ts` to `false` to remove the UH mark everywhere while keeping QueueSmart text and the red palette; the favicon switches to a simple QS monogram. `Brand` supports `compact`, `inverse`, and an optional `showUniversityLogo` override for previews. The gallery switch changes only its preview instances. Official logo geometry/colors are preserved, with a 36px mark height and surrounding clear space. Do not recolor or stretch university marks.

Light mode is the default. `ThemeToggle` persists only the `queuesmart-theme` appearance preference; controls still work if browser storage is unavailable. The root layout applies a saved theme before rendering to avoid a flash of the wrong theme.

The original icons are copied SVG paths represented as TSX; no icon runtime or SVG loader is required. New components should reuse the same icon style and theme tokens. Shared controls/layouts need no new production dependencies.

## Assignment boundaries and checks

Use `src/data` for static fixtures and shared types when multiple feature pages actually need them. Do not put queue ordering, wait estimation, notification triggers, or future storage inside shared display components. The landing-page position and wait are illustrative values, not a wait estimator.

Run `npm run lint`, `npx tsc --noEmit`, and `npm run build`. If the local sandbox blocks Turbopack's worker ports, `npm run build -- --webpack` checks the same source with Next's alternative bundler without changing project scripts. Google font downloading requires network access during a clean build.

Check light/dark modes, mobile navigation, keyboard focus and Escape, required/invalid/valid inputs, controlled resets, table overflow, branding on/off, and all links. A2 feature pages and mock workflows still need to be implemented and tested by their owners.

See `LICENSE` for the MIT license, TailAdmin attribution and source revision, and UH logo provenance.
