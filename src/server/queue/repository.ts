import { randomUUID } from "node:crypto";
import type { Database } from "@/server/db/connection";
import type {
  CompletedParticipation,
  ParticipationOutcome,
  Priority,
  QueueEntry,
  QueueService,
} from "./types";

/** SQL for the `queues` and `queue_entries` tables. Callers own transactions. */

type EntryRow = {
  id: string;
  service_id: string;
  user_id: string;
  user_name: string;
  priority: Priority;
  joined_at: string;
  status: "waiting" | ParticipationOutcome;
  completed_at: string | null;
  service_name: string | null;
};

export type QueueState = {
  /** Open/closed status keyed by service id. */
  open: Map<string, boolean>;
  /** Waiting entries keyed by service id, ordered by position. */
  queues: Record<string, QueueEntry[]>;
  /** Served and canceled entries, newest first. */
  completed: CompletedParticipation[];
};

const entryColumns = `
  e.id, q.service_id, e.user_id, e.user_name, e.priority, e.joined_at,
  e.status, e.completed_at, e.service_name`;

function toEntry(row: EntryRow): QueueEntry {
  return {
    id: row.id,
    serviceId: row.service_id,
    userId: row.user_id,
    userName: row.user_name,
    priority: row.priority,
    joinedAt: row.joined_at,
  };
}

function toCompleted(row: EntryRow): CompletedParticipation {
  return {
    entryId: row.id,
    serviceId: row.service_id,
    serviceName: row.service_name!,
    userId: row.user_id,
    userName: row.user_name,
    joinedAt: row.joined_at,
    completedAt: row.completed_at!,
    outcome: row.status as ParticipationOutcome,
  };
}

export function countQueues(db: Database) {
  return (db.prepare("SELECT count(*) AS n FROM queues").get() as { n: number }).n;
}

/** Creates the service's queue if it has none, returning the queue id. */
export function ensureQueue(
  db: Database,
  service: QueueService,
  createdAt = new Date().toISOString(),
): string {
  db.prepare(
    `INSERT INTO queues (id, service_id, status, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (service_id) DO NOTHING`,
  ).run(randomUUID(), service.id, service.open ? "open" : "closed", createdAt);
  const row = db
    .prepare("SELECT id FROM queues WHERE service_id = ?")
    .get(service.id) as { id: string };
  return row.id;
}

export function saveQueueStatus(db: Database, service: QueueService) {
  ensureQueue(db, service);
  db.prepare("UPDATE queues SET status = ? WHERE service_id = ?").run(
    service.open ? "open" : "closed",
    service.id,
  );
}

/**
 * Stores a service's waiting line exactly as given: new entries are inserted,
 * and every waiting entry's position becomes its index + 1. `completed`, when
 * set, is the entry that just left the line and is marked served or canceled.
 */
export function saveLine(
  db: Database,
  service: QueueService,
  entries: QueueEntry[],
  completed?: CompletedParticipation,
) {
  const queueId = ensureQueue(db, service);

  if (completed) {
    const result = db
      .prepare(
        `UPDATE queue_entries
         SET status = ?, position = NULL, completed_at = ?, service_name = ?
         WHERE id = ? AND queue_id = ? AND status = 'waiting'`,
      )
      .run(
        completed.outcome,
        completed.completedAt,
        completed.serviceName,
        completed.entryId,
        queueId,
      );
    if (result.changes !== 1)
      throw new Error(`Entry ${completed.entryId} is not waiting in ${service.id}.`);
  }

  // Positions are unique per line, and SQLite checks that row by row, so
  // move everyone past every old and new position before renumbering.
  const lineShape = db.prepare(
    `SELECT count(*) AS total, coalesce(max(position), 0) AS top FROM queue_entries
     WHERE queue_id = ? AND status = 'waiting'`,
  );
  const { top } = lineShape.get(queueId) as { top: number };
  db.prepare(
    `UPDATE queue_entries SET position = position + ?
     WHERE queue_id = ? AND status = 'waiting'`,
  ).run(top + entries.length, queueId);

  const upsert = db.prepare(
    `INSERT INTO queue_entries
       (id, queue_id, user_id, user_name, priority, position, joined_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting')
     ON CONFLICT (id) DO UPDATE SET position = excluded.position
     WHERE status = 'waiting' AND queue_id = excluded.queue_id`,
  );
  entries.forEach((entry, index) =>
    upsert.run(
      entry.id,
      queueId,
      entry.userId,
      entry.userName,
      entry.priority,
      index + 1,
      entry.joinedAt,
    ),
  );

  // Unique positions from 1 with count == max == length means exactly 1..n,
  // so no stale waiting row was left behind.
  const after = lineShape.get(queueId) as { total: number; top: number };
  if (after.total !== entries.length || after.top !== entries.length)
    throw new Error(`The stored ${service.id} line no longer matches the server's.`);
}

/** Reads every queue, giving each listed service a queue if it lacks one. */
export function readQueueState(db: Database, services: QueueService[]): QueueState {
  for (const service of services) ensureQueue(db, service);

  const statuses = db.prepare("SELECT service_id, status FROM queues").all() as {
    service_id: string;
    status: "open" | "closed";
  }[];
  const queues: Record<string, QueueEntry[]> = Object.fromEntries(
    statuses.map((row) => [row.service_id, []]),
  );

  const waiting = db
    .prepare(
      `SELECT ${entryColumns} FROM queue_entries e JOIN queues q ON q.id = e.queue_id
       WHERE e.status = 'waiting' ORDER BY q.service_id, e.position`,
    )
    .all() as EntryRow[];
  for (const row of waiting) queues[row.service_id].push(toEntry(row));

  const completed = db
    .prepare(
      `SELECT ${entryColumns} FROM queue_entries e JOIN queues q ON q.id = e.queue_id
       WHERE e.status <> 'waiting' ORDER BY e.completed_at DESC, e.rowid DESC`,
    )
    .all() as EntryRow[];

  return {
    open: new Map(statuses.map((row) => [row.service_id, row.status === "open"])),
    queues,
    completed: completed.map(toCompleted),
  };
}

export function clearQueues(db: Database) {
  db.exec("DELETE FROM queue_entries; DELETE FROM queues;");
}
