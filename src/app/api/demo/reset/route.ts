import { listQueues, resetQueueStore } from "@/server/queue";
import { resetNotificationStore } from "@/server/notifications/store";
import { moduleHandler } from "@/server/modules/http";

/** POST /api/demo/reset — restore the seeded example queues and notifications. */
export async function POST(request: Request) {
  return moduleHandler(
    request,
    () => {
      const queues = listQueues(resetQueueStore());
      resetNotificationStore();
      return Response.json({ queues });
    },
    true,
  );
}
