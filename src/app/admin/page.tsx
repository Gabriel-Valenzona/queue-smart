"use client";
import { useState, type FormEvent } from "react";
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
import Modal from "@/components/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Input, Select, TextArea } from "@/components/forms/Fields";
import Grid from "@/components/icons/Grid";
import List from "@/components/icons/List";
import Group from "@/components/icons/Group";
import Bell from "@/components/icons/Bell";
import Clock from "@/components/icons/Clock";
import Plus from "@/components/icons/Plus";
import Avatar from "@/components/ui/Avatar";
import { sampleAdminNotifications } from "@/data/notifications";

type Service = {
  id: string;
  name: string;
  description: string;
  duration: number;
  priority: "low" | "medium" | "high";
  open: boolean;
};

type QueueEntry = { id: string; name: string; ticket: string; joined: string };
type ServiceDraft = Omit<Service, "id" | "open" | "duration"> & {
  duration: string;
};

const navigation: NavItem[] = [
  { label: "Overview", href: "/admin#overview", icon: <Grid /> },
  { label: "Service management", href: "/admin#services", icon: <List /> },
  { label: "Queue management", href: "/admin#queue", icon: <Group /> },
  { label: "Notifications", href: "/admin#notifications", icon: <Bell /> },
];

const initialServices: Service[] = [
  {
    id: "student-services",
    name: "Student services",
    description: "General student questions and support.",
    duration: 10,
    priority: "high",
    open: true,
  },
  {
    id: "records-office",
    name: "Records office",
    description: "Transcripts, enrollment verification, and records.",
    duration: 15,
    priority: "medium",
    open: true,
  },
  {
    id: "it-help-desk",
    name: "IT help desk",
    description: "Technology and account troubleshooting.",
    duration: 12,
    priority: "low",
    open: false,
  },
];

const initialQueues: Record<string, QueueEntry[]> = {
  "student-services": [
    { id: "q-1", name: "Jordan Lee", ticket: "A-104", joined: "9:32 AM" },
    { id: "q-2", name: "Taylor Nguyen", ticket: "A-105", joined: "9:38 AM" },
    { id: "q-3", name: "Morgan Patel", ticket: "A-106", joined: "9:44 AM" },
  ],
  "records-office": [
    { id: "q-4", name: "Casey Kim", ticket: "R-021", joined: "9:41 AM" },
    { id: "q-5", name: "Avery Brooks", ticket: "R-022", joined: "9:48 AM" },
  ],
  "it-help-desk": [
    { id: "q-6", name: "Riley Carter", ticket: "I-008", joined: "9:26 AM" },
  ],
};

const emptyDraft: ServiceDraft = {
  name: "",
  description: "",
  duration: "",
  priority: "medium",
};

