"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import AppShell, { type NavItem } from "@/components/layout/AppShell";
import PageHeader from "@/components/layout/PageHeader";
import { AccountMenu } from "@/components/layout/HeaderMenus";
import NotificationsProvider, {
  useNotifications,
} from "@/components/notifications/NotificationsProvider";
import NotificationBell from "@/components/notifications/NotificationBell";
import NotificationFeed from "@/components/notifications/NotificationFeed";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader, StatCard } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ServiceEditor from "@/components/services/ServiceEditor";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Select } from "@/components/forms/Fields";
import Grid from "@/components/icons/Grid";
import List from "@/components/icons/List";
import Group from "@/components/icons/Group";
import Bell from "@/components/icons/Bell";
import Clock from "@/components/icons/Clock";
import Plus from "@/components/icons/Plus";
import Avatar from "@/components/ui/Avatar";
import { sampleAdminNotifications } from "@/data/notifications";
import {
  ApiError,
  queueApi,
  type QueueEntryView,
  type QueueService,
} from "@/lib/api/queues";
import { usePolling } from "@/lib/usePolling";
import { useCurrentUser } from "@/lib/auth/client-auth";

/** How often the admin view re-checks the queue API for user joins and leaves. */
const POLL_INTERVAL_MS = 4000;

type Service = QueueService;

const navigation: NavItem[] = [
  { label: "Overview", href: "/admin#overview", icon: <Grid /> },
  { label: "Service management", href: "/admin#services", icon: <List /> },
  { label: "Queue management", href: "/admin#queue", icon: <Group /> },
  { label: "Notifications", href: "/admin#notifications", icon: <Bell /> },
];

function formatJoined(iso: string) {
  return new Intl.DateTimeFormat("en-US", { timeStyle: "short" }).format(
    new Date(iso),
  );
}

function errorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "The queue service could not be reached.";
}

