import type { QueueStore } from "@/server/queue/store";
import { ModuleError } from "@/server/modules/errors";
import { readCompletedForUser } from "./repository";
import type { HistoryRecord } from "./types";

export function getHistory(store: QueueStore, userId: string): HistoryRecord[] {
  const records = readCompletedForUser(store, userId).sort(
    (a, b) =>
      Date.parse(b.completedAt) - Date.parse(a.completedAt) ||
      a.entryId.localeCompare(b.entryId),
  );
  const seen = new Set<string>();
  const history: HistoryRecord[] = [];
  for (const record of records) {
    if (seen.has(record.entryId)) continue;
    // Old dev-store records can outlive a type change during hot reload.
    // Current service names cannot reconstruct their completion-time names.
    if (
      !("serviceName" in record) ||
      typeof record.serviceName !== "string" ||
      !record.serviceName.trim()
    )
      throw new ModuleError(
        503,
        "history_not_ready",
        "Your history is temporarily unavailable. Please try again later.",
      );
    seen.add(record.entryId);
    history.push({
      entryId: record.entryId,
      serviceId: record.serviceId,
      serviceName: record.serviceName,
      joinedAt: record.joinedAt,
      completedAt: record.completedAt,
      outcome: record.outcome,
    });
  }
  return history;
}
