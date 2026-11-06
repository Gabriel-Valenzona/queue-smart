import { randomUUID } from "node:crypto";
import type { Database } from "@/server/db/connection";
import { ModuleError } from "@/server/modules/errors";
import { isCategoryEnabled, isQuietHours } from "./preferences";
import {
  deleteNotification,
  deleteUserNotifications,
  findNotification,
  insertNotification,
  markAllViewed,
  readFeed,
  readPreferences,
  savePreferences,
  updateNotificationStatus,
} from "./repository";
import type {
  NotificationFeed,
  NotificationInput,
  NotificationPreferences,
  NotificationPreferencesPatch,
  StoredNotification,
} from "./types";
import type { FeedQuery } from "./validation";

/**
 * The module's rules over its tables. Each function here is one unit of work;
 * callers that need several to succeed together (a batch of deliveries, or a
 * settings read and write) run them inside one transaction.
 */

type Clock = () => Date;
const systemClock: Clock = () => new Date();

/** The account's notifications, newest first, after the requested filter. */
export function listNotifications(
  db: Database,
  userId: string,
  query: FeedQuery = { filter: "all" },
): NotificationFeed {
  return readFeed(db, userId, query);
}

/**
 * Stores one notification, honoring the recipient's settings: a category they
 * switched off is not delivered at all, and quiet hours keep it in the feed
 * without announcing it. Returns null when nothing was delivered.
 */
export function createNotification(
  db: Database,
  input: NotificationInput,
  clock: Clock = systemClock,
): StoredNotification | null {
  const preferences = readPreferences(db, input.userId);
  if (!isCategoryEnabled(preferences, input.category)) return null;

  const now = clock();
  return insertNotification(db, {
    id: `ntf_${randomUUID()}`,
    userId: input.userId,
    category: input.category,
    tone: input.tone,
    title: input.title,
    detail: input.detail,
    ...(input.service ? { service: input.service } : {}),
    createdAt: input.createdAt ?? now.toISOString(),
    read: false,
    silent: isQuietHours(preferences.quietHours, now),
  });
}

/** Delivers a batch, skipping the ones a recipient has switched off. */
export function createNotifications(
  db: Database,
  inputs: NotificationInput[],
  clock: Clock = systemClock,
): StoredNotification[] {
  return inputs
    .map((input) => createNotification(db, input, clock))
    .filter((item): item is StoredNotification => item !== null);
}

/** Another account's notification is reported as missing, not as forbidden. */
function missing(): never {
  throw new ModuleError(
    404,
    "notification_not_found",
    "This notification is no longer available.",
  );
}

export function setNotificationRead(
  db: Database,
  userId: string,
  id: string,
  read: boolean,
): StoredNotification {
  if (updateNotificationStatus(db, userId, id, read) !== 1) missing();
  return findNotification(db, userId, id) ?? missing();
}

export function markAllRead(db: Database, userId: string) {
  return markAllViewed(db, userId);
}

export function dismissNotification(db: Database, userId: string, id: string) {
  if (deleteNotification(db, userId, id) !== 1) missing();
}

export function clearNotifications(db: Database, userId: string) {
  return deleteUserNotifications(db, userId);
}

export function getPreferences(
  db: Database,
  userId: string,
): NotificationPreferences {
  return readPreferences(db, userId);
}

/** Applies only the settings a request sent, leaving the rest unchanged. */
export function updatePreferences(
  db: Database,
  userId: string,
  patch: NotificationPreferencesPatch,
  updatedAt = new Date().toISOString(),
): NotificationPreferences {
  const current = readPreferences(db, userId);
  return savePreferences(
    db,
    userId,
    {
      categories: { ...current.categories, ...patch.categories, system: true },
      quietHours: { ...current.quietHours, ...patch.quietHours },
    },
    updatedAt,
  );
}
