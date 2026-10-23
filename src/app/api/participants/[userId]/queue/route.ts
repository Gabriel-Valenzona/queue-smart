import { getParticipation, getQueueStore, validateId } from "@/server/queue";
import { moduleHandler } from "@/server/modules/http";
import { ModuleError } from "@/server/modules/errors";

/** GET /api/participants/:userId/queue — the user's current place in line, if any. */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/participants/[userId]/queue">,
) {
  return moduleHandler(request, async (user) => {
    const userId = validateId((await ctx.params).userId, "userId");
    if (userId !== user.id)
      throw new ModuleError(
        403,
        "forbidden",
        "You can only view your own participation.",
      );
    return Response.json(getParticipation(getQueueStore(), userId));
  });
}
