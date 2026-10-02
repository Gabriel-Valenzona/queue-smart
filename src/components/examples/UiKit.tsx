"use client";
import { useState, type ReactNode } from "react";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import Brand from "@/components/layout/Brand";
import { AccountMenu, NotificationMenu } from "@/components/layout/HeaderMenus";
import Button, { ButtonLink, IconButton } from "@/components/ui/Button";
import Card, { CardHeader, CardBody, StatCard } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";
import Avatar from "@/components/ui/Avatar";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import Dropdown from "@/components/ui/Dropdown";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { Input, Checkbox, Radio, Switch } from "@/components/forms/Fields";
import { branding } from "@/config/branding";
import { sampleHistory, sampleNotifications } from "@/data/ui-kit";
import ServiceFormExample from "./ServiceFormExample";
import NotificationExample from "./NotificationExample";
import Grid from "@/components/icons/Grid";
import Plus from "@/components/icons/Plus";
import List from "@/components/icons/List";
import Bell from "@/components/icons/Bell";
import TableIcon from "@/components/icons/Table";
import Page from "@/components/icons/Page";
import User from "@/components/icons/User";
import Clock from "@/components/icons/Clock";
import ArrowRight from "@/components/icons/ArrowRight";
import ChevronDown from "@/components/icons/ChevronDown";
import Check from "@/components/icons/Check";

