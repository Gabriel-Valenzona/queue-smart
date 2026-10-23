import {
  getQueueStore,
  joinQueue,
  readJson,
  validateId,
  validateJoinQueue,
} from "@/server/queue";
import { moduleHandler } from "@/server/modules/http";
import { ModuleError } from "@/server/modules/errors";

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
    return Response.json(
      joinQueue(getQueueStore(), serviceId, { ...input, userName: user.name }),
      { status: 201 },
    );
  });
}
