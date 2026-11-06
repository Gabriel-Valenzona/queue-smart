import type { Database } from "@/server/db/connection";
import { normalizePreferences } from "./preferences";
import type {
  NotificationCategory,
  NotificationFeed,
  NotificationPreferences,
  NotificationTone,
  StoredNotification,
} from "./types";
import type { FeedQuery } from "./validation";

/**
 * SQL for the notification tables. Callers own transactions.
 *
 * The stored status is the assignment's `sent`/`viewed`; the module and its API
 * speak of unread and read, and the mapping happens here.
 */

type NotificationRow = {
  id: string;
  user_id: string;
  category: NotificationCategory;
  tone: NotificationTone;
  title: string;
  detail: string;
  service_name: string | null;
  created_at: string;
  status: "sent" | "viewed";
  silent: number;
};

type PreferencesRow = {
  queue_update: number;
  status_change: number;
  service: number;
  quiet_hours_enabled: number;
  quiet_start: string;
  quiet_end: string;
};

const columns = `
  id, user_id, category, tone, title, detail, service_name, created_at, status, silent`;

/** Newest first; the row id breaks ties between notifications sent together. */
const newestFirst = "ORDER BY created_at DESC, rowid DESC";

function toNotification(row: NotificationRow): StoredNotification {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    tone: row.tone,
    title: row.title,
    detail: row.detail,
    ...(row.service_name ? { service: row.service_name } : {}),
    createdAt: row.created_at,
    read: row.status === "viewed",
    silent: row.silent === 1,
  };
}

export function insertNotification(
  db: Database,
  notification: StoredNotification,
): StoredNotification {
  db.prepare(
    `INSERT INTO notifications
       (id, user_id, category, tone, title, detail, service_name, created_at, status, silent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    notification.id,
    notification.userId,
    notification.category,
    notification.tone,
    notification.title,
    notification.detail,
    notification.service ?? null,
    notification.createdAt,
    notification.read ? "viewed" : "sent",
    notification.silent ? 1 : 0,
  );
  return notification;
}

/** One account's feed after the requested filter, with its unfiltered counts. */
export function readFeed(
  db: Database,
  userId: string,
  query: FeedQuery = { filter: "all" },
): NotificationFeed {
  const conditions = ["user_id = ?"];
  const values: (string | number)[] = [userId];
  if (query.filter === "unread") conditions.push("status = 'sent'");
  else if (query.filter !== "all") {
    conditions.push("category = ?");
    values.push(query.filter);
  }

  const rows = db
    .prepare(
      `SELECT ${columns} FROM notifications
       WHERE ${conditions.join(" AND ")} ${newestFirst}
       ${query.limit ? "LIMIT ?" : ""}`,
    )
    .all(...values, ...(query.limit ? [query.limit] : [])) as NotificationRow[];

  const counts = db
    .prepare(
      `SELECT count(*) AS total,
              count(*) FILTER (WHERE status = 'sent') AS unread
       FROM notifications WHERE user_id = ?`,
    )
    .get(userId) as { total: number; unread: number };

  return {
    notifications: rows.map(toNotification),
    unreadCount: counts.unread,
    total: counts.total,
  };
}

export function findNotification(
  db: Database,
  userId: string,
  id: string,
): StoredNotification | null {
  const row = db
    .prepare(`SELECT ${columns} FROM notifications WHERE id = ? AND user_id = ?`)
    .get(id, userId) as NotificationRow | undefined;
  return row ? toNotification(row) : null;
}

/** Returns how many rows changed, so a caller can tell a miss from a no-op. */
export function updateNotificationStatus(
  db: Database,
  userId: string,
  id: string,
  read: boolean,
): number {
  return db
    .prepare("UPDATE notifications SET status = ? WHERE id = ? AND user_id = ?")
    .run(read ? "viewed" : "sent", id, userId).changes as number;
}

export function markAllViewed(db: Database, userId: string): number {
  return db
    .prepare(
      "UPDATE notifications SET status = 'viewed' WHERE user_id = ? AND status = 'sent'",
    )
    .run(userId).changes as number;
}

export function deleteNotification(
  db: Database,
  userId: string,
  id: string,
): number {
  return db
    .prepare("DELETE FROM notifications WHERE id = ? AND user_id = ?")
    .run(id, userId).changes as number;
}

export function deleteUserNotifications(db: Database, userId: string): number {
  return db
    .prepare("DELETE FROM notifications WHERE user_id = ?")
    .run(userId).changes as number;
}

export function countNotifications(db: Database): number {
  return (db.prepare("SELECT count(*) AS n FROM notifications").get() as { n: number })
    .n;
}

/** Removes every account's notifications, settings, and announced estimates. */
export function clearNotificationData(db: Database) {
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM notification_preferences;
    DELETE FROM notification_wait_baselines;
  `);
}

/** The account's saved settings, or the defaults when it has none. */
export function readPreferences(
  db: Database,
  userId: string,
): NotificationPreferences {
  const row = db
    .prepare(
      `SELECT queue_update, status_change, service,
              quiet_hours_enabled, quiet_start, quiet_end
       FROM notification_preferences WHERE user_id = ?`,
    )
    .get(userId) as PreferencesRow | undefined;
  if (!row) return normalizePreferences(undefined);
  return normalizePreferences({
    categories: {
      "queue-update": row.queue_update === 1,
      "status-change": row.status_change === 1,
      service: row.service === 1,
    },
    quietHours: {
      enabled: row.quiet_hours_enabled === 1,
      start: row.quiet_start,
      end: row.quiet_end,
    },
  });
}

export function savePreferences(
  db: Database,
  userId: string,
  preferences: NotificationPreferences,
  updatedAt = new Date().toISOString(),
): NotificationPreferences {
  db.prepare(
    `INSERT INTO notification_preferences
       (user_id, queue_update, status_change, service,
        quiet_hours_enabled, quiet_start, quiet_end, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET
       queue_update = excluded.queue_update,
       status_change = excluded.status_change,
       service = excluded.service,
       quiet_hours_enabled = excluded.quiet_hours_enabled,
       quiet_start = excluded.quiet_start,
       quiet_end = excluded.quiet_end,
       updated_at = excluded.updated_at`,
  ).run(
    userId,
    preferences.categories["queue-update"] ? 1 : 0,
    preferences.categories["status-change"] ? 1 : 0,
    preferences.categories.service ? 1 : 0,
    preferences.quietHours.enabled ? 1 : 0,
    preferences.quietHours.start,
    preferences.quietHours.end,
    updatedAt,
  );
  return preferences;
}

/** The estimate each waiting user was last told, keyed by queue entry id. */
export function readWaitBaselines(db: Database): Record<string, number> {
  const rows = db
    .prepare("SELECT entry_id, announced_minutes FROM notification_wait_baselines")
    .all() as { entry_id: string; announced_minutes: number }[];
  return Object.fromEntries(rows.map((row) => [row.entry_id, row.announced_minutes]));
}

/**
 * Replaces the stored baselines with `baselines`, which the planner has
 * already pruned to the entries still waiting.
 */
export function saveWaitBaselines(
  db: Database,
  baselines: Record<string, number>,
  updatedAt = new Date().toISOString(),
) {
  db.exec("DELETE FROM notification_wait_baselines");
  const insert = db.prepare(
    `INSERT INTO notification_wait_baselines (entry_id, announced_minutes, updated_at)
     VALUES (?, ?, ?)`,
  );
  for (const [entryId, minutes] of Object.entries(baselines))
    insert.run(entryId, minutes, updatedAt);
}
