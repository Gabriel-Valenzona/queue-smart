import { getQueueStore, serveNext, validateId } from "@/server/queue";
import { moduleHandler } from "@/server/modules/http";

/** POST /api/queues/:serviceId/serve — serve the user at the front of the line. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/queues/[serviceId]/serve">,
) {
  return moduleHandler(
    request,
    async () => {
      const serviceId = validateId((await ctx.params).serviceId, "serviceId");
      return Response.json(serveNext(getQueueStore(), serviceId));
    },
    true,
  );
}
