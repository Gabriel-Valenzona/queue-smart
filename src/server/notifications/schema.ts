import type { DatabaseSync } from "node:sqlite";

/**
 * Notification module tables, applied by `src/server/db/schema.ts`.
 *
 * `notifications` is the assignment's Notification/History collection: one row
 * per message sent to one account, with the recipient, the message, when it was
 * created, and whether it has been viewed. STRICT tables reject values that
 * cannot convert to the column's type, and the CHECK constraints repeat the
 * API's required-field, length, and enum rules so a bad row cannot be written
 * even by code that skips validation.
 */
const tables = `
  CREATE TABLE IF NOT EXISTS notifications (
    id            TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 64),
    user_id       TEXT NOT NULL REFERENCES user_credentials(id) ON DELETE CASCADE,
    category      TEXT NOT NULL
                  CHECK (category IN ('queue-update', 'status-change', 'service', 'system')),
    -- Color only; the title and detail carry the meaning.
    tone          TEXT NOT NULL CHECK (tone IN ('info', 'success', 'warning', 'error')),
    title         TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
    detail        TEXT NOT NULL CHECK (length(trim(detail)) BETWEEN 1 AND 500),
    -- Service name when the notification was sent, so it survives later renames.
    service_name  TEXT CHECK (service_name IS NULL
                              OR length(trim(service_name)) BETWEEN 1 AND 100),
    created_at    TEXT NOT NULL CHECK (julianday(created_at) IS NOT NULL),
    -- 'sent' until the recipient opens it; the API reports this as read/unread.
    status        TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'viewed')),
    -- Delivered during the recipient's quiet hours: kept, but not announced.
    silent        INTEGER NOT NULL DEFAULT 0 CHECK (silent IN (0, 1))
  ) STRICT;

  -- Every read is one account's feed, newest first.
  CREATE INDEX IF NOT EXISTS notifications_user_feed
    ON notifications (user_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS notifications_user_unread
    ON notifications (user_id) WHERE status = 'sent';

  -- One row per account; an account with no row uses the defaults below.
  CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id              TEXT PRIMARY KEY REFERENCES user_credentials(id) ON DELETE CASCADE,
    queue_update         INTEGER NOT NULL DEFAULT 1 CHECK (queue_update IN (0, 1)),
    status_change        INTEGER NOT NULL DEFAULT 1 CHECK (status_change IN (0, 1)),
    service              INTEGER NOT NULL DEFAULT 1 CHECK (service IN (0, 1)),
    -- System messages are always delivered, so they have no switch.
    quiet_hours_enabled  INTEGER NOT NULL DEFAULT 0 CHECK (quiet_hours_enabled IN (0, 1)),
    quiet_start          TEXT NOT NULL DEFAULT '21:00'
                         CHECK (quiet_start GLOB '[0-2][0-9]:[0-5][0-9]' AND quiet_start <= '23:59'),
    quiet_end            TEXT NOT NULL DEFAULT '07:00'
                         CHECK (quiet_end GLOB '[0-2][0-9]:[0-5][0-9]' AND quiet_end <= '23:59'),
    updated_at           TEXT NOT NULL CHECK (julianday(updated_at) IS NOT NULL),
    -- An empty range would silence nothing, so quiet hours must span time.
    CHECK (quiet_hours_enabled = 0 OR quiet_start <> quiet_end)
  ) STRICT;

  /*
   * The estimated wait each waiting user was last told about, so the module can
   * tell when an estimate has moved far enough to notify again. Keyed by queue
   * entry, and removed with the entry it belongs to.
   */
  CREATE TABLE IF NOT EXISTS notification_wait_baselines (
    entry_id           TEXT PRIMARY KEY REFERENCES queue_entries(id) ON DELETE CASCADE,
    announced_minutes  INTEGER NOT NULL CHECK (announced_minutes >= 0),
    updated_at         TEXT NOT NULL CHECK (julianday(updated_at) IS NOT NULL)
  ) STRICT;
`;

export function applyNotificationSchema(db: DatabaseSync) {
  db.exec(tables);
}
