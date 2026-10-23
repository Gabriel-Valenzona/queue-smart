import { getQueueStore } from "@/server/queue/store";
import { readJson } from "@/server/queue/http";
import { moduleHandler } from "@/server/modules/http";
import { updateService } from "@/server/services/service";

export async function PUT(
  request: Request,
  ctx: { params: Promise<{ serviceId: string }> },
) {
  return moduleHandler(
    request,
    async () =>
      Response.json({
        service: updateService(
          getQueueStore(),
          (await ctx.params).serviceId,
          await readJson(request),
        ),
      }),
    true,
  );
}
