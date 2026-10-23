import type { UserDemoState } from "@/types/user-demo";
import type { Notification } from "@/data/notifications";

/** Queue data loads from the API; History has its own authenticated API loader. */
export function createInitialUserDemo(): UserDemoState {
  return {
    services: null,
    current: null,
    justServed: null,
    feedback: null,
    loadError: null,
  };
}

/** Matching examples for Runyelle's shared notification display system. */
export function createUserDemoNotifications(): Notification[] {
  return [
    {
      id: "example-notification-2",
      category: "queue-update",
      tone: "info",
      title: "Demo · Wait time updated",
      detail: "Your estimated wait for Student services is 15 minutes.",
      service: "Student services",
      time: "Demo · Example update",
      createdAt: "2026-10-01T10:01:00Z",
      read: false,
    },
    {
      id: "example-notification-1",
      category: "queue-update",
      tone: "info",
      title: "Demo · You’re in the queue",
      detail: "Your place in Student services is confirmed at position 3.",
      service: "Student services",
      time: "Demo · Example confirmation",
      createdAt: "2026-10-01T10:00:00Z",
      read: true,
    },
  ];
}
