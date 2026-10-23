import type { HistoryRecord } from "@/server/history/types";
import { moduleRequest } from "./module-request";

export const historyApi = {
  list: (signal?: AbortSignal) =>
    moduleRequest<{ history: HistoryRecord[] }>("/api/history", {
      signal,
    }).then((r) => r.history),
};
