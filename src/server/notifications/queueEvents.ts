/**
 * Turns queue events into notifications. The rule is that the module tells the
 * people a change happened to: whoever joined, is almost ready, was served or
 * removed, and whoever is still waiting when their estimate moves. A person's
 * own action is confirmed by the screen they acted on, so the account that
 * caused a change is not notified about it again.
 */
import { estimateWait, isSignificantWaitChange } from "@/server/queue/waitTime";
import type { QueueStore } from "@/server/queue/store";
import type { QueueEvent, QueueService } from "@/server/queue/types";
import type { NotificationInput } from "./types";

/** Administrators are told once a waiting list reaches this length. */
export const QUEUE_LENGTH_ALERT = 5;

export type QueuePlanRequest = {
  events: QueueEvent[];
  /** Services whose order may have shifted; a reorder raises no event itself. */
  serviceIds?: string[];
  /** The account that made the request, when there is one. */
  actorId?: string;
  queue: QueueStore;
  adminIds?: string[];
  /** Estimates already announced, keyed by queue entry id. */
  baselines: Record<string, number>;
};

export type QueuePlan = {
  inputs: NotificationInput[];
  /** Replacement baselines, with departed entries pruned. */
  baselines: Record<string, number>;
};

function serviceOf(queue: QueueStore, serviceId: string): QueueService | undefined {
  return queue.services.find((service) => service.id === serviceId);
}

function nameOf(queue: QueueStore, serviceId: string) {
  return serviceOf(queue, serviceId)?.name ?? "the service";
}

export function planQueueNotifications({
  events,
  serviceIds = [],
  actorId,
  queue,
  adminIds = [],
  baselines,
}: QueuePlanRequest): QueuePlan {
  const inputs: NotificationInput[] = [];
  const nextBaselines = { ...baselines };
  // Someone told about their own status change does not also get a wait update.
  const alreadyTold = new Set<string>();
  const touched = new Set(serviceIds);

  function forAdmins(input: Omit<NotificationInput, "userId">) {
    for (const adminId of adminIds)
      if (adminId !== actorId) inputs.push({ ...input, userId: adminId });
  }

  for (const event of events) {
    switch (event.type) {
      case "joined": {
        const { entry } = event;
        touched.add(entry.serviceId);
        nextBaselines[entry.id] = entry.estimatedWaitMinutes;
        alreadyTold.add(entry.userId);
        const service = nameOf(queue, entry.serviceId);
        inputs.push({
          userId: entry.userId,
          category: "queue-update",
          tone: "info",
          title: "You’re in the queue",
          detail: `${service}: position ${entry.position}, about ${entry.estimatedWaitMinutes} minutes.`,
          service,
          createdAt: entry.joinedAt,
        });
        const length = queue.queues[entry.serviceId]?.length ?? 0;
        if (length === QUEUE_LENGTH_ALERT)
          forAdmins({
            category: "queue-update",
            tone: "warning",
            title: "Queue is getting long",
            detail: `${service} has ${length} people waiting.`,
            service,
          });
        break;
      }
      case "almost-ready": {
        const { entry } = event;
        touched.add(entry.serviceId);
        nextBaselines[entry.id] = entry.estimatedWaitMinutes;
        alreadyTold.add(entry.userId);
        const service = nameOf(queue, entry.serviceId);
        inputs.push({
          userId: entry.userId,
          category: "status-change",
          tone: "warning",
          title: "You’re almost ready",
          detail:
            entry.position === 1
              ? `You’re next for ${service}. Please stay nearby.`
              : `${service} is about ${entry.estimatedWaitMinutes} minutes away. Please stay nearby.`,
          service,
        });
        break;
      }
      case "served": {
        const { record } = event;
        touched.add(record.serviceId);
        delete nextBaselines[record.entryId];
        alreadyTold.add(record.userId);
        inputs.push({
          userId: record.userId,
          category: "status-change",
          tone: "success",
          title: "You’ve been served",
          detail: `${record.serviceName} has completed your visit.`,
          service: record.serviceName,
          createdAt: record.completedAt,
        });
        break;
      }
      case "left": {
        const { record } = event;
        touched.add(record.serviceId);
        delete nextBaselines[record.entryId];
        alreadyTold.add(record.userId);
        const removedByAdmin = actorId !== undefined && actorId !== record.userId;
        inputs.push({
          userId: record.userId,
          category: "status-change",
          tone: removedByAdmin ? "warning" : "info",
          title: removedByAdmin ? "Removed from the queue" : "You left the queue",
          detail: removedByAdmin
            ? `An administrator removed you from the ${record.serviceName} queue.`
            : `You are no longer waiting for ${record.serviceName}.`,
          service: record.serviceName,
          createdAt: record.completedAt,
        });
        break;
      }
      case "queue-opened":
      case "queue-closed": {
        const opened = event.type === "queue-opened";
        const service = nameOf(queue, event.serviceId);
        forAdmins({
          category: "service",
          tone: opened ? "success" : "warning",
          title: opened ? "Queue opened" : "Queue closed",
          detail: `${service} ${opened ? "is accepting new users" : "stopped accepting new arrivals"}.`,
          service,
        });
        if (!opened)
          for (const entry of queue.queues[event.serviceId] ?? [])
            inputs.push({
              userId: entry.userId,
              category: "service",
              tone: "warning",
              title: "Service closed to new arrivals",
              detail: `${service} is no longer accepting new users. Your place in line is unchanged.`,
              service,
            });
        break;
      }
    }
  }

  // Everyone still waiting in a changed queue whose estimate moved far enough.
  for (const serviceId of touched) {
    const service = serviceOf(queue, serviceId);
    if (!service) continue;
    (queue.queues[serviceId] ?? []).forEach((entry, index) => {
      const estimate = estimateWait(index + 1, service, queue.completed);
      const previous = nextBaselines[entry.id];
      if (alreadyTold.has(entry.userId)) {
        nextBaselines[entry.id] = estimate.minutes;
        return;
      }
      if (!isSignificantWaitChange(previous, estimate.minutes)) return;
      nextBaselines[entry.id] = estimate.minutes;
      inputs.push({
        userId: entry.userId,
        category: "queue-update",
        tone:
          previous !== undefined && estimate.minutes > previous ? "warning" : "info",
        title: "Estimated wait updated",
        detail: `${service.name}: position ${index + 1}, about ${estimate.minutes} minutes.`,
        service: service.name,
      });
    });
  }

  // Entries that have left the queues no longer need a baseline.
  const waiting = new Set(
    Object.values(queue.queues).flatMap((entries) => entries.map((entry) => entry.id)),
  );
  for (const entryId of Object.keys(nextBaselines))
    if (!waiting.has(entryId)) delete nextBaselines[entryId];

  return { inputs, baselines: nextBaselines };
}
