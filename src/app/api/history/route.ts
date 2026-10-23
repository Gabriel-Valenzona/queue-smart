import { getQueueStore } from "@/server/queue/store";
import { QueueError } from "@/server/queue/errors";
import { moduleHandler } from "@/server/modules/http";
import { getHistory } from "@/server/history/service";

export async function GET(request: Request) {
  return moduleHandler(request, (user) => {
    if (new URL(request.url).searchParams.size)
      throw new QueueError(
        "validation_error",
        "History does not accept query parameters.",
        {
          query: "History always belongs to the signed-in account.",
        },
      );
    return Response.json({ history: getHistory(getQueueStore(), user.id) });
  });
}
