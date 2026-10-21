import { getQueueStore, handle, listQueues } from "@/server/queue";

/** GET /api/queues — every service with its current queue length and wait. */
export async function GET() {
  return handle(() => Response.json({ queues: listQueues(getQueueStore()) }));
}