function AdminWorkspace() {
  const [services, setServices] = useState(initialServices);
  const [queues, setQueues] = useState(initialQueues);
  const [selectedServiceId, setSelectedServiceId] = useState(
    initialServices[0].id,
  );
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<ServiceDraft>(emptyDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { notify, unreadCount } = useNotifications();

  const activeService =
    services.find((service) => service.id === selectedServiceId) ?? services[0];
  const activeQueue = activeService ? (queues[activeService.id] ?? []) : [];
  const waitingCount = Object.values(queues).reduce(
    (total, entries) => total + entries.length,
    0,
  );
  const openCount = services.filter((service) => service.open).length;

  function startCreate() {
    setEditingService(null);
    setDraft(emptyDraft);
    setErrors({});
    setModalOpen(true);
  }

  function startEdit(service: Service) {
    setEditingService(service);
    setDraft({
      name: service.name,
      description: service.description,
      duration: String(service.duration),
      priority: service.priority,
    });
    setErrors({});
    setModalOpen(true);
  }

  function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!draft.name.trim()) nextErrors.name = "Enter a service name.";
    else if (draft.name.trim().length > 100)
      nextErrors.name = "Use 100 characters or fewer.";
    if (!draft.description.trim())
      nextErrors.description = "Describe this service.";
    if (
      !draft.duration ||
      !Number.isFinite(Number(draft.duration)) ||
      Number(draft.duration) <= 0
    )
      nextErrors.duration = "Enter a duration greater than zero.";
    if (!["low", "medium", "high"].includes(draft.priority))
      nextErrors.priority = "Select a priority level.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    if (editingService) {
      setServices((current) =>
        current.map((service) =>
          service.id === editingService.id
            ? {
                ...service,
                ...draft,
                name: draft.name.trim(),
                description: draft.description.trim(),
                duration: Number(draft.duration),
              }
            : service,
        ),
      );
      notify({
        category: "service",
        tone: "success",
        title: "Service updated",
        detail: `${draft.name.trim()} was updated.`,
        service: draft.name.trim(),
      });
    } else {
      const service: Service = {
        ...draft,
        id: `service-${Date.now()}`,
        name: draft.name.trim(),
        description: draft.description.trim(),
        duration: Number(draft.duration),
        open: false,
      };
      setServices((current) => [...current, service]);
      setQueues((current) => ({ ...current, [service.id]: [] }));
      setSelectedServiceId(service.id);
      notify({
        category: "service",
        tone: "success",
        title: "Service created",
        detail: `${service.name} is ready to configure.`,
        service: service.name,
      });
    }
    setModalOpen(false);
  }

  function toggleService(service: Service) {
    setServices((current) =>
      current.map((item) =>
        item.id === service.id ? { ...item, open: !item.open } : item,
      ),
    );
    notify({
      category: "service",
      tone: service.open ? "warning" : "success",
      title: service.open ? "Queue closed" : "Queue opened",
      detail: `${service.name} is ${service.open ? "closed" : "open"} to new arrivals.`,
      service: service.name,
    });
  }

  function moveEntry(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (!activeService || target < 0 || target >= activeQueue.length) return;
    setQueues((current) => {
      const reordered = [...(current[activeService.id] ?? [])];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      return { ...current, [activeService.id]: reordered };
    });
    notify({
      category: "queue-update",
      tone: "info",
      title: "Queue order updated",
      detail: `${activeService.name} order was changed.`,
      service: activeService.name,
    });
  }

  function removeEntry(entry: QueueEntry) {
    if (!activeService) return;
    setQueues((current) => ({
      ...current,
      [activeService.id]: (current[activeService.id] ?? []).filter(
        (item) => item.id !== entry.id,
      ),
    }));
    notify({
      category: "queue-update",
      tone: "warning",
      title: "User removed",
      detail: `${entry.name} was removed from the queue.`,
      service: activeService.name,
    });
  }

  function serveNext() {
    if (!activeService || !activeQueue.length) return;
    const served = activeQueue[0];
    setQueues((current) => ({
      ...current,
      [activeService.id]: (current[activeService.id] ?? []).slice(1),
    }));
    notify({
      category: "status-change",
      tone: "success",
      title: "User served",
      detail: `${served.name} (${served.ticket}) was served.`,
      service: activeService.name,
    });
  }

  return (
    <AppShell
      navigation={navigation}
      title="Administration"
      headerActions={
        <>
          <NotificationBell viewAllHref="/notifications" />
          <AccountMenu
            name="Alex Morgan"
            email="alex@example.com"
            links={[
              { label: "User home", href: "/" },
              { label: "Log in", href: "/login" },
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
                      {queues[service.id]?.length ?? 0}
                    </TableCell>
                    <TableCell>
                      <Badge color={service.open ? "success" : "light"} size="sm">
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
                    <TableCell colSpan={5} className="py-10 text-center text-gray-500">
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
                        <Badge color={service.open ? "success" : "light"} size="sm">
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
              description="Reorder the waiting list or serve the next user."
              action={
                <div className="flex items-end gap-3">
                  <Select
                    label="Selected service"
                    aria-label="Selected service"
                    value={activeService?.id ?? ""}
                    onChange={(event) => setSelectedServiceId(event.target.value)}
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
                    disabled={!activeQueue.length}
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
                    <TableHead>Ticket</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeQueue.map((entry, index) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-semibold">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={entry.name} />
                          <span className="font-medium">{entry.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{entry.ticket}</TableCell>
                      <TableCell>{entry.joined}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={index === 0}
                            onClick={() => moveEntry(index, -1)}
                          >
                            Move up
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={index === activeQueue.length - 1}
                            onClick={() => moveEntry(index, 1)}
                          >
                            Move down
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
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
                      <TableCell colSpan={5} className="py-10 text-center">
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingService ? "Edit service" : "Create service"}
      >
        <form noValidate onSubmit={saveService} className="space-y-5">
          <Input
            label="Service name"
            name="name"
            placeholder="e.g. Student services"
            value={draft.name}
            onChange={(event) =>
              setDraft((current) => ({ ...current, name: event.target.value }))
            }
            maxLength={100}
            required
            error={errors.name}
            hint={`${draft.name.length}/100 characters`}
          />
          <TextArea
            label="Description"
            name="description"
            placeholder="What can users expect from this service?"
            value={draft.description}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            required
            error={errors.description}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Expected duration (minutes)"
              name="duration"
              type="number"
              min="1"
              step="1"
              placeholder="10"
              value={draft.duration}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  duration: event.target.value,
                }))
              }
              required
              error={errors.duration}
            />
            <Select
              label="Priority level"
              name="priority"
              value={draft.priority}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  priority: event.target.value as ServiceDraft["priority"],
                }))
              }
              required
              error={errors.priority}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingService ? "Save changes" : "Create service"}
            </Button>
          </div>
        </form>
      </Modal>
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
