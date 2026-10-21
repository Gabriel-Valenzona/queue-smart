import type { Participation, QueueSummary } from "@/lib/api/queues";

/** The demo user's place in line, as returned by the queue API. */
export type CurrentParticipation = NonNullable<Participation["current"]>;

export type DemoHistoryRecord = {
  id: string;
  serviceId: string;
  /** Kept so history still shows a name if the service disappears. */
  serviceName?: string;
  joinedAt: string;
  completedAt: string;
  outcome: "served" | "canceled";
};

export type UserDemoState = {
  /** Services and queue lengths from the API; null until the first load. */
  services: QueueSummary[] | null;
  current: CurrentParticipation | null;
  /** Set right after the user is served, until they join another queue. */
  justServed: { serviceId: string; serviceName: string } | null;
  history: DemoHistoryRecord[];
  feedback: { kind: "success" | "error"; message: string } | null;
  /** Shown when the queue API cannot be reached. */
  loadError: string | null;
};
