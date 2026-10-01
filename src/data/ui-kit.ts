import type { NotificationItem } from "@/components/layout/HeaderMenus";
/** Gallery fixtures only; these are not a queue store or business rules. */
export const sampleNotifications: NotificationItem[] = [
  {
    id: "1",
    title: "You’re in the queue",
    detail: "Your place in Student services is confirmed.",
    time: "Example · 2 minutes ago",
    unread: true,
  },
  {
    id: "2",
    title: "Queue update",
    detail: "Your estimated wait has changed.",
    time: "Example · 5 minutes ago",
  },
];
export const sampleHistory = [
  {
    id: "1",
    service: "Student services",
    date: "2026-09-28",
    outcome: "Served",
  },
  {
    id: "2",
    service: "Technology support",
    date: "2026-09-24",
    outcome: "Canceled",
  },
  {
    id: "3",
    service: "Academic advising",
    date: "2026-09-19",
    outcome: "Served",
  },
] as const;
