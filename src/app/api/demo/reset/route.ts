import { listQueues, resetQueueStore } from "@/server/queue";
import { moduleHandler } from "@/server/modules/http";

/** POST /api/demo/reset — restore the seeded example queues. */
export async function POST(request: Request) {
  return moduleHandler(
    request,
    () => Response.json({ queues: listQueues(resetQueueStore()) }),
    true,
  );
}
