/**
 * Static fixtures and display conventions for the in-app notification UI.
 * A2 is front-end only: nothing here subscribes to queue events, decides when
 * a notification should be sent, or persists anything. Pages supply the data.
 */

export type NotificationCategory =
  | "queue-update"
  | "status-change"
  | "service"
  | "system";

export type NotificationTone = "info" | "success" | "warning" | "error";

export type Notification = {
  id: string;
  category: NotificationCategory;
  tone: NotificationTone;
  title: string;
  detail: string;
  /** Optional service name shown as a badge on the notification. */
  service?: string;
  /** Display label such as "4 minutes ago"; pages decide the wording. */
  time: string;
  /** Machine-readable timestamp for <time dateTime>, when one is known. */
  createdAt?: string;
  read: boolean;
};

/** What a page passes to `notify`; the provider adds `id`, `read`, and `time`. */
export type NewNotification = Omit<Notification, "id" | "read" | "time"> & {
  time?: string;
};

export const categoryLabels: Record<NotificationCategory, string> = {
  "queue-update": "Queue update",
  "status-change": "Status change",
  service: "Service",
  system: "System",
};

/** Example user feed: queue updates and status changes, newest first. */
export const sampleUserNotifications: Notification[] = [
  {
    id: "u-1",
    category: "status-change",
    tone: "warning",
    title: "You’re almost ready",
    detail: "You’re next in line. Please stay nearby so you don’t miss your turn.",
    service: "Student services",
    time: "4 minutes ago",
    createdAt: "2026-10-01T09:48:00",
    read: false,
  },
  {
    id: "u-2",
    category: "queue-update",
    tone: "info",
    title: "Queue position updated",
    detail: "You moved from 5th to 3rd in line.",
    service: "Student services",
    time: "12 minutes ago",
    createdAt: "2026-10-01T09:40:00",
    read: false,
  },
  {
    id: "u-3",
    category: "queue-update",
    tone: "warning",
    title: "Estimated wait increased",
    detail: "Technology support is running about 10 minutes behind.",
    service: "Technology support",
    time: "35 minutes ago",
    createdAt: "2026-10-01T09:17:00",
    read: false,
  },
  {
    id: "u-4",
    category: "status-change",
    tone: "success",
    title: "You were served",
    detail: "Your visit to Records office is complete.",
    service: "Records office",
    time: "Yesterday, 2:15 PM",
    createdAt: "2026-09-30T14:15:00",
    read: true,
  },
  {
    id: "u-5",
    category: "service",
    tone: "error",
    title: "Queue closed",
    detail: "Academic advising stopped accepting new arrivals for the day.",
    service: "Academic advising",
    time: "Yesterday, 4:30 PM",
    createdAt: "2026-09-30T16:30:00",
    read: true,
  },
  {
    id: "u-6",
    category: "system",
    tone: "info",
    title: "Welcome to QueueSmart",
    detail: "Queue updates and status changes will appear here while you wait.",
    time: "Sep 28, 2026",
    createdAt: "2026-09-28T08:00:00",
    read: true,
  },
];

/** Example administrator feed: service and queue activity. */
export const sampleAdminNotifications: Notification[] = [
  {
    id: "a-1",
    category: "queue-update",
    tone: "warning",
    title: "Queue is getting long",
    detail: "Student services has more people waiting than usual.",
    service: "Student services",
    time: "8 minutes ago",
    createdAt: "2026-10-01T09:44:00",
    read: false,
  },
  {
    id: "a-2",
    category: "status-change",
    tone: "info",
    title: "A user left the queue",
    detail: "Taylor Nguyen left before being served.",
    service: "Records office",
    time: "22 minutes ago",
    createdAt: "2026-10-01T09:30:00",
    read: false,
  },
  {
    id: "a-3",
    category: "service",
    tone: "success",
    title: "Service is open",
    detail: "Records office is accepting users again.",
    service: "Records office",
    time: "1 hour ago",
    createdAt: "2026-10-01T08:52:00",
    read: true,
  },
  {
    id: "a-4",
    category: "system",
    tone: "info",
    title: "Example data only",
    detail: "Notifications in this build come from static fixtures.",
    time: "Sep 30, 2026",
    createdAt: "2026-09-30T08:00:00",
    read: true,
  },
];

/** Buttons in the examples push these so the UI can be demonstrated. */
export const simulatedEvents: NewNotification[] = [
  {
    category: "queue-update",
    tone: "info",
    title: "Queue position updated",
    detail: "You moved up to 2nd in line.",
    service: "Student services",
  },
  {
    category: "status-change",
    tone: "warning",
    title: "You’re almost ready",
    detail: "Please head to the service desk now.",
    service: "Student services",
  },
  {
    category: "status-change",
    tone: "success",
    title: "You were served",
    detail: "Thanks for using Student services.",
    service: "Student services",
  },
  {
    category: "service",
    tone: "error",
    title: "Queue closed",
    detail: "Technology support stopped accepting new arrivals.",
    service: "Technology support",
  },
];