function AdminWorkspace() {
  const [services, setServices] = useState<Service[]>([]);
  const [queueLengths, setQueueLengths] = useState<Record<string, number>>({});
  const [activeQueue, setActiveQueue] = useState<QueueEntryView[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const listRequest = useRef(0);
  const queueRequest = useRef(0);
  const { notify, unreadCount } = useNotifications();

  const activeService =
    services.find((service) => service.id === selectedServiceId) ?? services[0];
  const activeServiceId = activeService?.id;
  const waitingCount = Object.values(queueLengths).reduce(
    (total, length) => total + length,
    0,
  );
  const openCount = services.filter((service) => service.open).length;

  useEffect(
    () => () => {
      queueRequest.current++;
    },
    [activeServiceId],
  );
  useEffect(
    () => () => {
      listRequest.current++;
    },
    [],
  );

  const refreshQueues = useCallback(async () => {
    const started = ++listRequest.current;
    try {
      const summaries = await queueApi.list();
      if (started !== listRequest.current) return;
      setQueueLengths(
        Object.fromEntries(summaries.map((item) => [item.id, item.length])),
      );
      setServices(summaries);
      setLoadError(null);
    } catch (error) {
      if (started === listRequest.current) setLoadError(errorMessage(error));
    }
  }, []);

  const refreshActiveQueue = useCallback(async () => {
    if (!activeServiceId) return;
    const started = ++queueRequest.current;
    try {
      const { entries } = await queueApi.get(activeServiceId);
      if (started === queueRequest.current) setActiveQueue(entries);
    } catch (error) {
      if (started === queueRequest.current) {
        setActiveQueue([]);
        setLoadError(errorMessage(error));
      }
    }
  }, [activeServiceId]);

  usePolling(refreshQueues, POLL_INTERVAL_MS);
  usePolling(refreshActiveQueue, POLL_INTERVAL_MS);

  /** Runs a queue API call, then reloads queue data; failures become notifications. */
  async function runQueueAction(action: () => Promise<void>) {
    listRequest.current++;
    queueRequest.current++;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      notify({
        category: "system",
        tone: "error",
        title: "Queue action failed",
        detail: errorMessage(error),
        service: activeService?.name,
      });
    }
    await Promise.all([refreshQueues(), refreshActiveQueue()]);
    setBusy(false);
  }

  function startCreate() {
    setEditingService(null);
    setModalOpen(true);
  }

  function startEdit(service: Service) {
    setEditingService(service);
    setModalOpen(true);
  }

  function serviceSaved(saved: Service, operation: "create" | "update") {
    listRequest.current++;
    queueRequest.current++;
    setServices((current) =>
      operation === "create"
        ? [...current, saved]
        : current.map((service) => (service.id === saved.id ? saved : service)),
    );
    if (operation === "create") {
      setSelectedServiceId(saved.id);
      setActiveQueue([]);
    } else {
      void refreshActiveQueue();
    }
    void refreshQueues();
  }

  function toggleService(service: Service) {
    return runQueueAction(async () => {
      const result = await queueApi.setOpen(service.id, !service.open);
      setServices((current) =>
        current.map((item) =>
          item.id === service.id
            ? { ...item, open: result.service.open }
            : item,
        ),
      );
      notify({
        category: "service",
        tone: service.open ? "warning" : "success",
        title: service.open ? "Queue closed" : "Queue opened",
        detail: `${service.name} is ${service.open ? "closed" : "open"} to new arrivals.`,
        service: service.name,
      });
    });
  }

  function moveEntry(entry: QueueEntryView, direction: "up" | "down") {
    if (!activeService) return;
    return runQueueAction(async () => {
      const result = await queueApi.move(activeService.id, entry.id, direction);
      setActiveQueue(result.entries);
      notify({
        category: "queue-update",
        tone: "info",
        title: "Queue order updated",
        detail: `${entry.userName} moved ${direction} in ${activeService.name}.`,
        service: activeService.name,
      });
    });
  }

  function removeEntry(entry: QueueEntryView) {
    if (!activeService) return;
    return runQueueAction(async () => {
      await queueApi.leave(activeService.id, entry.id);
      notify({
        category: "queue-update",
        tone: "warning",
        title: "User removed",
        detail: `${entry.userName} was removed from the queue.`,
        service: activeService.name,
      });
    });
  }

  function serveNext() {
    if (!activeService) return;
    return runQueueAction(async () => {
      const { record } = await queueApi.serveNext(activeService.id);
      notify({
        category: "status-change",
        tone: "success",
        title: "User served",
        detail: `${record.userName} was served.`,
        service: activeService.name,
      });
    });
  }

  const { user } = useCurrentUser();
  const adminName = user ? user.name : "Administrator";
  const adminEmail = user ? user.email : "admin@queuesmart.com";

  return (
    <AppShell
      navigation={navigation}
      title="Administration"
      headerActions={
        <>
          <NotificationBell viewAllHref="/notifications" />
          <AccountMenu
            name={adminName}
            email={adminEmail}
            links={[
              { label: "Admin overview", href: "/admin#overview" },
              { label: "Switch to User workspace", href: "/user" },
              { label: "Public home", href: "/" },
              { label: "Log out", href: "/login" },
            ]}
          />
        </>
      }
    >
      <PageHeader
        title="Admin dashboard"
        description="Keep services available and queues moving."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Admin" }]}
        action={
          <Button onClick={startCreate} startIcon={<Plus />}>
            Add service
          </Button>
        }
      />

      <div className="space-y-8">
        {loadError && (
          <p
            role="alert"
            className="rounded-lg border border-error-500 bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/15 dark:text-error-400"
          >
            Queue data could not be loaded: {loadError}
          </p>
        )}
        <section id="overview" className="scroll-mt-28 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Active services"
              value={openCount}
              description={`${services.length} configured`}
              icon={<List />}
            />
            <StatCard
              label="Users waiting"
              value={waitingCount}
              description="Across all service queues"
              icon={<Group />}
            />
            <StatCard
              label="Open queues"
              value={`${openCount} / ${services.length}`}
              description="Accepting new arrivals"
              icon={<Clock />}
            />
            <StatCard
              label="New notifications"
              value={unreadCount}
              description="Queue activity and status changes"
              icon={<Bell />}
            />
          </div>

          <Card>
            <CardHeader
              title="Services"
              description="Monitor queue lengths and control service availability."
              action={
                <Button size="sm" onClick={startCreate} startIcon={<Plus />}>
                  Add service
                </Button>
              }
            />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Queue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <p className="font-medium">{service.name}</p>
                      <p className="mt-1 max-w-sm text-xs text-gray-500 dark:text-gray-400">
                        {service.description}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        color={
                          service.priority === "high"
                            ? "error"
                            : service.priority === "medium"
                              ? "warning"
                              : "info"
                        }
                        size="sm"
                      >
                        {service.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {queueLengths[service.id] ?? 0}
                    </TableCell>
                    <TableCell>
                      <Badge
                        color={service.open ? "success" : "light"}
                        size="sm"
                      >
                        {service.open ? "Open" : "Closed"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedServiceId(service.id);
                            document.getElementById("queue")?.scrollIntoView({
                              behavior: "smooth",
                            });
                          }}
                        >
                          Manage queue
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Edit ${service.name}`}
                          onClick={() => startEdit(service)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={service.open ? "danger" : "outline"}
                          disabled={busy || !(service.id in queueLengths)}
                          onClick={() => toggleService(service)}
                        >
                          {service.open ? "Close queue" : "Open queue"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!services.length && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-gray-500"
                    >
                      No services yet. Add a service to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </section>

        <section id="services" className="scroll-mt-28">
          <Card>
            <CardHeader
              title="Service management"
              description="Configure the service details users see when joining a queue."
              action={
                <Button size="sm" onClick={startCreate} startIcon={<Plus />}>
                  Create service
                </Button>
              }
            />
            <CardBody>
              <div className="grid gap-4 md:grid-cols-3">
                {services.map((service) => (
                  <article
                    key={service.id}
                    className="flex flex-col justify-between gap-5 border border-gray-200 p-5 dark:border-gray-800"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold">{service.name}</h3>
                        <Badge
                          color={service.open ? "success" : "light"}
                          size="sm"
                        >
                          {service.open ? "Open" : "Closed"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                        {service.description}
                      </p>
                      <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                        {service.duration} min · {service.priority} priority
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="self-start"
                      onClick={() => startEdit(service)}
                    >
                      Edit service
                    </Button>
                  </article>
                ))}
                {!services.length && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No services have been created.
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        </section>

        <section id="queue" className="scroll-mt-28">
          <Card>
            <CardHeader
              title="Queue management"
              description="Live waiting list from the queue API, ordered by priority, then arrival."
              action={
                <div className="flex items-end gap-3">
                  <Select
                    label="Selected service"
                    aria-label="Selected service"
                    value={activeService?.id ?? ""}
                    onChange={(event) =>
                      setSelectedServiceId(event.target.value)
                    }
                    className="min-w-48"
                  >
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </Select>
                  <Button
                    size="sm"
                    onClick={serveNext}
                    disabled={busy || !activeQueue.length}
                  >
                    Serve next
                  </Button>
                </div>
              }
            />
            {activeService ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Position</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Est. wait</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeQueue.map((entry, index) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-semibold">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={entry.userName} />
                          <span className="font-medium">{entry.userName}</span>
                          {entry.status === "almost-ready" && (
                            <Badge color="info" size="sm">
                              Next
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">
                        {entry.priority}
                      </TableCell>
                      <TableCell>
                        <time dateTime={entry.joinedAt}>
                          {formatJoined(entry.joinedAt)}
                        </time>
                      </TableCell>
                      <TableCell>{entry.estimatedWaitMinutes} min</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy || index === 0}
                            onClick={() => moveEntry(entry, "up")}
                          >
                            Move up
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy || index === activeQueue.length - 1}
                            onClick={() => moveEntry(entry, "down")}
                          >
                            Move down
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={busy}
                            onClick={() => removeEntry(entry)}
                          >
                            Remove
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!activeQueue.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center">
                        <p className="font-medium">This queue is empty</p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          New arrivals will appear here.
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ) : (
              <CardBody>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create a service to start managing its queue.
                </p>
              </CardBody>
            )}
          </Card>
        </section>

        <section id="notifications" className="scroll-mt-28">
          <NotificationFeed
            title="Service and queue notifications"
            description="In-app updates generated by the actions on this page."
            limit={6}
          />
        </section>
      </div>

      <ServiceEditor
        open={modalOpen}
        service={editingService}
        onClose={() => setModalOpen(false)}
        onSaved={serviceSaved}
      />
    </AppShell>
  );
}

export default function AdminPage() {
  return (
    <NotificationsProvider initial={sampleAdminNotifications}>
      <AdminWorkspace />
    </NotificationsProvider>
  );
}
