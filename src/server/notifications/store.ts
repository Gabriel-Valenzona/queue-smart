import { seedUsers } from "@/lib/auth/user-store";
import { getDatabase, transaction, type Database } from "@/server/db/connection";
import {
  clearNotificationData,
  countNotifications,
  insertNotification,
} from "./repository";
import type { StoredNotification } from "./types";

/**
 * Where the notification module gets its database. Notifications, settings,
 * and announced estimates live in SQLite (see `schema.ts`), so they survive
 * requests and restarts; nothing is cached in memory.
 */

/** Matches the seeded queues: Alex Morgan starts third for Student services. */
function seedRows(): StoredNotification[] {
  return [
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

/**
 * Writes the demo notifications into a database that has none. Recipients are
 * accounts, so the demo accounts are seeded first.
 */
export function seedNotifications(db: Database) {
  seedUsers(db);
  transaction(db, () => {
    if (countNotifications(db) > 0) return;
    for (const notification of seedRows()) insertNotification(db, notification);
  });
}

// Kept on globalThis so every route handler (and dev hot reloads) seed once.
const globalForNotifications = globalThis as typeof globalThis & {
  __notificationDb?: Database;
};

export function getNotificationDatabase(): Database {
  if (!globalForNotifications.__notificationDb) {
    const db = getDatabase();
    seedNotifications(db);
    globalForNotifications.__notificationDb = db;
  }
  return globalForNotifications.__notificationDb;
}

/** Deletes every notification, setting, and announced estimate, then reseeds. */
export function resetNotificationStore(): Database {
  const db = getDatabase();
  transaction(db, () => clearNotificationData(db));
  seedNotifications(db);
  globalForNotifications.__notificationDb = db;
  return db;
}
