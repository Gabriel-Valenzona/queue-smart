import {
  getQueueStore,
  handle,
  leaveQueue,
  moveEntry,
  readJson,
  validateId,
  validateMoveEntry,
} from "@/server/queue";

type Context = RouteContext<"/api/queues/[serviceId]/entries/[entryId]">;

async function readParams(ctx: Context) {
  const { serviceId, entryId } = await ctx.params;
  return {
    serviceId: validateId(serviceId, "serviceId"),
    entryId: validateId(entryId, "entryId"),
  };
}

/** DELETE /api/queues/:serviceId/entries/:entryId — leave (or be removed from) a queue. */
export async function DELETE(_request: Request, ctx: Context) {
  return handle(async () => {
    const { serviceId, entryId } = await readParams(ctx);
    return Response.json(leaveQueue(getQueueStore(), serviceId, entryId));
  });
}

/** PATCH /api/queues/:serviceId/entries/:entryId { direction } — admin reorder. */
export async function PATCH(request: Request, ctx: Context) {
  return handle(async () => {
    const { serviceId, entryId } = await readParams(ctx);
    const { direction } = validateMoveEntry(await readJson(request));
    return Response.json(moveEntry(getQueueStore(), serviceId, entryId, direction));
  });
}
