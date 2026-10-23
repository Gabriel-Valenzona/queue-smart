/** Backend models for the Queue Management module (A3). */

export type Priority = "low" | "medium" | "high";

export type QueueService = {
  id: string;
  name: string;
  description: string;
  /** Expected minutes to serve one user. */
  duration: number;
  priority: Priority;
  open: boolean;
};

export type QueueEntry = {
  id: string;
  serviceId: string;
  userId: string;
  userName: string;
  /** Entry priority; higher priority users are placed ahead of lower ones. */
  priority: Priority;
  joinedAt: string;
};

export type ParticipationOutcome = "served" | "canceled";

/** A finished participation, kept so users can learn they were served. */
export type CompletedParticipation = {
  entryId: string;
  serviceId: string;
  /** Service name when this visit was served or canceled. */
  serviceName: string;
  userId: string;
  userName: string;
  joinedAt: string;
  completedAt: string;
  outcome: ParticipationOutcome;
};

export type EntryStatus = "waiting" | "almost-ready";

/** An entry as returned by the API, with its computed place in line. */
export type QueueEntryView = QueueEntry & {
  /** 1-based; position 1 is the next user to be served. */
  position: number;
  status: EntryStatus;
  estimatedWaitMinutes: number;
};

export type QueueSummary = QueueService & {
  length: number;
  /** Estimated wait for someone joining now. */
  estimatedWaitMinutes: number;
};

export type QueueDetail = {
  service: QueueService;
  entries: QueueEntryView[];
};

export type Participation = {
  current: (QueueEntryView & { service: QueueService }) | null;
  lastCompleted: CompletedParticipation | null;
};

/**
 * Events raised by queue changes. The notification module can subscribe to
 * these; for now they are returned to the caller alongside each mutation.
 */
export type QueueEvent =
  | { type: "joined"; entry: QueueEntryView }
  | { type: "almost-ready"; entry: QueueEntryView }
  | { type: "served"; record: CompletedParticipation }
  | { type: "left"; record: CompletedParticipation }
  | { type: "queue-opened" | "queue-closed"; serviceId: string };
