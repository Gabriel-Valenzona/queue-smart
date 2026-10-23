import { randomUUID } from "node:crypto";
import { QueueError } from "./errors";
import type { QueueStore } from "./store";
import type {
  CompletedParticipation,
  Participation,
  Priority,
  QueueDetail,
  QueueEntry,
  QueueEntryView,
  QueueEvent,
  QueueService,
  QueueSummary,
} from "./types";
import type { JoinQueueInput } from "./validation";
import { estimateWaitMinutes } from "./waitTime";

const priorityRank: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

type Clock = () => Date;
const systemClock: Clock = () => new Date();

function findService(store: QueueStore, serviceId: string): QueueService {
  const service = store.services.find((item) => item.id === serviceId);
  if (!service)
    throw new QueueError("service_not_found", `Service "${serviceId}" does not exist.`);
  return service;
}

function queueOf(store: QueueStore, serviceId: string) {
  store.queues[serviceId] ??= [];
  return store.queues[serviceId];
}

function toView(entry: QueueEntry, index: number, service: QueueService): QueueEntryView {
  const position = index + 1;
  return {
    ...entry,
    position,
    status: position === 1 ? "almost-ready" : "waiting",
    estimatedWaitMinutes: estimateWaitMinutes(position, service.duration),
  };
}

/** Finds the waiting entry for a user in any service queue. */
function findActiveEntry(store: QueueStore, userId: string) {
  for (const service of store.services) {
    const index = queueOf(store, service.id).findIndex((entry) => entry.userId === userId);
    if (index !== -1) return { service, index, entry: store.queues[service.id][index] };
  }
  return null;
}

function complete(
  store: QueueStore,
  entry: QueueEntry,
  outcome: CompletedParticipation["outcome"],
  clock: Clock,
): CompletedParticipation {
  const record: CompletedParticipation = {
    entryId: entry.id,
    serviceId: entry.serviceId,
    serviceName: findService(store, entry.serviceId).name,
    userId: entry.userId,
    userName: entry.userName,
    joinedAt: entry.joinedAt,
    completedAt: clock().toISOString(),
    outcome,
  };
  store.completed.unshift(record);
  return record;
}

/** Raises "almost-ready" for whoever is now first, if the head of the line changed. */
function headChangeEvents(
  store: QueueStore,
  service: QueueService,
  previousHeadId: string | undefined,
): QueueEvent[] {
  const head = queueOf(store, service.id)[0];
  if (!head || head.id === previousHeadId) return [];
  return [{ type: "almost-ready", entry: toView(head, 0, service) }];
}

/**
 * Index at which a new entry goes: after everyone with equal or higher
 * priority, so ordering is by priority first, then arrival.
 */
export function insertionIndex(queue: QueueEntry[], priority: Priority) {
  const index = queue.findIndex((entry) => priorityRank[entry.priority] < priorityRank[priority]);
  return index === -1 ? queue.length : index;
}

export function listQueues(store: QueueStore): QueueSummary[] {
  return store.services.map((service) => {
    const length = queueOf(store, service.id).length;
    return {
      ...service,
      length,
      estimatedWaitMinutes: estimateWaitMinutes(length + 1, service.duration),
    };
  });
}

export function getQueue(store: QueueStore, serviceId: string): QueueDetail {
  const service = findService(store, serviceId);
  return {
    service,
    entries: queueOf(store, serviceId).map((entry, index) => toView(entry, index, service)),
  };
}

export function joinQueue(
  store: QueueStore,
  serviceId: string,
  input: JoinQueueInput,
  clock: Clock = systemClock,
): { entry: QueueEntryView; events: QueueEvent[] } {
  const service = findService(store, serviceId);
  if (!service.open)
    throw new QueueError("queue_closed", `${service.name} is not accepting new users.`);

  const active = findActiveEntry(store, input.userId);
  if (active)
    throw new QueueError(
      "already_in_queue",
      `${input.userName} is already waiting for ${active.service.name}. Leave that queue first.`,
    );

  const queue = queueOf(store, serviceId);
  const entry: QueueEntry = {
    id: randomUUID(),
    serviceId,
    userId: input.userId,
    userName: input.userName,
    priority: input.priority,
    joinedAt: clock().toISOString(),
  };
  const index = insertionIndex(queue, entry.priority);
  queue.splice(index, 0, entry);

  // Only the joiner can become the new front, and their entry already says so.
  const view = toView(entry, index, service);
  return { entry: view, events: [{ type: "joined", entry: view }] };
}

export function leaveQueue(
  store: QueueStore,
  serviceId: string,
  entryId: string,
  clock: Clock = systemClock,
): { record: CompletedParticipation; events: QueueEvent[] } {
  const service = findService(store, serviceId);
  const queue = queueOf(store, serviceId);
  const index = queue.findIndex((entry) => entry.id === entryId);
  if (index === -1)
    throw new QueueError("entry_not_found", `Entry "${entryId}" is not in the ${service.name} queue.`);

  const previousHeadId = queue[0]?.id;
  const [entry] = queue.splice(index, 1);
  const record = complete(store, entry, "canceled", clock);
  return {
    record,
    events: [{ type: "left", record }, ...headChangeEvents(store, service, previousHeadId)],
  };
}

export function serveNext(
  store: QueueStore,
  serviceId: string,
  clock: Clock = systemClock,
): { record: CompletedParticipation; events: QueueEvent[] } {
  const service = findService(store, serviceId);
  const queue = queueOf(store, serviceId);
  const next = queue.shift();
  if (!next) throw new QueueError("queue_empty", `No one is waiting for ${service.name}.`);

  const record = complete(store, next, "served", clock);
  return {
    record,
    events: [{ type: "served", record }, ...headChangeEvents(store, service, next.id)],
  };
}

/** Admin override: swap an entry with its neighbour. */
export function moveEntry(
  store: QueueStore,
  serviceId: string,
  entryId: string,
  direction: "up" | "down",
): { entries: QueueEntryView[]; events: QueueEvent[] } {
  const service = findService(store, serviceId);
  const queue = queueOf(store, serviceId);
  const from = queue.findIndex((entry) => entry.id === entryId);
  if (from === -1)
    throw new QueueError("entry_not_found", `Entry "${entryId}" is not in the ${service.name} queue.`);
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= queue.length)
    throw new QueueError(
      "invalid_move",
      `Entry is already ${direction === "up" ? "first" : "last"} in line.`,
    );

  const previousHeadId = queue[0].id;
  [queue[from], queue[to]] = [queue[to], queue[from]];
  return {
    entries: getQueue(store, serviceId).entries,
    events: headChangeEvents(store, service, previousHeadId),
  };
}

export function setQueueOpen(
  store: QueueStore,
  serviceId: string,
  open: boolean,
): { service: QueueService; events: QueueEvent[] } {
  const service = findService(store, serviceId);
  const changed = service.open !== open;
  service.open = open;
  return {
    service: { ...service },
    events: changed ? [{ type: open ? "queue-opened" : "queue-closed", serviceId }] : [],
  };
}

export function getParticipation(store: QueueStore, userId: string): Participation {
  const active = findActiveEntry(store, userId);
  return {
    current: active
      ? { ...toView(active.entry, active.index, active.service), service: { ...active.service } }
      : null,
    lastCompleted: store.completed.find((record) => record.userId === userId) ?? null,
  };
}
