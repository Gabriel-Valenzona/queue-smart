import type { QueueStore } from "@/server/queue/store";

/** Read the existing completion collection; history never writes its own store. */
export function readCompletedForUser(store: QueueStore, userId: string) {
  return store.completed.filter((record) => record.userId === userId);
}
