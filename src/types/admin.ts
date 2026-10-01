export type Priority = "low" | "medium" | "high";

export interface Service {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priority: Priority;
  isOpen: boolean;
}

export interface QueueEntry {
  id: string;
  userName: string;
  joinedAt: string; // ISO timestamp
}

/** Queues keyed by service id. Index 0 is the next user to be served. */
export type QueueMap = Record<string, QueueEntry[]>;

export type ServiceInput = Omit<Service, "id" | "isOpen">;

export type ToastVariant = "success" | "info" | "warning" | "error";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}
