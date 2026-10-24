/** Front-end client for the Notification API (src/app/api/notifications). */
import type { Notification } from "@/data/notifications";
import type {
  NotificationCategory,
  NotificationFeed,
  NotificationPreferences,
  NotificationPreferencesPatch,
  StoredNotification,
} from "@/server/notifications/types";
import { moduleRequest } from "./module-request";

export type {
  NotificationFeed,
  NotificationPreferences,
  NotificationPreferencesPatch,
  StoredNotification,
};

/** What a screen asks the API to deliver to the signed-in account. */
export type NotificationRequest = {
  category: NotificationCategory;
  tone: Notification["tone"];
  title: string;
  detail: string;
  service?: string;
  createdAt?: string;
};

export type FeedOptions = {
  filter?: "all" | "unread" | NotificationCategory;
  limit?: number;
};

const base = "/api/notifications";
const itemPath = (id: string) => `${base}/${encodeURIComponent(id)}`;
const preferencesPath = `${base}/preferences`;

function feedPath({ filter, limit }: FeedOptions = {}) {
  const query = new URLSearchParams();
  if (filter && filter !== "all") query.set("filter", filter);
  if (limit) query.set("limit", String(limit));
  const search = query.toString();
  return search ? `${base}?${search}` : base;
}

export const notificationApi = {
  list: (options?: FeedOptions) => moduleRequest<NotificationFeed>(feedPath(options)),

  /** Resolves with null when the account has that category switched off. */
  create: (input: NotificationRequest) =>
    moduleRequest<{ notification?: StoredNotification; suppressed?: boolean }>(base, {
      method: "POST",
      body: JSON.stringify(input),
    }).then((body) => body.notification ?? null),

  setRead: (id: string, read: boolean) =>
    moduleRequest<{ notification: StoredNotification; unreadCount: number }>(
      itemPath(id),
      { method: "PATCH", body: JSON.stringify({ read }) },
    ),

  markAllRead: () =>
    moduleRequest<{ updated: number; unreadCount: number }>(base, {
      method: "PATCH",
      body: JSON.stringify({ read: true }),
    }),

  dismiss: (id: string) =>
    moduleRequest<{ dismissed: string; unreadCount: number }>(itemPath(id), {
      method: "DELETE",
    }),

  clearAll: () =>
    moduleRequest<{ removed: number }>(base, { method: "DELETE" }),

  preferences: () =>
    moduleRequest<{ preferences: NotificationPreferences }>(preferencesPath).then(
      (body) => body.preferences,
    ),

  savePreferences: (patch: NotificationPreferencesPatch) =>
    moduleRequest<{ preferences: NotificationPreferences }>(preferencesPath, {
      method: "PUT",
      body: JSON.stringify(patch),
    }).then((body) => body.preferences),
};

const MINUTE = 60_000;

/** A short label for the feed; the exact time stays in `createdAt`. */
export function relativeTime(createdAt: string, now = Date.now()) {
  const timestamp = Date.parse(createdAt);
  if (Number.isNaN(timestamp)) return "Recently";
  const minutes = Math.round((now - timestamp) / MINUTE);
  if (minutes < 1) return "Just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(timestamp),
  );
}

/** Maps a stored notification onto the shape the display components take. */
export function toDisplayNotification(
  stored: StoredNotification,
  now = Date.now(),
): Notification {
  return {
    id: stored.id,
    category: stored.category,
    tone: stored.tone,
    title: stored.title,
    detail: stored.detail,
    ...(stored.service ? { service: stored.service } : {}),
    time: relativeTime(stored.createdAt, now),
    createdAt: stored.createdAt,
    read: stored.read,
  };
}
