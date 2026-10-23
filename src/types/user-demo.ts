import type { Participation, QueueSummary } from "@/lib/api/queues";

/** The authenticated user's place in line, as returned by the queue API. */
export type CurrentParticipation = NonNullable<Participation["current"]>;

export type UserDemoState = {
  /** Services and queue lengths from the API; null until the first load. */
  services: QueueSummary[] | null;
  current: CurrentParticipation | null;
  /** Set right after the user is served, until they join another queue. */
  justServed: { serviceId: string; serviceName: string } | null;
  feedback: { kind: "success" | "error"; message: string } | null;
  /** Shown when the queue API cannot be reached. */
  loadError: string | null;
};
