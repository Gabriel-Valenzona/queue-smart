import type { NewNotification } from "@/data/notifications";
import type { CompletedParticipation, Participation } from "@/lib/api/queues";
import type { DemoHistoryRecord, UserDemoState } from "@/types/user-demo";

export function toHistoryRecord(
  record: CompletedParticipation,
  serviceName?: string,
): DemoHistoryRecord {
  return {
    id: record.entryId,
    serviceId: record.serviceId,
    serviceName,
    joinedAt: record.joinedAt,
    completedAt: record.completedAt,
    outcome: record.outcome,
  };
}

/**
 * Compares the previous state with the latest API participation and works out
 * what changed: the new state fields plus any in-app notifications to show.
 */
export function reconcileParticipation(
  prev: UserDemoState,
  next: Participation,
): { patch: Partial<UserDemoState>; notifications: NewNotification[] } {
  const before = prev.current;
  const after = next.current;
  const notifications: NewNotification[] = [];
  const patch: Partial<UserDemoState> = { current: after };

  if (before && !after) {
    const record = next.lastCompleted?.entryId === before.id ? next.lastCompleted : null;
    if (record && !prev.history.some((item) => item.id === record.entryId))
      patch.history = [toHistoryRecord(record, before.service.name), ...prev.history];
    if (record?.outcome === "served") {
      patch.justServed = { serviceId: before.serviceId, serviceName: before.service.name };
      notifications.push({
        category: "status-change",
        tone: "success",
        title: "You’ve been served",
        detail: `${before.service.name} has completed your visit.`,
        service: before.service.name,
        createdAt: record.completedAt,
      });
    } else {
      notifications.push({
        category: "status-change",
        tone: "warning",
        title: "Removed from queue",
        detail: `You are no longer in the ${before.service.name} queue.`,
        service: before.service.name,
      });
    }
  } else if (before && after && before.id === after.id && before.position !== after.position) {
    const nowNext = after.status === "almost-ready" && before.status !== "almost-ready";
    notifications.push({
      category: nowNext ? "status-change" : "queue-update",
      tone: nowNext ? "warning" : "info",
      title: nowNext ? "You’re almost ready" : "Queue updated",
      detail: nowNext
        ? `You’re next for ${after.service.name}. Please stay nearby.`
        : `${after.service.name}: position ${after.position}, estimated wait ${after.estimatedWaitMinutes} minutes.`,
      service: after.service.name,
    });
  }

  return { patch, notifications };
}

/**
 * Client-side pre-check so the form can explain problems before calling the
 * API. The queue API re-validates and is the final authority.
 */
export function getJoinError(state: UserDemoState, serviceId: string) {
  if (!serviceId) return "Select a service to join its queue.";
  const service = state.services?.find((item) => item.id === serviceId);
  if (!service) return "This service is not available. Select a listed service.";
  if (!service.open) return "This queue is closed. Select an open service.";
  if (state.current)
    return "You already have an active queue. Leave it or finish being served before joining another.";
}

export function formatDemoDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(iso));
}
