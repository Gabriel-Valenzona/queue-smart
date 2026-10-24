import { randomUUID } from "node:crypto";
import { ModuleError } from "@/server/modules/errors";
import {
  isCategoryEnabled,
  isQuietHours,
  normalizePreferences,
} from "./preferences";
import type { NotificationStore } from "./store";
import type {
  NotificationFeed,
  NotificationInput,
  NotificationPreferences,
  NotificationPreferencesPatch,
  StoredNotification,
} from "./types";
import type { FeedQuery } from "./validation";

type Clock = () => Date;
const systemClock: Clock = () => new Date();

function ownedBy(store: NotificationStore, userId: string) {
  return store.notifications.filter((item) => item.userId === userId);
}

/** The account's notifications, newest first, after the requested filter. */
export function listNotifications(
  store: NotificationStore,
  userId: string,
  query: FeedQuery = { filter: "all" },
): NotificationFeed {
  const owned = ownedBy(store, userId);
  const matching =
    query.filter === "all"
      ? owned
      : query.filter === "unread"
        ? owned.filter((item) => !item.read)
        : owned.filter((item) => item.category === query.filter);
  return {
    notifications: query.limit ? matching.slice(0, query.limit) : matching,
    unreadCount: owned.filter((item) => !item.read).length,
    total: owned.length,
  };
}

/**
 * Stores one notification, honoring the recipient's settings: a category they
 * switched off is not delivered at all, and quiet hours keep it in the feed
 * without announcing it. Returns null when nothing was delivered.
 */
export function createNotification(
  store: NotificationStore,
  input: NotificationInput,
  clock: Clock = systemClock,
): StoredNotification | null {
  const preferences = getPreferences(store, input.userId);
  if (!isCategoryEnabled(preferences, input.category)) return null;

  const now = clock();
  const notification: StoredNotification = {
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
  };
  store.notifications.unshift(notification);
  return notification;
}

/** Delivers a batch, skipping the ones a recipient has switched off. */
export function createNotifications(
  store: NotificationStore,
  inputs: NotificationInput[],
  clock: Clock = systemClock,
): StoredNotification[] {
  return inputs
    .map((input) => createNotification(store, input, clock))
    .filter((item): item is StoredNotification => item !== null);
}

function requireOwned(
  store: NotificationStore,
  userId: string,
  id: string,
): StoredNotification {
  const notification = store.notifications.find(
    (item) => item.id === id && item.userId === userId,
  );
  // Another account's notification is reported as missing, not as forbidden.
  if (!notification)
    throw new ModuleError(
      404,
      "notification_not_found",
      "This notification is no longer available.",
    );
  return notification;
}

export function setNotificationRead(
  store: NotificationStore,
  userId: string,
  id: string,
  read: boolean,
): StoredNotification {
  const notification = requireOwned(store, userId, id);
  notification.read = read;
  return { ...notification };
}

export function markAllRead(store: NotificationStore, userId: string) {
  let changed = 0;
  for (const notification of ownedBy(store, userId))
    if (!notification.read) {
      notification.read = true;
      changed += 1;
    }
  return changed;
}

export function dismissNotification(
  store: NotificationStore,
  userId: string,
  id: string,
) {
  requireOwned(store, userId, id);
  store.notifications = store.notifications.filter(
    (item) => !(item.id === id && item.userId === userId),
  );
}

export function clearNotifications(store: NotificationStore, userId: string) {
  const removed = ownedBy(store, userId).length;
  store.notifications = store.notifications.filter(
    (item) => item.userId !== userId,
  );
  return removed;
}

export function getPreferences(
  store: NotificationStore,
  userId: string,
): NotificationPreferences {
  return normalizePreferences(store.preferences[userId]);
}

/** Applies only the settings a request sent, leaving the rest unchanged. */
export function updatePreferences(
  store: NotificationStore,
  userId: string,
  patch: NotificationPreferencesPatch,
): NotificationPreferences {
  const current = getPreferences(store, userId);
  const updated = normalizePreferences({
    categories: { ...current.categories, ...patch.categories },
    quietHours: { ...current.quietHours, ...patch.quietHours },
  });
  store.preferences[userId] = updated;
  return updated;
}
