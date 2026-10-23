import { getQueueStore } from "@/server/queue/store";
import { readJson } from "@/server/queue/http";
import { moduleHandler } from "@/server/modules/http";
import { createService, listServices } from "@/server/services/service";

export async function GET(request: Request) {
  return moduleHandler(request, () =>
    Response.json({ services: listServices(getQueueStore()) }),
  );
}

export async function POST(request: Request) {
  return moduleHandler(
    request,
    async () =>
      Response.json(
        { service: createService(getQueueStore(), await readJson(request)) },
        { status: 201 },
      ),
    true,
  );
}
