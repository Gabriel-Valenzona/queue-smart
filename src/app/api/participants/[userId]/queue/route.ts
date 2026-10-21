import { getParticipation, getQueueStore, handle, validateId } from "@/server/queue";

/** GET /api/participants/:userId/queue — the user's current place in line, if any. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/participants/[userId]/queue">,
) {
  return handle(async () => {
    const userId = validateId((await ctx.params).userId, "userId");
    return Response.json(getParticipation(getQueueStore(), userId));
  });
}
