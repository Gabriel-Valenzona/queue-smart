import {
  getQueue,
  getQueueStore,
  readJson,
  setQueueOpen,
  validateId,
  validateSetQueueOpen,
} from "@/server/queue";
import { moduleHandler } from "@/server/modules/http";
import { publishQueueNotifications } from "@/server/notifications/publish";

/** GET /api/queues/:serviceId — the ordered waiting list (admin view). */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/queues/[serviceId]">,
) {
  return moduleHandler(
    request,
    async () => {
      const serviceId = validateId((await ctx.params).serviceId, "serviceId");
      return Response.json(getQueue(getQueueStore(), serviceId));
    },
    true,
  );
}

/** PATCH /api/queues/:serviceId { open } — open or close a queue to new arrivals. */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/queues/[serviceId]">,
) {
  return moduleHandler(
    request,
    async (user) => {
      const serviceId = validateId((await ctx.params).serviceId, "serviceId");
      const { open } = validateSetQueueOpen(await readJson(request));
      const result = setQueueOpen(getQueueStore(), serviceId, open);
      await publishQueueNotifications({
        events: result.events,
        actorId: user.id,
      });
      return Response.json(result);
    },
    true,
  );
}
