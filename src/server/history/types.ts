import type { CompletedParticipation } from "@/server/queue/types";

export type HistoryRecord = Pick<
  CompletedParticipation,
  | "entryId"
  | "serviceId"
  | "serviceName"
  | "joinedAt"
  | "completedAt"
  | "outcome"
>;
