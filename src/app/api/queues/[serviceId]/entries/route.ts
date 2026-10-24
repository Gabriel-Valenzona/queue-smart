import {
  getQueueStore,
  joinQueue,
  readJson,
  validateId,
  validateJoinQueue,
} from "@/server/queue";
import { moduleHandler } from "@/server/modules/http";
import { ModuleError } from "@/server/modules/errors";
import { publishQueueNotifications } from "@/server/notifications/publish";

/** POST /api/queues/:serviceId/entries { userId, userName, priority? } — join a queue. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/queues/[serviceId]/entries">,
) {
  return moduleHandler(request, async (user) => {
    const serviceId = validateId((await ctx.params).serviceId, "serviceId");
    const input = validateJoinQueue(await readJson(request));
    if (input.userId !== user.id)
      throw new ModuleError(
        403,
        "forbidden",
        "You can only join a queue as yourself.",
      );
    const result = joinQueue(getQueueStore(), serviceId, {
      ...input,
      userName: user.name,
    });
    await publishQueueNotifications({
      events: result.events,
      serviceIds: [serviceId],
      actorId: user.id,
    });
    return Response.json(result, { status: 201 });
  });
}
