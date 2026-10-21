import {
  getQueue,
  getQueueStore,
  handle,
  readJson,
  setQueueOpen,
  validateId,
  validateSetQueueOpen,
} from "@/server/queue";

/** GET /api/queues/:serviceId — the ordered waiting list (admin view). */
export async function GET(_request: Request, ctx: RouteContext<"/api/queues/[serviceId]">) {
  return handle(async () => {
    const serviceId = validateId((await ctx.params).serviceId, "serviceId");
    return Response.json(getQueue(getQueueStore(), serviceId));
  });
}

/** PATCH /api/queues/:serviceId { open } — open or close a queue to new arrivals. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/queues/[serviceId]">) {
  return handle(async () => {
    const serviceId = validateId((await ctx.params).serviceId, "serviceId");
    const { open } = validateSetQueueOpen(await readJson(request));
    return Response.json(setQueueOpen(getQueueStore(), serviceId, open));
  });
}
