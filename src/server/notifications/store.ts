import type { NotificationPreferencesPatch, StoredNotification } from "./types";

/** In-memory data for the notification module. No database is used in A3. */
export type NotificationStore = {
  /** Newest first, across every account. */
  notifications: StoredNotification[];
  /** Saved settings keyed by user id; absent means the defaults apply. */
  preferences: Record<string, NotificationPreferencesPatch>;
  /**
   * The estimated wait a user was last told about, keyed by queue entry id.
   * Comparing against it is what keeps small changes from notifying twice.
   */
  waitBaselines: Record<string, number>;
};

/** Mirrors the seeded queue: Alex Morgan is third for Student services. */
function seedNotifications(): StoredNotification[] {
  return [
    {
      id: "seed-note-2",
      userId: "usr_alex_002",
      category: "queue-update",
      tone: "info",
      title: "Estimated wait updated",
      detail: "Student services: position 3, about 15 minutes.",
      service: "Student services",
      createdAt: "2026-10-01T10:01:00.000Z",
      read: false,
      silent: false,
    },
    {
      id: "seed-note-1",
      userId: "usr_alex_002",
      category: "queue-update",
      tone: "info",
      title: "You’re in the queue",
      detail: "Your place in Student services is confirmed at position 3.",
      service: "Student services",
      createdAt: "2026-10-01T10:00:00.000Z",
      read: true,
      silent: false,
    },
    {
      id: "seed-note-admin",
      userId: "usr_admin_001",
      category: "system",
      tone: "info",
      title: "Queue monitoring is active",
      detail: "Queue and service activity will appear here as it happens.",
      createdAt: "2026-10-01T09:30:00.000Z",
      read: false,
      silent: false,
    },
  ];
}

export function createSeedNotificationStore(): NotificationStore {
  return { notifications: seedNotifications(), preferences: {}, waitBaselines: {} };
}

export function createEmptyNotificationStore(): NotificationStore {
  return { notifications: [], preferences: {}, waitBaselines: {} };
}

// Kept on globalThis so every route handler (and dev hot reloads) share one store.
const globalForNotifications = globalThis as typeof globalThis & {
  __notificationStore?: NotificationStore;
};

export function getNotificationStore(): NotificationStore {
  globalForNotifications.__notificationStore ??= createSeedNotificationStore();
  return globalForNotifications.__notificationStore;
}

export function resetNotificationStore(): NotificationStore {
  globalForNotifications.__notificationStore = createSeedNotificationStore();
  return globalForNotifications.__notificationStore;
}
