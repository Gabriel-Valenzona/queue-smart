import { getQueueStore, listQueues } from "@/server/queue";
import { moduleHandler } from "@/server/modules/http";

/** GET /api/queues — every service with its current queue length and wait. */
export async function GET(request: Request) {
  return moduleHandler(request, () =>
    Response.json({ queues: listQueues(getQueueStore()) }),
  );
}
