/** Display models for the A2 demo, not backend entities or queue policies. */
export type QueueSnapshot = {
  position: number | null;
  waitMinutes: number;
  status: "waiting" | "almost-ready" | "served";
};

export type DemoService = {
  id: string;
  name: string;
  description: string;
  duration: number;
  priority: "low" | "medium" | "high";
  open: boolean;
  snapshots: readonly QueueSnapshot[];
};

export type DemoParticipation = {
  id: string;
  serviceId: string;
  joinedAt: string;
  stage: number;
};

export type DemoHistoryRecord = {
  id: string;
  serviceId: string;
  joinedAt: string;
  completedAt: string;
  outcome: "served" | "canceled";
};

export type UserDemoState = {
  current: DemoParticipation | null;
  history: DemoHistoryRecord[];
  feedback: { kind: "success" | "error"; message: string } | null;
};

type EventDetails = { id: string; at: string };
type ParticipationEvent = EventDetails & {
  participationId: string;
  expectedStage: number;
};
export type UserDemoAction =
  | ({ type: "join"; serviceId: string } & EventDetails)
  | ({ type: "leave" } & ParticipationEvent)
  | ({ type: "advance" } & ParticipationEvent)
  | { type: "reset"; id: string };