const navigation: NavItem[] = [
  { label: "Overview", href: "/ui-kit#overview", icon: <Grid /> },
  { label: "Buttons", href: "/ui-kit#buttons", icon: <Plus /> },
  { label: "Form elements", href: "/ui-kit#forms", icon: <List /> },
  { label: "Cards & badges", href: "/ui-kit#display", icon: <Page /> },
  { label: "Alerts & overlays", href: "/ui-kit#feedback", icon: <Check /> },
  { label: "Notifications", href: "/ui-kit#notifications", icon: <Bell /> },
  { label: "Tables", href: "/ui-kit#tables", icon: <TableIcon /> },
  { label: "Branding & layouts", href: "/ui-kit#branding", icon: <User /> },
];
function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <Card>
        <CardHeader title={title} description={description} />
        <CardBody className="space-y-6">{children}</CardBody>
      </Card>
    </section>
  );
}
function ImportExample({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs leading-6 text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
      <code>{children}</code>
    </pre>
  );
}
export default function UiKit() {
  const [modal, setModal] = useState(false);
  const [notice, setNotice] = useState("");
  const [showLogo, setShowLogo] = useState<boolean>(
    branding.showUniversityLogo,
  );
  const [notify, setNotify] = useState(true);
  const [empty, setEmpty] = useState(false);
  return (
    <AppShell
      navigation={navigation}
      title="UI kit"
      headerActions={
        <>
          <NotificationMenu items={sampleNotifications} />
          <AccountMenu
            name="Alex Morgan"
            email="alex@example.com"
            links={[
              { label: "Home", href: "/" },
              { label: "Log in preview", href: "/login" },
            ]}
          />
        </>
      }
    >
      <PageHeader
        title="Shared components"
        description="The building blocks for a consistent QueueSmart experience."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "UI kit" }]}
      />
      <div className="space-y-8">
        <section id="overview" className="scroll-mt-28">
          <Card>
            <CardBody>
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="max-w-2xl">
                  <h2 className="text-xl font-semibold">
                    One design. Every page.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-gray-500 dark:text-gray-400">
                    Built from TailAdmin’s free components, with QueueSmart
                    content and UH colors. Explore the states below, then import
                    the same components into your page. All data and
                    interactions here are examples.
                  </p>
                </div>
                <ButtonLink href="/" variant="outline" size="sm">
                  View landing page
                  <ArrowRight />
                </ButtonLink>
              </div>
              <div className="mt-6 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>Next.js + TypeScript</span>
                <span aria-hidden="true">/</span>
                <span>Tailwind CSS 4</span>
                <span aria-hidden="true">/</span>
                <span>A2 · Frontend only</span>
              </div>
            </CardBody>
          </Card>
        </section>
        <Section
          id="buttons"
          title="Buttons & actions"
          description="Primary for the main action. Outline for supporting actions. Danger for destructive actions."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setNotice("Primary action selected.")}>
              Primary button
            </Button>
            <Button
              variant="outline"
              onClick={() => setNotice("Secondary action selected.")}
            >
              Outline button
            </Button>
            <Button variant="danger" onClick={() => setModal(true)}>
              Remove entry
            </Button>
            <Button disabled>Disabled</Button>
            <Button
              size="sm"
              startIcon={<Plus />}
              onClick={() => setNotice("Icon button selected.")}
            >
              With icon
            </Button>
            <IconButton
              label="Add example"
              onClick={() => setNotice("Add example selected.")}
            >
              <Plus />
            </IconButton>
          </div>
          {notice && (
            <p
              role="status"
              className="text-sm text-gray-500 dark:text-gray-400"
            >
              {notice}
            </p>
          )}
          <ImportExample>
            {
              'import Button, { ButtonLink } from "@/components/ui/Button";\n\n<Button type="submit">Save service</Button>\n<ButtonLink href="/login" variant="outline">Log in</ButtonLink>'
            }
          </ImportExample>
        </Section>
        <Section
          id="forms"
          title="Form elements"
          description="Native input types, required fields, length limits, and shared validation messages."
        >
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h3 className="mb-5 font-medium">
                Service fields · validation example
              </h3>
              <ServiceFormExample />
            </div>
            <div className="space-y-5">
              <h3 className="font-medium">Input states & selections</h3>
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                hint="Use your email as your username."
              />
              <Input
                label="Invalid field"
                defaultValue=""
                error="This field is required."
              />
              <Input
                label="Valid field"
                defaultValue="Student services"
                success
                hint="This service name is valid."
              />
              <Input label="Disabled field" value="Unavailable" disabled />
              <Input
                label="History date"
                type="date"
                defaultValue="2026-09-28"
              />
              <div className="flex flex-wrap gap-5">
                <Checkbox label="Receive queue updates" defaultChecked />
                <Checkbox label="Disabled choice" disabled />
              </div>
              <fieldset>
                <legend className="mb-3 text-sm font-medium">
                  Role display
                </legend>
                <div className="flex gap-5">
                  <Radio
                    label="User"
                    name="example-role"
                    value="user"
                    defaultChecked
                  />
                  <Radio
                    label="Administrator"
                    name="example-role"
                    value="administrator"
                  />
                </div>
              </fieldset>
              <Switch
                label="In-app notifications"
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Example notifications: {notify ? "on" : "off"}. This changes the
                example only.
              </p>
            </div>
          </div>
          <ImportExample>
            {
              'import { Input, Select, TextArea } from "@/components/forms/Fields";\n\n<Input label="Service name" name="name" required maxLength={100}\n  value={name} onChange={event => setName(event.target.value)}\n  error={errors.name} />'
            }
          </ImportExample>
        </Section>
        <Section
          id="display"
          title="Cards, badges & avatars"
          description="Reusable presentation for services, queue status, and dashboard summaries."
        >
          <div className="flex flex-wrap gap-3">
            <Badge color="warning">Waiting</Badge>
            <Badge color="info">Almost ready</Badge>
            <Badge color="success">Served</Badge>
            <Badge color="light">Canceled</Badge>
            <Badge color="error">Closed</Badge>
            <Badge color="primary">High priority</Badge>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge variant="solid" size="sm">
              Primary
            </Badge>
            <Badge color="success" variant="solid">
              Success
            </Badge>
            <Badge color="warning" variant="solid">
              Warning
            </Badge>
            <Badge color="error" variant="solid">
              Error
            </Badge>
            <Badge color="info" variant="solid">
              Info
            </Badge>
            <Badge color="dark">Neutral</Badge>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <StatCard
              label="Queue position"
              value="3"
              icon={<List />}
              description="Example queue position"
            />
            <StatCard
              label="Estimated wait"
              value="15 min"
              icon={<Clock />}
              description="Static example estimate"
            />
            <Card>
              <CardBody>
                <h3 className="font-semibold">Student services</h3>
                <p className="mb-5 mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
                  Use a card for a service description and its available
                  actions.
                </p>
                <Badge color="success">Open</Badge>
              </CardBody>
            </Card>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name="Alex Morgan" size="sm" />
            <Avatar name="Jordan Lee" />
            <Avatar name="Sam Rivera" size="lg" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Initials keep example accounts recognizable.
            </span>
          </div>
          <ImportExample>
            {
              'import Badge from "@/components/ui/Badge";\nimport Card, { CardHeader, CardBody, StatCard } from "@/components/ui/Card";\n\n<Badge color="warning">Waiting</Badge>'
            }
          </ImportExample>
        </Section>
        <Section
          id="feedback"
          title="Alerts, dialogs & dropdowns"
          description="Clear feedback with consistent colors and keyboard-accessible controls."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Alert
              variant="success"
              title="You’re in the queue"
              message="Your place is confirmed. Follow your position from Queue status."
            />
            <Alert
              variant="info"
              title="Your turn is getting closer"
              message="Watch for the next status update."
            />
            <Alert
              variant="warning"
              title="Wait time changed"
              message="This service is taking longer than expected."
            />
            <Alert
              variant="error"
              title="Unable to join"
              message="This queue is closed. Please choose another service."
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="outline" onClick={() => setModal(true)}>
              Open confirmation dialog
            </Button>
            <Dropdown
              label="Example actions"
              align="start"
              trigger={
                <span className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-3 text-sm dark:border-gray-700">
                  More actions
                  <ChevronDown />
                </span>
              }
            >
              <button
                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setNotice("Example action completed.")}
              >
                Run example action
              </button>
              <button
                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setModal(true)}
              >
                Open dialog
              </button>
            </Dropdown>
          </div>
          <p role="status" className="text-sm text-gray-500 dark:text-gray-400">
            {notice || "Dialog and dropdown examples affect only this gallery."}
          </p>
          <ImportExample>
            {
              'import Modal from "@/components/ui/Modal";\n\n<Modal open={open} onClose={() => setOpen(false)} title="Leave queue?">\n  {/* Supply your message and action buttons. */}\n</Modal>'
            }
          </ImportExample>
        </Section>
        <Section
          id="notifications"
          title="Notification system"
          description="One in-app feed for queue updates and status changes: header bell, toasts, dashboard summary, and filters."
        >
          <NotificationExample />
          <ImportExample>
            {
              'import NotificationsProvider from "@/components/notifications/NotificationsProvider";\nimport NotificationBell from "@/components/notifications/NotificationBell";\nimport NotificationFeed from "@/components/notifications/NotificationFeed";\n\n// Wrap the page once, then pass the bell to AppShell as a header action.\n<NotificationsProvider initial={sampleUserNotifications}>\n  <NotificationFeed />\n</NotificationsProvider>'
            }
          </ImportExample>
        </Section>
        <section id="tables" className="scroll-mt-28">
          <Card>
            <CardHeader
              title="Tables & empty states"
              description="A shared table style for queue management and participation history."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEmpty(!empty)}
                >
                  {empty ? "Show sample rows" : "Show empty state"}
                </Button>
              }
            />
            {empty ? (
              <EmptyState
                title="No queue history yet"
                description="Past queues will appear here after you participate in a service."
                icon={<List />}
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEmpty(false)}
                  >
                    Restore example rows
                  </Button>
                }
              />
            ) : (
              <Table>
                <caption className="sr-only">
                  Example queue participation history
                </caption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Outcome</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleHistory.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="min-w-44 font-medium">
                        {row.service}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                        <time dateTime={row.date}>{row.date}</time>
                      </TableCell>
                      <TableCell>
                        <Badge
                          color={row.outcome === "Served" ? "success" : "light"}
                        >
                          {row.outcome}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <CardBody>
              <ImportExample>
                {
                  'import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }\n  from "@/components/ui/Table";\n\n// Supply rows from your page; sorting and queue rules stay outside the table.'
                }
              </ImportExample>
            </CardBody>
          </Card>
        </section>
        <Section
          id="branding"
          title="Branding & layouts"
          description="Shared UH branding, responsive navigation, and the same layout language everywhere."
        >
          <Switch
            label="Show UH logo in previews"
            checked={showLogo}
            onChange={(e) => setShowLogo(e.target.checked)}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <Brand showUniversityLogo={showLogo} />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Header and sidebar branding
              </p>
            </div>
            <div className="rounded-xl bg-brand-950 p-4">
              <Brand showUniversityLogo={showLogo} inverse />
              <p className="mt-2 text-xs text-white/60">
                Authentication panel branding
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This toggle previews the variants. Set{" "}
            <code className="text-xs">showUniversityLogo</code> in{" "}
            <code className="text-xs">src/config/branding.ts</code> to change
            the whole website.
          </p>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "UH red", value: "#C8102E", style: "bg-brand-500" },
              { label: "Surface", value: "#FFFFFF", style: "bg-white" },
              { label: "Canvas", value: "#F9FAFB", style: "bg-gray-50" },
              { label: "Text", value: "#101828", style: "bg-gray-900" },
            ].map((swatch) => (
              <div
                key={swatch.label}
                className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800"
              >
                <span
                  className={`size-9 rounded-lg border border-gray-200 ${swatch.style}`}
                />
                <div>
                  <p className="text-xs font-medium">{swatch.label}</p>
                  <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                    {swatch.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/login" variant="outline" size="sm">
              Login layout
            </ButtonLink>
            <ButtonLink href="/register" variant="outline" size="sm">
              Registration layout
            </ButtonLink>
            <ButtonLink href="/" variant="outline" size="sm">
              Public layout
            </ButtonLink>
          </div>
          <ImportExample>
            {
              'import AppShell from "@/components/layout/AppShell";\nimport PageHeader from "@/components/layout/PageHeader";\n\n<AppShell navigation={navigation} title="User">\n  <PageHeader title="History" />\n  {/* Your page content */}\n</AppShell>'
            }
          </ImportExample>
        </Section>
      </div>
      <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
        Adapted from TailAdmin · MIT license · See docs/ui-kit.md for the team
        guide.
      </p>
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Remove this example entry?"
      >
        <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
          This demonstrates a confirmation dialog. No real queue entry will be
          changed.
        </p>
        <div className="mt-8 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setModal(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setNotice(
                "Example entry removal confirmed. No queue data was changed.",
              );
              setModal(false);
            }}
          >
            Confirm removal
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
