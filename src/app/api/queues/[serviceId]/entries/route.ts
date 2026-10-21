import {
  getQueueStore,
  handle,
  joinQueue,
  readJson,
  validateId,
  validateJoinQueue,
} from "@/server/queue";

/** POST /api/queues/:serviceId/entries { userId, userName, priority? } — join a queue. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/queues/[serviceId]/entries">,
) {
  return handle(async () => {
    const serviceId = validateId((await ctx.params).serviceId, "serviceId");
    const input = validateJoinQueue(await readJson(request));
    return Response.json(joinQueue(getQueueStore(), serviceId, input), { status: 201 });
  });
}
