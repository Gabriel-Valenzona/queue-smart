import { getQueueStore, handle, serveNext, validateId } from "@/server/queue";

/** POST /api/queues/:serviceId/serve — serve the user at the front of the line. */
export async function POST(_request: Request, ctx: RouteContext<"/api/queues/[serviceId]/serve">) {
  return handle(async () => {
    const serviceId = validateId((await ctx.params).serviceId, "serviceId");
    return Response.json(serveNext(getQueueStore(), serviceId));
  });
}
