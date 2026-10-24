import { getQueueStore, serveNext, validateId } from "@/server/queue";
import { moduleHandler } from "@/server/modules/http";
import { publishQueueNotifications } from "@/server/notifications/publish";

/** POST /api/queues/:serviceId/serve — serve the user at the front of the line. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/queues/[serviceId]/serve">,
) {
  return moduleHandler(
    request,
    async (user) => {
      const serviceId = validateId((await ctx.params).serviceId, "serviceId");
      const result = serveNext(getQueueStore(), serviceId);
      await publishQueueNotifications({
        events: result.events,
        serviceIds: [serviceId],
        actorId: user.id,
      });
      return Response.json(result);
    },
    true,
  );
}
