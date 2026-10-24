/** Where the queue module's events become stored notifications. */
import { userStore } from "@/lib/auth/user-store";
import { getQueueStore } from "@/server/queue/store";
import type { QueueEvent } from "@/server/queue/types";
import { planQueueNotifications } from "./queueEvents";
import { createNotifications } from "./service";
import { getNotificationStore, type NotificationStore } from "./store";
import type { StoredNotification } from "./types";

async function administratorIds() {
  const users = await userStore.listAll();
  return users.filter((user) => user.role === "admin").map((user) => user.id);
}

/**
 * Called by the queue routes after a successful change. Failing to notify must
 * never fail the queue operation, so errors here are logged and swallowed.
 */
export async function publishQueueNotifications(options: {
  events: QueueEvent[];
  /** Services whose order may have shifted, including reorders. */
  serviceIds?: string[];
  /** The account that made the request; it is not notified of its own action. */
  actorId?: string;
  store?: NotificationStore;
}): Promise<StoredNotification[]> {
  const store = options.store ?? getNotificationStore();
  try {
    const plan = planQueueNotifications({
      events: options.events,
      serviceIds: options.serviceIds,
      actorId: options.actorId,
      queue: getQueueStore(),
      adminIds: await administratorIds(),
      baselines: store.waitBaselines,
    });
    store.waitBaselines = plan.baselines;
    return createNotifications(store, plan.inputs);
  } catch (error) {
    console.error("Queue notifications could not be delivered:", error);
    return [];
  }
}
