/** Backend models for the Notification module (A3). */

export type NotificationCategory =
  | "queue-update"
  | "status-change"
  | "service"
  | "system";

export type NotificationTone = "info" | "success" | "warning" | "error";

/** The categories a user can turn off; system messages are always delivered. */
export const CONFIGURABLE_CATEGORIES = [
  "queue-update",
  "status-change",
  "service",
] as const satisfies readonly NotificationCategory[];

export type StoredNotification = {
  id: string;
  /** Recipient; every read and write is scoped to one account. */
  userId: string;
  category: NotificationCategory;
  tone: NotificationTone;
  title: string;
  detail: string;
  /** Service name this notification is about, when there is one. */
  service?: string;
  createdAt: string;
  read: boolean;
  /** Created during quiet hours: kept in the feed, but not announced. */
  silent: boolean;
};

/** What the module is asked to deliver; it supplies the id, read state, and time. */
export type NotificationInput = {
  userId: string;
  category: NotificationCategory;
  tone: NotificationTone;
  title: string;
  detail: string;
  service?: string;
  createdAt?: string;
};

export type QuietHours = {
  enabled: boolean;
  /** "HH:MM", interpreted in UTC while A3 has no per-account time zone. */
  start: string;
  end: string;
};

export type NotificationPreferences = {
  categories: Record<NotificationCategory, boolean>;
  quietHours: QuietHours;
};

/** A change to some settings; anything left out keeps its current value. */
export type NotificationPreferencesPatch = {
  categories?: Partial<Record<NotificationCategory, boolean>>;
  quietHours?: QuietHours;
};

export type NotificationFeed = {
  notifications: StoredNotification[];
  unreadCount: number;
  /** Total held for the account, before any filter or limit. */
  total: number;
};
