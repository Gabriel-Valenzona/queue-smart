import type { DatabaseSync } from "node:sqlite";

/**
 * UserCredentials, Queue and QueueEntry tables. STRICT tables reject values
 * that cannot convert to the column's type (a number can become text, so the
 * API validators still check types), and the CHECK constraints repeat the API's
 * required-field and length rules so bad rows cannot be written even by code
 * that skips validation.
 *
 * Services are still held in memory, so `service_id` has no foreign key yet;
 * add one when the Service table exists.
 */
const tables = `
  CREATE TABLE IF NOT EXISTS user_credentials (
    id             TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 64),
    -- Stored trimmed and lowercase, so UNIQUE also ignores case.
    email          TEXT NOT NULL UNIQUE
                   CHECK (length(email) BETWEEN 3 AND 254 AND email = lower(trim(email)) AND email LIKE '%_@_%'),
    -- Moves to UserProfile when that table exists.
    name           TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
    -- A PBKDF2 hash is 128 hex characters, so a plain-text password cannot be stored here.
    password_hash  TEXT NOT NULL
                   CHECK (length(password_hash) = 128 AND password_hash NOT GLOB '*[^0-9a-f]*'),
    salt           TEXT NOT NULL CHECK (length(salt) >= 16 AND salt NOT GLOB '*[^0-9a-f]*'),
    role           TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at     TEXT NOT NULL CHECK (julianday(created_at) IS NOT NULL),
    updated_at     TEXT NOT NULL CHECK (julianday(updated_at) IS NOT NULL)
  ) STRICT;

  CREATE TABLE IF NOT EXISTS queues (
    id          TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 64),
    service_id  TEXT NOT NULL UNIQUE CHECK (length(service_id) BETWEEN 1 AND 64),
    status      TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('open', 'closed')),
    created_at  TEXT NOT NULL CHECK (julianday(created_at) IS NOT NULL)
  ) STRICT;

  CREATE TABLE IF NOT EXISTS queue_entries (
    id            TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 64),
    queue_id      TEXT NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    user_id       TEXT NOT NULL REFERENCES user_credentials(id),
    user_name     TEXT NOT NULL CHECK (length(trim(user_name)) BETWEEN 1 AND 100),
    priority      TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    -- 1-based place in line while waiting; cleared once served or canceled.
    position      INTEGER CHECK (position >= 1),
    joined_at     TEXT NOT NULL CHECK (julianday(joined_at) IS NOT NULL),
    status        TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'served', 'canceled')),
    completed_at  TEXT CHECK (completed_at IS NULL OR julianday(completed_at) IS NOT NULL),
    -- Service name when the visit ended, so history survives later renames.
    service_name  TEXT CHECK (length(trim(service_name)) BETWEEN 1 AND 100),
    CHECK ((status = 'waiting') = (position IS NOT NULL)),
    CHECK ((status = 'waiting') = (completed_at IS NULL)),
    CHECK ((status = 'waiting') = (service_name IS NULL))
  ) STRICT;

  -- No two waiting users share a place in the same line.
  CREATE UNIQUE INDEX IF NOT EXISTS queue_entries_position
    ON queue_entries (queue_id, position) WHERE status = 'waiting';

  -- A user waits in at most one queue at a time.
  CREATE UNIQUE INDEX IF NOT EXISTS queue_entries_one_waiting_per_user
    ON queue_entries (user_id) WHERE status = 'waiting';

  CREATE INDEX IF NOT EXISTS queue_entries_user_history
    ON queue_entries (user_id, completed_at);
`;

export function applySchema(db: DatabaseSync) {
  db.exec(tables);
}
