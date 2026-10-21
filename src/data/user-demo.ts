import type { DemoHistoryRecord, UserDemoState } from "@/types/user-demo";
import type { Notification } from "@/data/notifications";

/** Fixed demo account until the authentication module supplies a real user. */
export const demoAccount = {
  id: "alex-morgan",
  name: "Alex Morgan",
  email: "alex@example.com",
};

function exampleHistory(): DemoHistoryRecord[] {
  return [
    {
      id: "example-history-1",
      serviceId: "student-services",
      serviceName: "Student services",
      joinedAt: "2026-09-28T10:00:00Z",
      completedAt: "2026-09-28T10:20:00Z",
      outcome: "served",
    },
    {
      id: "example-history-2",
      serviceId: "technology-support",
      serviceName: "Technology support",
      joinedAt: "2026-09-24T14:00:00Z",
      completedAt: "2026-09-24T14:05:00Z",
      outcome: "canceled",
    },
    {
      id: "example-history-3",
      serviceId: "academic-advising",
      serviceName: "Academic advising",
      joinedAt: "2026-09-19T09:00:00Z",
      completedAt: "2026-09-19T09:25:00Z",
      outcome: "served",
    },
  ];
}

/** Queue data is loaded from the API; history stays an in-browser example. */
export function createInitialUserDemo(): UserDemoState {
  return {
    services: null,
    current: null,
    justServed: null,
    history: exampleHistory(),
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
