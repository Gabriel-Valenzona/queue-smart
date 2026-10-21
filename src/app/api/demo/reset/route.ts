import { handle, listQueues, resetQueueStore } from "@/server/queue";

/** POST /api/demo/reset — restore the seeded example queues. */
export async function POST() {
  return handle(() => Response.json({ queues: listQueues(resetQueueStore()) }));
}
