import {
  getQueueStore,
  getQueue,
  QueueError,
  leaveQueue,
  moveEntry,
  readJson,
  validateId,
  validateMoveEntry,
} from "@/server/queue";
import { moduleHandler } from "@/server/modules/http";
import { ModuleError } from "@/server/modules/errors";
import { publishQueueNotifications } from "@/server/notifications/publish";

type Context = RouteContext<"/api/queues/[serviceId]/entries/[entryId]">;

async function readParams(ctx: Context) {
  const { serviceId, entryId } = await ctx.params;
  return {
    serviceId: validateId(serviceId, "serviceId"),
    entryId: validateId(entryId, "entryId"),
  };
}

/** DELETE /api/queues/:serviceId/entries/:entryId — leave (or be removed from) a queue. */
export async function DELETE(request: Request, ctx: Context) {
  return moduleHandler(request, async (user) => {
    const { serviceId, entryId } = await readParams(ctx);
    const store = getQueueStore();
    const entry = getQueue(store, serviceId).entries.find(
      (item) => item.id === entryId,
    );
    if (!entry)
      throw new QueueError(
        "entry_not_found",
        "This entry is not in the queue.",
      );
    if (user.role !== "admin" && entry.userId !== user.id)
      throw new ModuleError(
        403,
        "forbidden",
        "You can only leave your own queue.",
      );
    const result = leaveQueue(store, serviceId, entryId);
    await publishQueueNotifications({
      events: result.events,
      serviceIds: [serviceId],
      actorId: user.id,
    });
    return Response.json(result);
  });
}

/** PATCH /api/queues/:serviceId/entries/:entryId { direction } — admin reorder. */
export async function PATCH(request: Request, ctx: Context) {
  return moduleHandler(
    request,
    async (user) => {
      const { serviceId, entryId } = await readParams(ctx);
      const { direction } = validateMoveEntry(await readJson(request));
      const result = moveEntry(getQueueStore(), serviceId, entryId, direction);
      // A reorder raises no event of its own, so the service is named here.
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
