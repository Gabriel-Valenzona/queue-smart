import type { DemoService, UserDemoState } from "@/types/user-demo";
import type { Notification } from "@/data/notifications";

export const demoAccount = { name: "Alex Morgan", email: "alex@example.com" };

/** Predefined examples only. These values do not implement wait estimation. */
export const demoServices: readonly DemoService[] = [
  {
    id: "student-services",
    name: "Student services",
    description: "General student questions and support.",
    duration: 5,
    priority: "medium",
    open: true,
    snapshots: [
      { position: 3, waitMinutes: 15, status: "waiting" },
      { position: 2, waitMinutes: 10, status: "waiting" },
      { position: 1, waitMinutes: 5, status: "almost-ready" },
      { position: null, waitMinutes: 0, status: "served" },
    ],
  },
  {
    id: "technology-support",
    name: "Technology support",
    description: "Help with account access and device troubleshooting.",
    duration: 10,
    priority: "high",
    open: true,
    snapshots: [
      { position: 3, waitMinutes: 30, status: "waiting" },
      { position: 2, waitMinutes: 20, status: "waiting" },
      { position: 1, waitMinutes: 10, status: "almost-ready" },
      { position: null, waitMinutes: 0, status: "served" },
    ],
  },
  {
    id: "academic-advising",
    name: "Academic advising",
    description: "Course selection and degree-planning assistance.",
    duration: 15,
    priority: "low",
    open: false,
    snapshots: [],
  },
];

export function createEmptyUserDemo(): UserDemoState {
  return { current: null, history: [], feedback: null };
}

export function createPopulatedUserDemo(): UserDemoState {
  return {
    current: {
      id: "example-student-participation",
      serviceId: "student-services",
      joinedAt: "2026-10-01T10:00:00Z",
      stage: 0,
    },
    history: [
      {
        id: "example-history-1",
        serviceId: "student-services",
        joinedAt: "2026-09-28T10:00:00Z",
        completedAt: "2026-09-28T10:20:00Z",
        outcome: "served",
      },
      {
        id: "example-history-2",
        serviceId: "technology-support",
        joinedAt: "2026-09-24T14:00:00Z",
        completedAt: "2026-09-24T14:05:00Z",
        outcome: "canceled",
      },
      {
        id: "example-history-3",
        serviceId: "academic-advising",
        joinedAt: "2026-09-19T09:00:00Z",
        completedAt: "2026-09-19T09:25:00Z",
        outcome: "served",
      },
    ],
    feedback: null,
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
